package com.tanda.service;

import com.tanda.dto.media.MediaUploadResponseDto;
import com.tanda.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class MediaUploadService {

    @Value("${tanda.storage.location:./uploads}")
    private String storageLocation;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    private static final Set<String> ALLOWED_AUDIO_TYPES = Set.of(
            "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a"
    );

    private static final Set<String> ALLOWED_BOOK_TYPES = Set.of(
            "application/pdf", "application/epub+zip", "application/octet-stream"
    );

    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;  // 10MB
    private static final long MAX_AUDIO_SIZE = 300L * 1024 * 1024; // 300MB
    private static final long MAX_BOOK_SIZE = 100L * 1024 * 1024;  // 100MB

    @PostConstruct
    public void init() {
        try {
            Path root = Paths.get(storageLocation);
            Files.createDirectories(root.resolve("covers"));
            Files.createDirectories(root.resolve("audio"));
            Files.createDirectories(root.resolve("books"));
            log.info("Media upload directories initialized at: {}", root.toAbsolutePath());
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    public MediaUploadResponseDto uploadFile(MultipartFile file, String category) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Файл таңдалмаған");
        }

        String normalizedCategory = (category != null ? category.toLowerCase().trim() : "covers");
        if (!List.of("covers", "audio", "books").contains(normalizedCategory)) {
            normalizedCategory = "covers";
        }

        validateFile(file, normalizedCategory);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        if (originalFilename.contains("..")) {
            throw new BadRequestException("Файл атауында қате бар (Path traversal)");
        }

        String extension = getFileExtension(originalFilename);
        String uniqueFileName = UUID.randomUUID().toString() + (extension.isEmpty() ? "" : "." + extension);

        Path targetDir = Paths.get(storageLocation).resolve(normalizedCategory);
        Path targetPath = targetDir.resolve(uniqueFileName);

        try (InputStream is = file.getInputStream()) {
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store file: {}", originalFilename, e);
            throw new RuntimeException("Файлды сақтау кезінде қате орын алды: " + e.getMessage());
        }

        String publicUrl = "/uploads/" + normalizedCategory + "/" + uniqueFileName;
        return MediaUploadResponseDto.builder()
                .key(normalizedCategory + "/" + uniqueFileName)
                .url(publicUrl)
                .fileName(originalFilename)
                .contentType(file.getContentType())
                .size(file.getSize())
                .build();
    }

    public ResourceRegion getAudioResourceRegion(String fileName, HttpHeaders headers) throws IOException {
        Path filePath = Paths.get(storageLocation).resolve("audio").resolve(fileName);
        if (!Files.exists(filePath)) {
            throw new BadRequestException("Аудио файл табылмады: " + fileName);
        }

        Resource resource = new FileSystemResource(filePath);
        long contentLength = resource.contentLength();

        List<HttpRange> ranges = headers.getRange();
        if (ranges.isEmpty()) {
            long rangeLength = Math.min(1024 * 1024L, contentLength); // 1MB chunk default
            return new ResourceRegion(resource, 0, rangeLength);
        }

        HttpRange range = ranges.get(0);
        long start = range.getRangeStart(contentLength);
        long end = range.getRangeEnd(contentLength);
        long rangeLength = Math.min(1024 * 1024L, end - start + 1);

        return new ResourceRegion(resource, start, rangeLength);
    }

    private void validateFile(MultipartFile file, String category) {
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        long size = file.getSize();

        switch (category) {
            case "covers" -> {
                if (size > MAX_IMAGE_SIZE) {
                    throw new BadRequestException("Мұқаба файлы 10MB-тан аспауы керек");
                }
                if (!contentType.startsWith("image/") && !ALLOWED_IMAGE_TYPES.contains(contentType)) {
                    throw new BadRequestException("Қате сурет форматы. Тек JPG, PNG, WEBP қолдау табады.");
                }
            }
            case "audio" -> {
                if (size > MAX_AUDIO_SIZE) {
                    throw new BadRequestException("Аудио файлы 300MB-тан аспауы керек");
                }
                if (!contentType.startsWith("audio/") && !ALLOWED_AUDIO_TYPES.contains(contentType)) {
                    throw new BadRequestException("Қате аудио форматы. Тек MP3, WAV, OGG, M4A, AAC қолдау табады.");
                }
            }
            case "books" -> {
                if (size > MAX_BOOK_SIZE) {
                    throw new BadRequestException("Кітап файлы 100MB-тан аспауы керек");
                }
                if (!ALLOWED_BOOK_TYPES.contains(contentType) && !file.getOriginalFilename().endsWith(".epub") && !file.getOriginalFilename().endsWith(".pdf")) {
                    throw new BadRequestException("Қате кітап форматы. Тек PDF және EPUB қолдау табады.");
                }
            }
        }
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex > 0 && dotIndex < filename.length() - 1) ? filename.substring(dotIndex + 1).toLowerCase() : "";
    }
}
