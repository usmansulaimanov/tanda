package com.tanda.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.content.NewsRequestDto;
import com.tanda.dto.content.NewsResponseDto;
import com.tanda.entity.News;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.NewsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsService {

    private final NewsRepository newsRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<NewsResponseDto> getPublishedNews() {
        return newsRepository.findByIsPublishedTrueAndPublishedAtLessThanEqualOrderByPublishedAtDesc(OffsetDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NewsResponseDto> getAllNewsAdmin() {
        return newsRepository.findAllByOrderByPublishedAtDesc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public NewsResponseDto getNewsById(String id, boolean isAdmin) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News", "id", id));

        if (!isAdmin && (!Boolean.TRUE.equals(news.getIsPublished()) || (news.getPublishedAt() != null && news.getPublishedAt().isAfter(OffsetDateTime.now())))) {
            throw new ResourceNotFoundException("News", "id", id);
        }

        return toDto(news);
    }

    @Transactional
    public NewsResponseDto createNews(NewsRequestDto dto) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime pubDate = dto.getPublishedAt() != null ? dto.getPublishedAt() : now;

        String imagesJson = null;
        if (dto.getImages() != null && !dto.getImages().isEmpty()) {
            try {
                imagesJson = objectMapper.writeValueAsString(dto.getImages());
            } catch (Exception ignored) {}
        }

        String primaryImg = (dto.getImages() != null && !dto.getImages().isEmpty())
                ? dto.getImages().get(0)
                : dto.getImageUrl();

        String summary = dto.getSummary();
        if (summary == null || summary.isBlank()) {
            summary = dto.getContent().length() > 180
                    ? dto.getContent().substring(0, 180) + "..."
                    : dto.getContent();
        }

        News news = News.builder()
                .id("news-" + UUID.randomUUID().toString().substring(0, 8))
                .title(dto.getTitle().trim())
                .content(dto.getContent().trim())
                .summary(summary.trim())
                .imageUrl(primaryImg)
                .images(imagesJson)
                .linkUrl(dto.getLinkUrl())
                .linkText(dto.getLinkText())
                .authorName(dto.getAuthorName() != null && !dto.getAuthorName().isBlank() ? dto.getAuthorName().trim() : "Tanda News")
                .viewsCount(0)
                .isPublished(dto.getIsPublished() != null ? dto.getIsPublished() : true)
                .publishedAt(pubDate)
                .scheduledAt(dto.getScheduledAt())
                .createdAt(now)
                .updatedAt(now)
                .build();

        News saved = newsRepository.save(news);
        log.info("Created news article: id='{}', title='{}'", saved.getId(), saved.getTitle());
        return toDto(saved);
    }

    @Transactional
    public NewsResponseDto updateNews(String id, NewsRequestDto dto) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News", "id", id));

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
            news.setTitle(dto.getTitle().trim());
        }
        if (dto.getContent() != null && !dto.getContent().isBlank()) {
            news.setContent(dto.getContent().trim());
        }
        if (dto.getSummary() != null) {
            news.setSummary(dto.getSummary().trim());
        }
        if (dto.getImages() != null) {
            try {
                news.setImages(objectMapper.writeValueAsString(dto.getImages()));
                if (!dto.getImages().isEmpty()) {
                    news.setImageUrl(dto.getImages().get(0));
                }
            } catch (Exception ignored) {}
        } else if (dto.getImageUrl() != null) {
            news.setImageUrl(dto.getImageUrl());
        }
        if (dto.getLinkUrl() != null) news.setLinkUrl(dto.getLinkUrl());
        if (dto.getLinkText() != null) news.setLinkText(dto.getLinkText());
        if (dto.getAuthorName() != null) news.setAuthorName(dto.getAuthorName().trim());
        if (dto.getIsPublished() != null) news.setIsPublished(dto.getIsPublished());
        if (dto.getPublishedAt() != null) news.setPublishedAt(dto.getPublishedAt());
        if (dto.getScheduledAt() != null) news.setScheduledAt(dto.getScheduledAt());

        news.setUpdatedAt(OffsetDateTime.now());
        News saved = newsRepository.save(news);
        return toDto(saved);
    }

    @Transactional
    public void deleteNews(String id) {
        newsRepository.deleteById(id);
        log.info("Deleted news article: id='{}'", id);
    }

    @Transactional
    public void incrementViews(String id) {
        newsRepository.findById(id).ifPresent(news -> {
            news.setViewsCount((news.getViewsCount() != null ? news.getViewsCount() : 0) + 1);
            newsRepository.save(news);
        });
    }

    private NewsResponseDto toDto(News news) {
        List<String> imgList = new ArrayList<>();
        if (news.getImages() != null && !news.getImages().isBlank()) {
            try {
                imgList = objectMapper.readValue(news.getImages(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }
        if (imgList.isEmpty() && news.getImageUrl() != null && !news.getImageUrl().isBlank()) {
            imgList.add(news.getImageUrl());
        }

        return NewsResponseDto.builder()
                .id(news.getId())
                .title(news.getTitle())
                .content(news.getContent())
                .summary(news.getSummary())
                .imageUrl(news.getImageUrl())
                .images(imgList)
                .linkUrl(news.getLinkUrl())
                .linkText(news.getLinkText())
                .authorName(news.getAuthorName())
                .viewsCount(news.getViewsCount())
                .isPublished(news.getIsPublished())
                .publishedAt(news.getPublishedAt())
                .scheduledAt(news.getScheduledAt())
                .createdAt(news.getCreatedAt())
                .updatedAt(news.getUpdatedAt())
                .build();
    }
}
