package com.tanda.controller;

import com.tanda.dto.media.MediaUploadResponseDto;
import com.tanda.service.MediaUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping({"/api/v1", "/api"})
@RequiredArgsConstructor
@Tag(name = "Media", description = "Media file management and streaming")
public class MediaController {

    private final MediaUploadService mediaUploadService;

    @PostMapping({"/admin/upload", "/admin/media/upload"})
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Upload media file (admin only)")
    public ResponseEntity<MediaUploadResponseDto> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "covers") String category) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaUploadService.uploadFile(file, category));
    }

    @GetMapping("/media/stream/audio/{fileName}")
    @Operation(summary = "Stream audio chapter with byte range support (HTTP 206)")
    public ResponseEntity<ResourceRegion> streamAudio(
            @PathVariable String fileName,
            @RequestHeader HttpHeaders headers) throws IOException {
        ResourceRegion region = mediaUploadService.getAudioResourceRegion(fileName, headers);
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(MediaTypeFactory.getMediaType(fileName).orElse(MediaType.valueOf("audio/mpeg")))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(region);
    }
}
