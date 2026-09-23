package com.tanda.service;

import com.tanda.dto.content.QuoteRequestDto;
import com.tanda.dto.content.QuoteResponseDto;
import com.tanda.entity.Quote;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.QuoteRepository;
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
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final MessageService messageService;

    @Transactional(readOnly = true)
    public List<QuoteResponseDto> getActiveQuotes() {
        return quoteRepository.findByIsActiveTrueOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public QuoteResponseDto getRandomQuote() {
        Quote quote = quoteRepository.findRandomActiveQuote();
        if (quote == null) {
            List<Quote> active = quoteRepository.findByIsActiveTrueOrderByCreatedAtDesc();
            if (!active.isEmpty()) {
                quote = active.get(0);
            }
        }
        if (quote == null) {
            return QuoteResponseDto.builder()
                    .id("quote-default")
                    .text("Кітап – білім бұлағы, білім – өмір шырағы.")
                    .author("Халық даналығы")
                    .isActive(true)
                    .sentCount(0)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build();
        }
        return toDto(quote);
    }

    @Transactional(readOnly = true)
    public List<QuoteResponseDto> getAllQuotesAdmin() {
        return quoteRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public QuoteResponseDto createQuote(QuoteRequestDto dto) {
        OffsetDateTime now = OffsetDateTime.now();
        Quote quote = Quote.builder()
                .id("quote-" + UUID.randomUUID().toString().substring(0, 8))
                .text(dto.getText().trim())
                .author(dto.getAuthor() != null && !dto.getAuthor().isBlank() ? dto.getAuthor().trim() : "Халық даналығы")
                .bookId(dto.getBookId())
                .bookTitle(dto.getBookTitle() != null ? dto.getBookTitle().trim() : null)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .sentCount(0)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Quote saved = quoteRepository.save(quote);
        log.info("Created quote: id='{}', author='{}'", saved.getId(), saved.getAuthor());
        return toDto(saved);
    }

    @Transactional
    public List<QuoteResponseDto> createBulkQuotes(List<QuoteRequestDto> dtos) {
        List<QuoteResponseDto> created = new ArrayList<>();
        for (QuoteRequestDto dto : dtos) {
            if (dto.getText() != null && !dto.getText().isBlank()) {
                created.add(createQuote(dto));
            }
        }
        return created;
    }

    @Transactional
    public QuoteResponseDto updateQuote(String id, QuoteRequestDto dto) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quote", "id", id));

        if (dto.getText() != null && !dto.getText().isBlank()) {
            quote.setText(dto.getText().trim());
        }
        if (dto.getAuthor() != null) {
            quote.setAuthor(dto.getAuthor().trim());
        }
        if (dto.getBookId() != null) quote.setBookId(dto.getBookId());
        if (dto.getBookTitle() != null) quote.setBookTitle(dto.getBookTitle().trim());
        if (dto.getIsActive() != null) quote.setIsActive(dto.getIsActive());

        quote.setUpdatedAt(OffsetDateTime.now());
        Quote saved = quoteRepository.save(quote);
        return toDto(saved);
    }

    @Transactional
    public void deleteQuote(String id) {
        quoteRepository.deleteById(id);
        log.info("Deleted quote: id='{}'", id);
    }

    @Transactional
    public void deleteBulkQuotes(List<String> ids) {
        if (ids != null && !ids.isEmpty()) {
            quoteRepository.deleteAllById(ids);
            log.info("Bulk deleted quotes: count={}", ids.size());
        }
    }

    @Transactional
    public QuoteResponseDto sendQuote(String id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quote", "id", id));

        OffsetDateTime now = OffsetDateTime.now();
        quote.setSentCount((quote.getSentCount() != null ? quote.getSentCount() : 0) + 1);
        quote.setLastSentAt(now);
        quote.setUpdatedAt(now);
        Quote saved = quoteRepository.save(quote);
        log.info("Quote sent to all readers: id='{}', author='{}', totalSentCount={}", saved.getId(), saved.getAuthor(), saved.getSentCount());

        try {
            messageService.createQuoteBroadcast(saved);
        } catch (Exception e) {
            log.warn("Failed to create broadcast message for quote id='{}': {}", saved.getId(), e.getMessage());
        }

        return toDto(saved);
    }

    private QuoteResponseDto toDto(Quote q) {
        return QuoteResponseDto.builder()
                .id(q.getId())
                .text(q.getText())
                .author(q.getAuthor())
                .bookId(q.getBookId())
                .bookTitle(q.getBookTitle())
                .isActive(q.getIsActive())
                .sentCount(q.getSentCount())
                .lastSentAt(q.getLastSentAt())
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .build();
    }
}
