package com.tanda.controller;

import com.tanda.dto.content.NewsRequestDto;
import com.tanda.dto.content.NewsResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.NewsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping({"/api/v1/news", "/api/news"})
    public ResponseEntity<List<NewsResponseDto>> getPublishedNews() {
        return ResponseEntity.ok(newsService.getPublishedNews());
    }

    @GetMapping({"/api/v1/news/{id}", "/api/news/{id}"})
    public ResponseEntity<NewsResponseDto> getNewsById(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        boolean isAdmin = principal != null && principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(newsService.getNewsById(id, isAdmin));
    }

    @PostMapping({"/api/v1/news/{id}/views", "/api/news/{id}/views"})
    public ResponseEntity<Void> incrementViews(@PathVariable String id) {
        newsService.incrementViews(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping({"/api/v1/admin/news", "/api/admin/news"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NewsResponseDto>> getAllNewsAdmin() {
        return ResponseEntity.ok(newsService.getAllNewsAdmin());
    }

    @PostMapping({"/api/v1/admin/news", "/api/admin/news"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NewsResponseDto> createNews(@Valid @RequestBody NewsRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(newsService.createNews(request));
    }

    @PatchMapping({"/api/v1/admin/news/{id}", "/api/admin/news/{id}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NewsResponseDto> updateNews(
            @PathVariable String id,
            @RequestBody NewsRequestDto request
    ) {
        return ResponseEntity.ok(newsService.updateNews(id, request));
    }

    @DeleteMapping({"/api/v1/admin/news/{id}", "/api/admin/news/{id}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteNews(@PathVariable String id) {
        newsService.deleteNews(id);
        return ResponseEntity.noContent().build();
    }
}
