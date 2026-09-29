package com.tanda.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.premium.ReceiptAnalysisResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiVisionService {

    @Value("${openai.api-key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${openai.model:${OPENAI_VISION_MODEL:gpt-4o-mini}}")
    private String model;

    @Value("${tanda.storage.location:./uploads}")
    private String storageLocation;

    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private static final String RECEIPT_ANALYSIS_PROMPT = """
            Analyze this image and determine if it is a genuine Kazakh bank payment transfer receipt (such as Kaspi, Halyk Bank, Freedom Finance Bank, Forte, Jusan, BCC, etc.).
            Extract the exact transaction details as a strict JSON object with these fields:
            - isReceipt: boolean (true ONLY if the image is a valid bank payment transfer receipt, false if it is a random photo, screenshot of a book, meme, chat, or invalid image)
            - bankName: string or null (e.g. "Kaspi", "Halyk Bank", "Freedom Finance Bank")
            - receiptNumber: string or null (the unique receipt or transaction number, e.g. "№ квитанции" or "RRN" without extra words, digits only)
            - dateTime: string or null (date and time as shown on receipt, e.g. "17.09.2026 19:08")
            - amountKzt: integer or null (transfer amount in KZT as number, e.g. 2500, 330, 28000. Strip currency symbols and whitespace)
            - recipientName: string or null (recipient's person name if shown under recipient details or photo, e.g. "Касимхон К.", null if not shown)
            - recipientCardLast4: string or null (last 4 digits of recipient card if shown with asterisks like *7230 -> "7230", *5096 -> "5096", null if not shown)
            - senderName: string or null (sender name if shown, e.g. "Сулайманов У.Б.")
            
            Return pure JSON only.
            """;

    public byte[] loadReceiptBytes(String receiptUrl) {
        if (receiptUrl == null || receiptUrl.isBlank()) {
            return null;
        }

        try {
            // Case 1: Base64 data URL
            if (receiptUrl.startsWith("data:")) {
                int commaIndex = receiptUrl.indexOf(',');
                if (commaIndex != -1) {
                    return Base64.getDecoder().decode(receiptUrl.substring(commaIndex + 1));
                }
            }

            // Case 2: Local storage file path (e.g. /uploads/covers/abc.jpg or /uploads/receipts/abc.pdf)
            String localPath = receiptUrl;
            if (localPath.startsWith("/uploads/")) {
                localPath = localPath.substring("/uploads/".length());
            } else if (localPath.startsWith("uploads/")) {
                localPath = localPath.substring("uploads/".length());
            }

            Path path = Paths.get(storageLocation).resolve(localPath).normalize();
            if (Files.exists(path) && Files.isRegularFile(path)) {
                return Files.readAllBytes(path);
            }

            // Case 3: Remote HTTP URL
            if (receiptUrl.startsWith("http://") || receiptUrl.startsWith("https://")) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(receiptUrl))
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build();
                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() == 200) {
                    return response.body();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load receipt bytes for {}: {}", receiptUrl, e.getMessage());
        }

        return null;
    }

    public boolean isPdf(byte[] data) {
        if (data == null || data.length < 4) {
            return false;
        }
        return data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46; // %PDF
    }

    public byte[] convertPdfFirstPageToImage(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            if (document.getNumberOfPages() == 0) {
                throw new IOException("PDF құжаты бос (парақтары жоқ)");
            }
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            BufferedImage bim = pdfRenderer.renderImageWithDPI(0, 180, ImageType.RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(bim, "jpeg", baos);
            return baos.toByteArray();
        }
    }

    public String computeSha256(byte[] data) {
        if (data == null || data.length == 0) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            log.warn("Failed to compute SHA-256 hash: {}", e.getMessage());
            return null;
        }
    }

    public ReceiptAnalysisResult analyzeReceipt(String receiptUrl, byte[] explicitBytes) {
        byte[] bytes = (explicitBytes != null && explicitBytes.length > 0) ? explicitBytes : loadReceiptBytes(receiptUrl);
        if (bytes == null || bytes.length == 0) {
            return ReceiptAnalysisResult.builder()
                    .isReceipt(false)
                    .rawSummary("Чек файлы жүктелмеді немесе оқылмады")
                    .build();
        }

        // Convert PDF to image if uploaded receipt is PDF
        byte[] imageBytes = bytes;
        if (isPdf(bytes)) {
            try {
                log.info("Receipt file is PDF (%PDF detected), rendering first page to JPEG...");
                imageBytes = convertPdfFirstPageToImage(bytes);
                log.info("PDF first page successfully rendered to JPEG ({} bytes)", imageBytes.length);
            } catch (Exception e) {
                log.error("Failed to render PDF receipt to image: {}", e.getMessage(), e);
                return ReceiptAnalysisResult.builder()
                        .isReceipt(false)
                        .rawSummary("PDF түбіртегін өңдеу мүмкін болмады: " + e.getMessage())
                        .build();
            }
        }

        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.startsWith("${")) {
            log.warn("OpenAI API key is not configured. Skipping automated vision verification.");
            return ReceiptAnalysisResult.builder()
                    .isReceipt(false)
                    .aiUnavailable(true)
                    .rawSummary("OpenAI API кілті серверде бапталмаған немесе қолжетімсіз")
                    .build();
        }

        try {
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String dataUrl = "data:image/jpeg;base64," + base64Image;

            Map<String, Object> textPart = Map.of(
                    "type", "text",
                    "text", RECEIPT_ANALYSIS_PROMPT
            );

            Map<String, Object> imagePart = Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", dataUrl)
            );

            Map<String, Object> message = Map.of(
                    "role", "user",
                    "content", List.of(textPart, imagePart)
            );

            Map<String, Object> payload = Map.of(
                    "model", (model != null && !model.isBlank()) ? model : "gpt-4o-mini",
                    "messages", List.of(message),
                    "max_tokens", 500,
                    "response_format", Map.of("type", "json_object")
            );

            String requestBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("OpenAI API error (quota/network/token): HTTP {} body: {}", response.statusCode(), response.body());
                return ReceiptAnalysisResult.builder()
                        .isReceipt(false)
                        .aiUnavailable(true)
                        .rawSummary("OpenAI API қатесі (токен/баланс/сервер): HTTP " + response.statusCode())
                        .build();
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode choices = root.path("choices");
            if (choices.isEmpty()) {
                return ReceiptAnalysisResult.builder()
                        .isReceipt(false)
                        .aiUnavailable(true)
                        .rawSummary("OpenAI бос жауап қайтарды")
                        .build();
            }

            String content = choices.get(0).path("message").path("content").asText();
            JsonNode data = objectMapper.readTree(content);

            boolean isReceipt = data.path("isReceipt").asBoolean(false);
            String bankName = data.hasNonNull("bankName") ? data.path("bankName").asText().trim() : null;
            String receiptNumber = data.hasNonNull("receiptNumber") ? data.path("receiptNumber").asText().trim() : null;
            String dateTime = data.hasNonNull("dateTime") ? data.path("dateTime").asText().trim() : null;
            Integer amountKzt = data.hasNonNull("amountKzt") ? data.path("amountKzt").asInt() : null;
            String recipientName = data.hasNonNull("recipientName") ? data.path("recipientName").asText().trim() : null;
            String recipientCardLast4 = data.hasNonNull("recipientCardLast4") ? data.path("recipientCardLast4").asText().trim() : null;
            String senderName = data.hasNonNull("senderName") ? data.path("senderName").asText().trim() : null;

            log.info("OpenAI vision parsed receipt: isReceipt={}, bank={}, number={}, amount={}, recipient={}, cardLast4={}",
                    isReceipt, bankName, receiptNumber, amountKzt, recipientName, recipientCardLast4);

            return ReceiptAnalysisResult.builder()
                    .isReceipt(isReceipt)
                    .bankName(bankName)
                    .receiptNumber(receiptNumber)
                    .dateTime(dateTime)
                    .amountKzt(amountKzt)
                    .recipientName(recipientName)
                    .recipientCardLast4(recipientCardLast4)
                    .senderName(senderName)
                    .confidence(isReceipt ? 0.95 : 0.1)
                    .rawJson(content)
                    .rawSummary(String.format("Банк: %s, № %s, Сома: %s ₸, Алушы: %s, Карта: *%s",
                            bankName != null ? bankName : "—",
                            receiptNumber != null ? receiptNumber : "—",
                            amountKzt != null ? amountKzt : "—",
                            recipientName != null ? recipientName : "—",
                            recipientCardLast4 != null ? recipientCardLast4 : "—"))
                    .build();

        } catch (Exception e) {
            log.error("Failed to analyze receipt with OpenAI Vision: {}", e.getMessage(), e);
            return ReceiptAnalysisResult.builder()
                    .isReceipt(false)
                    .aiUnavailable(true)
                    .rawSummary("Талдау кезінде техникалық қате (байланыс/токен): " + e.getMessage())
                    .build();
        }
    }
}
