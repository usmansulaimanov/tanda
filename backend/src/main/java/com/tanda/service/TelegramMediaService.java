package com.tanda.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
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

    @Value("${telegram.bot.api-url:https://api.telegram.org}")
    private String botApiUrl;

    @Value("${app.base-url:https://tandamen.kz}")
    private String baseUrl;

    private final ObjectMapper objectMapper;
    private final Map<String, CachedTelegramFile> fileCache = new ConcurrentHashMap<>();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private String getCleanBotApiUrl() {
        if (botApiUrl == null || botApiUrl.isBlank()) {
            return "https://api.telegram.org";
        }
        return botApiUrl.replaceAll("/+$", "");
    }

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
            String getFileUrl = getCleanBotApiUrl() + "/bot" + botToken.trim() + "/getFile?file_id=" + fileId.trim();
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

        // 1. If Local Telegram Bot API returned direct local file path and it exists on disk
        File localFile = new File(filePath);
        if (localFile.exists() && localFile.isFile() && localFile.canRead()) {
            streamLocalFile(localFile, filePath, request, response);
            return;
        }

        // 2. HTTP streaming via Telegram Bot API server
        String downloadUrl = getCleanBotApiUrl() + "/file/bot" + botToken.trim() + "/" + filePath;
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

            InputStream rawIn = connection.getInputStream();
            BufferedInputStream bis = new BufferedInputStream(rawIn, 16384);
            bis.mark(512);
            byte[] magic = new byte[32];
            int readMagic = bis.read(magic, 0, magic.length);
            bis.reset();

            String contentType = detectContentType(filePath, magic, readMagic, connection.getContentType());

            response.setContentType(contentType);
            response.setHeader("Accept-Ranges", "bytes");
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Content-Type, Accept");
            response.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
            
            String filename = filePath.contains("/") ? filePath.substring(filePath.lastIndexOf('/') + 1) : "file";
            if (!filename.contains(".")) {
                if ("image/png".equals(contentType)) filename += ".png";
                else if ("image/jpeg".equals(contentType)) filename += ".jpg";
                else if ("image/webp".equals(contentType)) filename += ".webp";
                else if ("image/gif".equals(contentType)) filename += ".gif";
                else if ("application/pdf".equals(contentType)) filename += ".pdf";
                else if ("application/epub+zip".equals(contentType)) filename += ".epub";
                else if ("audio/mp4".equals(contentType)) filename += ".m4a";
                else if ("audio/ogg".equals(contentType)) filename += ".ogg";
                else if ("audio/wav".equals(contentType)) filename += ".wav";
                else if ("audio/mpeg".equals(contentType)) filename += ".mp3";
            }
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

            try (OutputStream out = response.getOutputStream()) {
                byte[] buffer = new byte[16384];
                int bytesRead;
                while ((bytesRead = bis.read(buffer)) != -1) {
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

    private String detectContentType(String filePath, byte[] headerBytes, int bytesRead, String connectionContentType) {
        String lowerPath = filePath.toLowerCase();

        // 1. Check path extension or directory prefix
        if (lowerPath.startsWith("photos/") || lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lowerPath.endsWith(".png")) {
            return "image/png";
        }
        if (lowerPath.endsWith(".webp")) {
            return "image/webp";
        }
        if (lowerPath.endsWith(".gif")) {
            return "image/gif";
        }
        if (lowerPath.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lowerPath.endsWith(".epub")) {
            return "application/epub+zip";
        }
        if (lowerPath.endsWith(".txt")) {
            return "text/plain; charset=UTF-8";
        }
        if (lowerPath.endsWith(".m4a") || lowerPath.endsWith(".mp4") || lowerPath.endsWith(".m4r") || lowerPath.endsWith(".aac")) {
            return "audio/mp4";
        }
        if (lowerPath.endsWith(".ogg") || lowerPath.endsWith(".oga") || lowerPath.endsWith(".opus")) {
            return "audio/ogg";
        }
        if (lowerPath.endsWith(".wav")) {
            return "audio/wav";
        }
        if (lowerPath.endsWith(".mp3")) {
            return "audio/mpeg";
        }

        // 2. Check Magic Bytes from stream header
        if (headerBytes != null && bytesRead >= 4) {
            // PNG: 89 50 4E 47
            if ((headerBytes[0] & 0xFF) == 0x89 && headerBytes[1] == 0x50 && headerBytes[2] == 0x4E && headerBytes[3] == 0x47) {
                return "image/png";
            }
            // JPEG: FF D8 FF
            if ((headerBytes[0] & 0xFF) == 0xFF && (headerBytes[1] & 0xFF) == 0xD8 && (headerBytes[2] & 0xFF) == 0xFF) {
                return "image/jpeg";
            }
            // GIF: GIF8
            if (headerBytes[0] == 'G' && headerBytes[1] == 'I' && headerBytes[2] == 'F' && headerBytes[3] == '8') {
                return "image/gif";
            }
            // PDF: %PDF
            if (headerBytes[0] == '%' && headerBytes[1] == 'P' && headerBytes[2] == 'D' && headerBytes[3] == 'F') {
                return "application/pdf";
            }
            // MP3 with ID3 tag: ID3
            if (headerBytes[0] == 'I' && headerBytes[1] == 'D' && headerBytes[2] == '3') {
                return "audio/mpeg";
            }
            // MP3 sync frame: FF FB or FF F3 or FF F2
            if ((headerBytes[0] & 0xFF) == 0xFF && (headerBytes[1] & 0xE0) == 0xE0) {
                return "audio/mpeg";
            }
            // OGG: OggS
            if (headerBytes[0] == 'O' && headerBytes[1] == 'g' && headerBytes[2] == 'g' && headerBytes[3] == 'S') {
                return "audio/ogg";
            }
            // RIFF container (WAV or WEBP)
            if (bytesRead >= 12 && headerBytes[0] == 'R' && headerBytes[1] == 'I' && headerBytes[2] == 'F' && headerBytes[3] == 'F') {
                if (headerBytes[8] == 'W' && headerBytes[9] == 'E' && headerBytes[10] == 'B' && headerBytes[11] == 'P') {
                    return "image/webp";
                }
                if (headerBytes[8] == 'W' && headerBytes[9] == 'A' && headerBytes[10] == 'V' && headerBytes[11] == 'E') {
                    return "audio/wav";
                }
            }
            // MP4 / M4A: ftyp at offset 4
            if (bytesRead >= 8 && headerBytes[4] == 'f' && headerBytes[5] == 't' && headerBytes[6] == 'y' && headerBytes[7] == 'p') {
                return "audio/mp4";
            }
            // EPUB / ZIP (PK..)
            if (headerBytes[0] == 'P' && headerBytes[1] == 'K' && (headerBytes[2] == 3 || headerBytes[2] == 5 || headerBytes[2] == 7)) {
                return "application/epub+zip";
            }
        }

        if (connectionContentType != null && !connectionContentType.contains("octet-stream") && !connectionContentType.contains("text/plain")) {
            return connectionContentType;
        }

        // Default fallback for audio
        return "audio/mpeg";
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
            } else if (post.has("photo")) {
                JsonNode photos = post.get("photo");
                if (photos.isArray() && photos.size() > 0) {
                    JsonNode largestPhoto = photos.get(photos.size() - 1);
                    fileId = largestPhoto.path("file_id").asText();
                    fileName = "Мұқаба суреті";
                    fileTypeTitle = "Мұқаба суреті (Сурет)";
                }
            } else if (post.has("document")) {
                JsonNode doc = post.get("document");
                String mime = doc.path("mime_type").asText("").toLowerCase();
                String fn = doc.path("file_name").asText("").toLowerCase();
                fileId = doc.path("file_id").asText();
                fileName = doc.path("file_name").asText("Құжат");

                if (mime.startsWith("audio/") || fn.endsWith(".mp3") || fn.endsWith(".m4a") || fn.endsWith(".ogg") || fn.endsWith(".m4r") || fn.endsWith(".wav")) {
                    fileTypeTitle = "Аудиокітап";
                } else if (mime.startsWith("image/") || fn.endsWith(".png") || fn.endsWith(".jpg") || fn.endsWith(".jpeg") || fn.endsWith(".webp")) {
                    fileTypeTitle = "Мұқаба суреті (Сурет)";
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
                String cleanBaseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.replaceAll("/+$", "") : "https://tandamen.kz";
                String streamUrl = cleanBaseUrl + "/api/v1/media/telegram/" + fileId;
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

    private void streamLocalFile(File file, String path, HttpServletRequest request, HttpServletResponse response) {
        long fileLength = file.length();
        String contentType = detectContentType(path, null, 0, null);
        response.setContentType(contentType);
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Content-Type, Accept");
        response.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
        response.setHeader("Cache-Control", "public, max-age=86400");

        String filename = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : "file";
        response.setHeader("Content-Disposition", "inline; filename=\"" + filename + "\"");

        String rangeHeader = request.getHeader("Range");
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] ranges = rangeHeader.substring(6).split("-");
            long start = Long.parseLong(ranges[0]);
            long end = (ranges.length > 1 && !ranges[1].isBlank()) ? Long.parseLong(ranges[1]) : fileLength - 1;
            if (end >= fileLength) end = fileLength - 1;
            long contentLength = end - start + 1;

            response.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT);
            response.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + fileLength);
            response.setHeader("Content-Length", String.valueOf(contentLength));

            try (RandomAccessFile raf = new RandomAccessFile(file, "r");
                 OutputStream out = response.getOutputStream()) {
                raf.seek(start);
                byte[] buffer = new byte[16384];
                long bytesRemaining = contentLength;
                while (bytesRemaining > 0) {
                    int read = raf.read(buffer, 0, (int) Math.min(buffer.length, bytesRemaining));
                    if (read == -1) break;
                    out.write(buffer, 0, read);
                    bytesRemaining -= read;
                }
                out.flush();
            } catch (Exception e) {
                log.debug("Local stream ended or disconnected: {}", e.getMessage());
            }
        } else {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setHeader("Content-Length", String.valueOf(fileLength));
            try (InputStream is = new BufferedInputStream(new java.io.FileInputStream(file), 16384);
                 OutputStream out = response.getOutputStream()) {
                byte[] buffer = new byte[16384];
                int read;
                while ((read = is.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
                out.flush();
            } catch (Exception e) {
                log.debug("Local stream ended or disconnected: {}", e.getMessage());
            }
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
                    .uri(URI.create(getCleanBotApiUrl() + "/bot" + botToken.trim() + "/sendMessage"))
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
