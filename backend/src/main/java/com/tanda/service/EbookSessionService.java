package com.tanda.service;

import com.tanda.dto.ebook.EbookEndSessionRequestDto;
import com.tanda.dto.ebook.EbookHeartbeatRequestDto;
import com.tanda.dto.ebook.EbookSessionHeartbeatResponseDto;
import com.tanda.dto.ebook.EbookSessionResponseDto;
import com.tanda.dto.ebook.StartEbookSessionRequestDto;
import com.tanda.dto.shelf.UserBookRequestDto;
import com.tanda.entity.AudioDailyStats;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.AuthorDailyBookStats;
import com.tanda.entity.Book;
import com.tanda.entity.EbookSession;
import com.tanda.entity.UserDailyAudioLimit;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorDailyBookStatsRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.EbookSessionRepository;
import com.tanda.repository.UserDailyAudioLimitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EbookSessionService {

    /**
     * Maximum wall-clock seconds credited per single heartbeat (30s interval + 15s grace).
     */
    private static final int MAX_HEARTBEAT_WALL_DELTA_SECONDS = 45;

    /**
     * If user stays on the exact same location/page without any flip interaction for > 120s (2 minutes),
     * reading time pauses until they flip a page or move location.
     */
    private static final int IDLE_TIMEOUT_SECONDS = 120;

    /**
     * Minimum seconds of active reading in a session before crediting daily book/author stats (1 minute).
     */
    public static final int MINIMUM_SESSION_THRESHOLD_SECONDS = 60;

    /**
     * Minimum seconds of reading before auto-marking the book as "reading" on user's shelf (5 minutes).
     */
    public static final int AUTO_SHELF_READING_THRESHOLD_SECONDS = 300;

    private final EbookSessionRepository ebookSessionRepository;
    private final AudioDailyStatsRepository audioDailyStatsRepository;
    private final AuthorDailyBookStatsRepository authorDailyBookStatsRepository;
    private final AuthorBookRepository authorBookRepository;
    private final AuthorRepository authorRepository;
    private final UserDailyAudioLimitRepository userDailyAudioLimitRepository;
    private final BookRepository bookRepository;
    private final UserBookService userBookService;

    @Transactional
    public EbookSessionResponseDto startSession(String userId, StartEbookSessionRequestDto request) {
        LocalDate today = LocalDate.now(AudioAnalyticsService.KZ_ZONE);
        UserDailyAudioLimit dailyLimit = getOrCreateDailyLimit(userId, today);
        int used = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;
        if (used >= AudioSessionService.DAILY_MAX_CONTENT_SECONDS) {
            throw new BadRequestException("Күнделікті 8 сағаттық лимитіңіз аяқталды. Ертең жалғастыра аласыз!");
        }

        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", request.getBookId()));

        OffsetDateTime now = OffsetDateTime.now();
        EbookSession session = EbookSession.builder()
                .id("es-" + UUID.randomUUID())
                .userId(userId)
                .book(book)
                .startedAt(now)
                .lastHeartbeatAt(now)
                .lastActivityAt(now)
                .validSeconds(0)
                .creditedSeconds(0)
                .currentPage(request.getCurrentPage() != null ? Math.max(0, request.getCurrentPage()) : 0)
                .totalPages(request.getTotalPages() != null ? Math.max(0, request.getTotalPages()) : 0)
                .lastCfi(request.getCurrentCfi())
                .interactionCount(0)
                .build();

        ebookSessionRepository.save(session);
        log.debug("Started ebook reading session {} for user={} book={}", session.getId(), userId, book.getId());

        return toResponseDto(session);
    }

    @Transactional
    public EbookSessionHeartbeatResponseDto heartbeat(String userId, String sessionId, EbookHeartbeatRequestDto request) {
        EbookSession session = ebookSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("EbookSession", "id", sessionId));

        LocalDate today = LocalDate.now(AudioAnalyticsService.KZ_ZONE);
        UserDailyAudioLimit dailyLimit = getOrCreateDailyLimit(userId, today);
        int currentUsed = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;

        if (session.getEndedAt() != null) {
            int remaining = Math.max(0, AudioSessionService.DAILY_MAX_CONTENT_SECONDS - currentUsed);
            return EbookSessionHeartbeatResponseDto.builder()
                    .sessionId(session.getId())
                    .validSeconds(session.getValidSeconds())
                    .creditedSeconds(session.getCreditedSeconds())
                    .idlePaused(false)
                    .dailyLimitReached(remaining == 0)
                    .remainingDailySeconds(remaining)
                    .build();
        }

        OffsetDateTime now = OffsetDateTime.now();
        long wallElapsed = Math.max(0, Duration.between(session.getLastHeartbeatAt(), now).getSeconds());
        int cappedWallDelta = (int) Math.min(wallElapsed, MAX_HEARTBEAT_WALL_DELTA_SECONDS);

        int prevPage = session.getCurrentPage() != null ? session.getCurrentPage() : 0;
        int newPage = request != null && request.getCurrentPage() != null ? Math.max(0, request.getCurrentPage()) : prevPage;
        int totalPages = request != null && request.getTotalPages() != null ? Math.max(0, request.getTotalPages()) : (session.getTotalPages() != null ? session.getTotalPages() : 0);
        String prevCfi = session.getLastCfi();
        String newCfi = request != null && request.getCurrentCfi() != null ? request.getCurrentCfi() : prevCfi;
        int prevInteractions = session.getInteractionCount() != null ? session.getInteractionCount() : 0;
        int newInteractions = request != null && request.getInteractionCount() != null ? Math.max(prevInteractions, request.getInteractionCount()) : prevInteractions;

        boolean cfiChanged = newCfi != null && !newCfi.equals(prevCfi);
        boolean pageChanged = newPage != prevPage;
        boolean interactionOccurred = newInteractions > prevInteractions;

        // Check anti-clicker / anti-seek speed limit:
        // 1 standard page = 2400 chars (~300 words). Reading > 3 standard pages per minute (< 15s per standard page) is a seek/skim jump.
        int pageDelta = Math.abs(newPage - prevPage);
        int maxAllowedPageDelta = Math.max(3, (int) Math.ceil(Math.max(cappedWallDelta, 15) / 15.0));
        boolean isSeekJump = pageDelta > maxAllowedPageDelta;

        if (cfiChanged || pageChanged || interactionOccurred) {
            session.setLastActivityAt(now);
        }

        long secondsSinceLastActivity = Math.max(0, Duration.between(session.getLastActivityAt(), now).getSeconds());
        boolean idlePaused = secondsSinceLastActivity > IDLE_TIMEOUT_SECONDS;

        int validatedDelta = 0;
        if (!idlePaused && !isSeekJump && cappedWallDelta > 0) {
            validatedDelta = cappedWallDelta;
        }

        int remainingBefore = Math.max(0, AudioSessionService.DAILY_MAX_CONTENT_SECONDS - currentUsed);
        if (validatedDelta > remainingBefore) {
            validatedDelta = remainingBefore;
        }

        boolean limitReached = (remainingBefore == 0) || (currentUsed + validatedDelta >= AudioSessionService.DAILY_MAX_CONTENT_SECONDS);

        if (validatedDelta > 0) {
            session.setValidSeconds(session.getValidSeconds() + validatedDelta);
            dailyLimit.setTotalSeconds(currentUsed + validatedDelta);
            userDailyAudioLimitRepository.save(dailyLimit);

            // Credit daily book & author stats only after session reaches 60 seconds (1 minute)
            if (session.getValidSeconds() >= MINIMUM_SESSION_THRESHOLD_SECONDS) {
                int alreadyCredited = session.getCreditedSeconds() != null ? session.getCreditedSeconds() : 0;
                int deltaToCredit = session.getValidSeconds() - alreadyCredited;
                if (deltaToCredit > 0) {
                    boolean isFirstCreditForSession = (alreadyCredited == 0);
                    creditDailyReadingStats(session.getBook(), deltaToCredit, isFirstCreditForSession);
                    session.setCreditedSeconds(session.getValidSeconds());
                }
            }

            if (session.getValidSeconds() >= AUTO_SHELF_READING_THRESHOLD_SECONDS && userId != null) {
                try {
                    userBookService.addOrUpdateBook(userId, session.getBook().getId(), UserBookRequestDto.builder()
                            .status("reading")
                            .build());
                } catch (Exception e) {
                    log.debug("Auto shelf reading update skipped: {}", e.getMessage());
                }
            }
        }

        session.setCurrentPage(newPage);
        if (totalPages > 0) {
            session.setTotalPages(totalPages);
        }
        if (newCfi != null) {
            session.setLastCfi(newCfi);
        }
        session.setInteractionCount(newInteractions);
        session.setLastHeartbeatAt(now);
        ebookSessionRepository.save(session);

        int finalUsed = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;
        int remainingAfter = Math.max(0, AudioSessionService.DAILY_MAX_CONTENT_SECONDS - finalUsed);

        return EbookSessionHeartbeatResponseDto.builder()
                .sessionId(session.getId())
                .validSeconds(session.getValidSeconds())
                .creditedSeconds(session.getCreditedSeconds())
                .idlePaused(idlePaused)
                .dailyLimitReached(limitReached)
                .remainingDailySeconds(remainingAfter)
                .build();
    }

    @Transactional
    public EbookSessionResponseDto endSession(String userId, String sessionId, EbookEndSessionRequestDto request) {
        EbookSession session = ebookSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("EbookSession", "id", sessionId));

        if (session.getEndedAt() == null) {
            if (request != null) {
                heartbeat(userId, sessionId, EbookHeartbeatRequestDto.builder()
                        .currentPage(request.getCurrentPage())
                        .totalPages(request.getTotalPages())
                        .currentCfi(request.getCurrentCfi())
                        .interactionCount(request.getInteractionCount())
                        .build());
            }
            session.setEndedAt(OffsetDateTime.now());
            ebookSessionRepository.save(session);
        }

        return toResponseDto(session);
    }

    private UserDailyAudioLimit getOrCreateDailyLimit(String userId, LocalDate date) {
        return userDailyAudioLimitRepository.findByUserIdAndStatDate(userId, date)
                .orElseGet(() -> {
                    UserDailyAudioLimit created = UserDailyAudioLimit.builder()
                            .id("udl-" + UUID.randomUUID())
                            .userId(userId)
                            .statDate(date)
                            .totalSeconds(0)
                            .build();
                    return userDailyAudioLimitRepository.save(created);
                });
    }

    private void creditDailyReadingStats(Book book, int deltaSeconds, boolean isNewReadSession) {
        LocalDate today = LocalDate.now(AudioAnalyticsService.KZ_ZONE);
        AudioDailyStats stats = audioDailyStatsRepository
                .findByBookIdAndStatDate(book.getId(), today)
                .orElseGet(() -> AudioDailyStats.builder()
                        .id("ads-" + UUID.randomUUID())
                        .book(book)
                        .statDate(today)
                        .listenCount(0)
                        .totalSeconds(0L)
                        .readingSeconds(0L)
                        .readCount(0)
                        .uniqueListeners(0)
                        .build());

        long currentReadSec = stats.getReadingSeconds() != null ? stats.getReadingSeconds() : 0L;
        stats.setReadingSeconds(currentReadSec + deltaSeconds);
        if (isNewReadSession) {
            int currentReads = stats.getReadCount() != null ? stats.getReadCount() : 0;
            stats.setReadCount(currentReads + 1);
        }
        audioDailyStatsRepository.save(stats);

        creditAuthorDailyReadingStats(book, today, deltaSeconds, isNewReadSession);
    }

    private void creditAuthorDailyReadingStats(Book book, LocalDate today, int deltaSeconds, boolean isNewReadSession) {
        Set<String> targetAuthorIds = new HashSet<>();

        List<AuthorBook> activeAssignments = authorBookRepository.findByBookIdAndIsActiveTrue(book.getId());
        for (AuthorBook ab : activeAssignments) {
            if (ab.getAuthorId() != null) {
                targetAuthorIds.add(ab.getAuthorId());
            }
        }

        if (targetAuthorIds.isEmpty() && book.getAuthor() != null && !book.getAuthor().isBlank()) {
            String bookAuthorName = book.getAuthor().trim().toLowerCase();
            List<Author> allAuthors = authorRepository.findAll();
            for (Author a : allAuthors) {
                if (a.getDisplayName() != null && a.getDisplayName().trim().toLowerCase().equals(bookAuthorName)) {
                    targetAuthorIds.add(a.getId());
                }
            }
        }

        for (String authorId : targetAuthorIds) {
            AuthorDailyBookStats authorStats = authorDailyBookStatsRepository
                    .findByAuthorIdAndBookIdAndStatDate(authorId, book.getId(), today)
                    .orElseGet(() -> AuthorDailyBookStats.builder()
                            .id("adbs-" + UUID.randomUUID())
                            .authorId(authorId)
                            .bookId(book.getId())
                            .statDate(today)
                            .totalSeconds(0L)
                            .listenCount(0)
                            .readingSeconds(0L)
                            .readCount(0)
                            .build());

            long currentReadSec = authorStats.getReadingSeconds() != null ? authorStats.getReadingSeconds() : 0L;
            authorStats.setReadingSeconds(currentReadSec + deltaSeconds);
            if (isNewReadSession) {
                int currentReads = authorStats.getReadCount() != null ? authorStats.getReadCount() : 0;
                authorStats.setReadCount(currentReads + 1);
            }
            authorDailyBookStatsRepository.save(authorStats);
        }
    }

    private EbookSessionResponseDto toResponseDto(EbookSession session) {
        return EbookSessionResponseDto.builder()
                .sessionId(session.getId())
                .bookId(session.getBook().getId())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .validSeconds(session.getValidSeconds())
                .creditedSeconds(session.getCreditedSeconds())
                .build();
    }
}
