package com.tanda.service;

import com.tanda.dto.audio.AdminAudioBookStatDto;
import com.tanda.dto.audio.AdminAudioStatsResponseDto;
import com.tanda.dto.audio.TopAudioBookResponseDto;
import com.tanda.entity.Book;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioAnalyticsService {

    private final AudioSessionRepository audioSessionRepository;
    private final BookRepository bookRepository;
    private final BookService bookService;

    @Transactional(readOnly = true)
    public List<TopAudioBookResponseDto> getTopAudioBooks(int limit) {
        int effectiveLimit = Math.max(1, Math.min(limit, 50));
        OffsetDateTime sevenDaysAgo = OffsetDateTime.now().minusDays(7);
        OffsetDateTime todayStart = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();

        List<Object[]> rows = audioSessionRepository.findTopAudioSessionsSince(sevenDaysAgo, PageRequest.of(0, effectiveLimit));
        List<TopAudioBookResponseDto> result = new ArrayList<>();
        Set<String> seenBookIds = new LinkedHashSet<>();

        for (Object[] row : rows) {
            String bookId = (String) row[0];
            Long totalListens = ((Number) row[1]).longValue();
            Long totalSeconds = ((Number) row[2]).longValue();

            Book book = bookRepository.findById(bookId).orElse(null);
            if (book == null || Boolean.TRUE.equals(book.getIsArchived())) {
                continue;
            }

            long todayListens = audioSessionRepository.countSessionsForBookSince(bookId, todayStart);
            result.add(TopAudioBookResponseDto.builder()
                    .book(bookService.toResponseDto(book))
                    .todayListens(todayListens)
                    .totalListens(totalListens)
                    .totalSeconds(totalSeconds)
                    .build());
            seenBookIds.add(bookId);
        }

        // Cold-start fallback: if fewer than effectiveLimit have sessions, fill up with audio books
        if (result.size() < effectiveLimit) {
            List<Book> candidateBooks = bookRepository.findAll();
            for (Book b : candidateBooks) {
                if (result.size() >= effectiveLimit) break;
                if (Boolean.TRUE.equals(b.getIsArchived())) continue;
                if (!Boolean.TRUE.equals(b.getHasAudio()) && (b.getAudioUrl() == null || b.getAudioUrl().isBlank())) {
                    continue;
                }
                if (!seenBookIds.contains(b.getId())) {
                    result.add(TopAudioBookResponseDto.builder()
                            .book(bookService.toResponseDto(b))
                            .todayListens(0)
                            .totalListens(0)
                            .totalSeconds(0)
                            .build());
                    seenBookIds.add(b.getId());
                }
            }
        }

        // Assign ranks (1..N)
        for (int i = 0; i < result.size(); i++) {
            result.get(i).setRank(i + 1);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public AdminAudioStatsResponseDto getAdminAudioStats() {
        List<Object[]> globalRows = audioSessionRepository.getGlobalAudioStats();
        long totalSessions = 0;
        long totalSeconds = 0;
        long uniqueListeners = 0;

        if (globalRows != null && !globalRows.isEmpty() && globalRows.get(0) != null) {
            Object[] g = globalRows.get(0);
            totalSessions = g[0] != null ? ((Number) g[0]).longValue() : 0;
            totalSeconds = g[1] != null ? ((Number) g[1]).longValue() : 0;
            uniqueListeners = g[2] != null ? ((Number) g[2]).longValue() : 0;
        }

        double totalHours = Math.round((totalSeconds / 3600.0) * 10.0) / 10.0;

        List<Object[]> perBookRows = audioSessionRepository.getAudioStatsPerBook(PageRequest.of(0, 20));
        List<AdminAudioBookStatDto> topBooks = new ArrayList<>();

        for (Object[] row : perBookRows) {
            String bookId = (String) row[0];
            long count = ((Number) row[1]).longValue();
            long seconds = ((Number) row[2]).longValue();
            long listeners = ((Number) row[3]).longValue();

            Book book = bookRepository.findById(bookId).orElse(null);
            topBooks.add(AdminAudioBookStatDto.builder()
                    .bookId(bookId)
                    .title(book != null ? book.getTitle() : "Unknown Book")
                    .author(book != null ? book.getAuthor() : "Unknown Author")
                    .coverImage(book != null ? book.getCoverImage() : null)
                    .sessionsCount(count)
                    .totalSeconds(seconds)
                    .uniqueListeners(listeners)
                    .build());
        }

        return AdminAudioStatsResponseDto.builder()
                .totalSessions(totalSessions)
                .totalSeconds(totalSeconds)
                .totalListeningHours(totalHours)
                .uniqueListeners(uniqueListeners)
                .topBooks(topBooks)
                .build();
    }
}
