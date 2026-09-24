package com.tanda.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramMediaService {

    @Value("${telegram.bot.token:8656738239:AAE0ryDJRET9vBeVXSTS-08SKt2FRSi435Q}")
    private String botToken;

    private final ObjectMapper objectMapper;
    private final Map<String, CachedTelegramFile> fileCache = new ConcurrentHashMap<>();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static class CachedTelegramFile {
        final String filePath;
        final long fileSize;
        final long cachedAt;

        CachedTelegramFile(String filePath, long fileSize) {
            this.filePath = filePath;
            this.fileSize = fileSize;
            this.cachedAt = System.currentTimeMillis();
        }

        boolean isExpired() {
            return System.currentTimeMillis() - cachedAt > 3600_000L; // 1 hour
        }
    }

    public String resolveFilePath(String fileId) {
        CachedTelegramFile cached = fileCache.get(fileId);
        if (cached != null && !cached.isExpired()) {
            return cached.filePath;
        }

        try {
            String getFileUrl = "https://api.telegram.org/bot" + botToken.trim() + "/getFile?file_id=" + fileId.trim();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(getFileUrl))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.path("ok").asBoolean(false)) {
                    JsonNode result = root.path("result");
                    String filePath = result.path("file_path").asText();
                    long fileSize = result.path("file_size").asLong(0L);
                    if (filePath != null && !filePath.isBlank()) {
                        fileCache.put(fileId, new CachedTelegramFile(filePath, fileSize));
                        return filePath;
                    }
                }
            }
            log.error("Failed to get Telegram file path for fileId={}: status={}, body={}", fileId, response.statusCode(), response.body());
        } catch (Exception e) {
            log.error("Exception resolving Telegram file path for fileId={}: {}", fileId, e.getMessage());
        }
        return null;
    }

    public void streamTelegramAudio(String fileId, HttpServletRequest request, HttpServletResponse response) {
        String filePath = resolveFilePath(fileId);
        if (filePath == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        String downloadUrl = "https://api.telegram.org/file/bot" + botToken.trim() + "/" + filePath;
        HttpURLConnection connection = null;

        try {
            URL url = new URL(downloadUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(60000);

            String rangeHeader = request.getHeader("Range");
            if (rangeHeader != null && !rangeHeader.isBlank()) {
                connection.setRequestProperty("Range", rangeHeader);
            }

            connection.connect();
            int responseCode = connection.getResponseCode();

            response.setStatus(responseCode);

            // Copy relevant streaming headers
            String contentType = connection.getContentType();
            if (contentType == null || contentType.contains("octet-stream") || contentType.contains("text/plain")) {
                if (filePath.endsWith(".pdf")) {
                    contentType = "application/pdf";
                } else if (filePath.endsWith(".epub")) {
                    contentType = "application/epub+zip";
                } else if (filePath.endsWith(".txt")) {
                    contentType = "text/plain; charset=UTF-8";
                } else if (filePath.endsWith(".mp3")) {
                    contentType = "audio/mpeg";
                } else if (filePath.endsWith(".m4a") || filePath.endsWith(".mp4") || filePath.endsWith(".m4r")) {
                    contentType = "audio/mp4";
                } else if (filePath.endsWith(".ogg")) {
                    contentType = "audio/ogg";
                } else {
                    contentType = "application/octet-stream";
                }
            }

            response.setContentType(contentType);
            response.setHeader("Accept-Ranges", "bytes");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Content-Type, Accept");
            response.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
            String filename = filePath.contains("/") ? filePath.substring(filePath.lastIndexOf('/') + 1) : "file";
            response.setHeader("Content-Disposition", "inline; filename=\"" + filename + "\"");

            String contentRange = connection.getHeaderField("Content-Range");
            if (contentRange != null) {
                response.setHeader("Content-Range", contentRange);
            }

            long contentLength = connection.getContentLengthLong();
            if (contentLength > 0) {
                response.setHeader("Content-Length", String.valueOf(contentLength));
            }

            response.setHeader("Cache-Control", "public, max-age=86400");

            try (InputStream in = connection.getInputStream();
                 OutputStream out = response.getOutputStream()) {
                byte[] buffer = new byte[16384];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                out.flush();
            }
        } catch (Exception e) {
            log.debug("Stream ended or client disconnected: {}", e.getMessage());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    public void handleTelegramWebhook(JsonNode update) {
        try {
            JsonNode post = update.has("channel_post") ? update.get("channel_post")
                    : (update.has("message") ? update.get("message") : null);

            if (post == null) return;

            long chatId = post.path("chat").path("id").asLong();
            int messageId = post.path("message_id").asInt();

            String fileId = null;
            String fileName = "Файл";
            String fileTypeTitle = "Файл";

            if (post.has("audio")) {
                JsonNode audio = post.get("audio");
                fileId = audio.path("file_id").asText();
                fileName = audio.path("file_name").asText(audio.path("title").asText("Аудио"));
                fileTypeTitle = "Аудиокітап";
            } else if (post.has("voice")) {
                JsonNode voice = post.get("voice");
                fileId = voice.path("file_id").asText();
                fileName = "Дауыстық жазба";
                fileTypeTitle = "Аудио";
            } else if (post.has("document")) {
                JsonNode doc = post.get("document");
                String mime = doc.path("mime_type").asText("").toLowerCase();
                String fn = doc.path("file_name").asText("").toLowerCase();
                fileId = doc.path("file_id").asText();
                fileName = doc.path("file_name").asText("Құжат");

                if (mime.startsWith("audio/") || fn.endsWith(".mp3") || fn.endsWith(".m4a") || fn.endsWith(".ogg") || fn.endsWith(".m4r") || fn.endsWith(".wav")) {
                    fileTypeTitle = "Аудиокітап";
                } else if (fn.endsWith(".epub") || mime.contains("epub")) {
                    fileTypeTitle = "Электронды кітап (EPUB)";
                } else if (fn.endsWith(".pdf") || mime.contains("pdf")) {
                    fileTypeTitle = "Электронды кітап (PDF)";
                } else if (fn.endsWith(".txt") || fn.endsWith(".fb2")) {
                    fileTypeTitle = "Электронды кітап (Мәтін)";
                } else {
                    fileTypeTitle = "Құжат / Эл. кітап";
                }
            }

            if (fileId != null && !fileId.isBlank()) {
                String streamUrl = "https://tanda-backend-7lpj.onrender.com/api/v1/media/telegram/" + fileId;
                String replyText = "✅ <b>" + fileTypeTitle + " қабылданды!</b>\n"
                        + "📁 <b>Файл:</b> " + fileName + "\n\n"
                        + "🔗 <b>Tanda үшін сілтеме:</b>\n"
                        + "<code>" + streamUrl + "</code>\n\n"
                        + "<i>(Сілтемені басып көшіріп алып, Tanda сайтына қойыңыз)</i>";

                sendTelegramMessage(chatId, messageId, replyText);
            }
        } catch (Exception e) {
            log.error("Error processing Telegram webhook: {}", e.getMessage());
        }
    }

    public void sendTelegramMessage(long chatId, int replyToMessageId, String htmlText) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", htmlText);
            body.put("parse_mode", "HTML");
            if (replyToMessageId > 0) {
                body.put("reply_to_message_id", replyToMessageId);
            }

            String json = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.telegram.org/bot" + botToken.trim() + "/sendMessage"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            httpClient.send(request, HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            log.error("Error sending Telegram message: {}", e.getMessage());
        }
    }
}
