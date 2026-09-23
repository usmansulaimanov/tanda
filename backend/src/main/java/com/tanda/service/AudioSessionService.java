package com.tanda.service;

import com.tanda.dto.audio.AudioEndSessionRequestDto;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.AudioSessionHeartbeatResponseDto;
import com.tanda.dto.audio.AudioSessionResponseDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.dto.audio.UserDailyLimitResponseDto;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.shelf.UserBookRequestDto;
import com.tanda.entity.AudioDailyStats;
import com.tanda.entity.AudioListenEvent;
import com.tanda.entity.AudioSession;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.AuthorDailyBookStats;
import com.tanda.entity.Book;
import com.tanda.entity.UserDailyAudioLimit;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioDailyStatsRepository;
import com.tanda.repository.AudioListenEventRepository;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorDailyBookStatsRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.UserDailyAudioLimitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioSessionService {

    public static final int DAILY_MAX_CONTENT_SECONDS = 8 * 3600; // 28,800 seconds = 8 hours
    public static final int MINIMUM_SESSION_THRESHOLD_SECONDS = 60; // 1 minute threshold

    private final AudioSessionRepository audioSessionRepository;
    private final AudioListenEventRepository audioListenEventRepository;
    private final BookRepository bookRepository;
    private final UserBookService userBookService;
    private final ReadingProgressService readingProgressService;
    private final UserDailyAudioLimitRepository userDailyAudioLimitRepository;
    private final AuthorDailyBookStatsRepository authorDailyBookStatsRepository;
    private final AudioDailyStatsRepository audioDailyStatsRepository;
    private final AuthorBookRepository authorBookRepository;
    private final AuthorRepository authorRepository;

    @Transactional(readOnly = true)
    public UserDailyLimitResponseDto getDailyLimit(String userId) {
        LocalDate today = LocalDate.now();
        int used = userDailyAudioLimitRepository.findByUserIdAndStatDate(userId, today)
                .map(UserDailyAudioLimit::getTotalSeconds).orElse(0);
        int remaining = Math.max(0, DAILY_MAX_CONTENT_SECONDS - used);
        boolean reached = used >= DAILY_MAX_CONTENT_SECONDS;

        return UserDailyLimitResponseDto.builder()
                .totalSeconds(used)
                .maxSeconds(DAILY_MAX_CONTENT_SECONDS)
                .remainingSeconds(remaining)
                .limitReached(reached)
                .build();
    }

    @Transactional
    public AudioSessionResponseDto startSession(String userId, StartAudioSessionRequestDto dto) {
        UserDailyLimitResponseDto limit = getDailyLimit(userId);
        if (Boolean.TRUE.equals(limit.getLimitReached())) {
            throw new BadRequestException("Бүгінгі күнге берілген тыңдалым лимитіңіз (8 сағат) аяқталды. Кітапты тыңдауды ертең (00:00-ден кейін) жалғастыра аласыз.");
        }

        Book book = bookRepository.findById(dto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", dto.getBookId()));

        String chapterId = dto.getChapterId();
        if ((chapterId == null || chapterId.isBlank()) && book.getAudioChapters() != null && !book.getAudioChapters().isEmpty()) {
            chapterId = book.getAudioChapters().get(0).getId();
        }

        OffsetDateTime now = OffsetDateTime.now();
        AudioSession session = AudioSession.builder()
                .id("as-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(userId)
                .book(book)
                .chapterId(chapterId)
                .startedAt(now)
                .lastHeartbeatAt(now)
                .validSeconds(0)
                .creditedSeconds(0)
                .build();

        AudioSession saved = audioSessionRepository.save(session);

        // Mark book as reading on user shelf
        try {
            userBookService.addOrUpdateBook(userId, book.getId(), UserBookRequestDto.builder()
                    .status("reading")
                    .build());
        } catch (Exception e) {
            log.warn("Could not automatically update user shelf for session start: {}", e.getMessage());
        }

        log.info("Started audio session={} for user={}, book={}", saved.getId(), userId, book.getId());
        return toSessionResponseDto(saved);
    }

    @Transactional
    public AudioSessionHeartbeatResponseDto heartbeat(String userId, String sessionId, AudioHeartbeatRequestDto dto) {
        AudioSession session = audioSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AudioSession", "id", sessionId));

        if (!session.getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied to audio session: " + sessionId);
        }

        LocalDate today = LocalDate.now();
        UserDailyAudioLimit dailyLimit = userDailyAudioLimitRepository.findByUserIdAndStatDate(userId, today)
                .orElseGet(() -> UserDailyAudioLimit.builder()
                        .id("udal-" + UUID.randomUUID().toString().substring(0, 8))
                        .userId(userId)
                        .statDate(today)
                        .totalSeconds(0)
                        .build());

        if (session.getEndedAt() != null) {
            int used = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;
            return AudioSessionHeartbeatResponseDto.builder()
                    .sessionId(sessionId)
                    .validSeconds(session.getValidSeconds())
                    .positionSeconds(dto.getPositionSeconds())
                    .dailyLimitReached(used >= DAILY_MAX_CONTENT_SECONDS)
                    .remainingDailySeconds(Math.max(0, DAILY_MAX_CONTENT_SECONDS - used))
                    .build();
        }

        OffsetDateTime now = OffsetDateTime.now();
        long wallClockDiff = Duration.between(session.getLastHeartbeatAt(), now).getSeconds();

        if (wallClockDiff > 0) {
            // Anti-cheat: Maximum acceptable wall-clock delta between consecutive heartbeats is 45 seconds
            int rawDeltaSeconds = (int) Math.min(wallClockDiff, 45);

            // Playback rate adjustment (content duration: 2x = 2 content seconds per 1 wall-clock second)
            double rate = (dto.getPlaybackRate() != null && dto.getPlaybackRate() > 0 && dto.getPlaybackRate() <= 3.0)
                    ? dto.getPlaybackRate()
                    : 1.0;
            int contentDeltaSeconds = (int) Math.round(rawDeltaSeconds * rate);

            // Enforce 8-hour daily content limit
            int currentUsed = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;
            int allowedContentSeconds = Math.max(0, Math.min(contentDeltaSeconds, DAILY_MAX_CONTENT_SECONDS - currentUsed));

            if (allowedContentSeconds > 0) {
                int newValid = session.getValidSeconds() + allowedContentSeconds;
                session.setValidSeconds(newValid);

                dailyLimit.setTotalSeconds(currentUsed + allowedContentSeconds);
                userDailyAudioLimitRepository.save(dailyLimit);

                AudioListenEvent event = AudioListenEvent.builder()
                        .id("ale-" + UUID.randomUUID().toString().substring(0, 8))
                        .session(session)
                        .positionSeconds(dto.getPositionSeconds())
                        .durationSeconds(allowedContentSeconds)
                        .recordedAt(now)
                        .build();
                audioListenEventRepository.save(event);

                // Check 1-minute threshold (>= 60s):
                // If validSeconds >= 60, credit uncredited content seconds to real-time author & book stats
                int credited = session.getCreditedSeconds() != null ? session.getCreditedSeconds() : 0;
                if (newValid >= MINIMUM_SESSION_THRESHOLD_SECONDS) {
                    int uncredited = newValid - credited;
                    if (uncredited > 0) {
                        creditStatsToAuthorAndBook(session.getBook().getId(), today, uncredited, credited == 0);
                        session.setCreditedSeconds(credited + uncredited);
                    }
                }
            }
        }

        session.setLastHeartbeatAt(now);
        audioSessionRepository.save(session);

        // Sync reading progress
        try {
            readingProgressService.updateProgress(userId, session.getBook().getId(), ReadingProgressRequestDto.builder()
                    .currentAudioChapterId(session.getChapterId())
                    .currentAudioTime(dto.getPositionSeconds())
                    .build());
        } catch (Exception e) {
            log.debug("Reading progress sync during heartbeat skipped: {}", e.getMessage());
        }

        int finalUsed = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;
        boolean limitReached = finalUsed >= DAILY_MAX_CONTENT_SECONDS;

        return AudioSessionHeartbeatResponseDto.builder()
                .sessionId(sessionId)
                .validSeconds(session.getValidSeconds())
                .positionSeconds(dto.getPositionSeconds())
                .dailyLimitReached(limitReached)
                .remainingDailySeconds(Math.max(0, DAILY_MAX_CONTENT_SECONDS - finalUsed))
                .build();
    }

    @Transactional
    public AudioSessionResponseDto endSession(String userId, String sessionId, AudioEndSessionRequestDto dto) {
        AudioSession session = audioSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AudioSession", "id", sessionId));

        if (!session.getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied to audio session: " + sessionId);
        }

        LocalDate today = LocalDate.now();
        OffsetDateTime now = OffsetDateTime.now();
        if (session.getEndedAt() == null) {
            long wallClockDiff = Duration.between(session.getLastHeartbeatAt(), now).getSeconds();
            if (wallClockDiff > 0 && wallClockDiff <= 45) {
                int rawDeltaSeconds = (int) wallClockDiff;
                double rate = (dto != null && dto.getPlaybackRate() != null && dto.getPlaybackRate() > 0 && dto.getPlaybackRate() <= 3.0)
                        ? dto.getPlaybackRate()
                        : 1.0;
                int contentDeltaSeconds = (int) Math.round(rawDeltaSeconds * rate);

                UserDailyAudioLimit dailyLimit = userDailyAudioLimitRepository.findByUserIdAndStatDate(userId, today)
                        .orElseGet(() -> UserDailyAudioLimit.builder()
                                .id("udal-" + UUID.randomUUID().toString().substring(0, 8))
                                .userId(userId)
                                .statDate(today)
                                .totalSeconds(0)
                                .build());

                int currentUsed = dailyLimit.getTotalSeconds() != null ? dailyLimit.getTotalSeconds() : 0;
                int allowedContentSeconds = Math.max(0, Math.min(contentDeltaSeconds, DAILY_MAX_CONTENT_SECONDS - currentUsed));

                if (allowedContentSeconds > 0) {
                    int newValid = session.getValidSeconds() + allowedContentSeconds;
                    session.setValidSeconds(newValid);

                    dailyLimit.setTotalSeconds(currentUsed + allowedContentSeconds);
                    userDailyAudioLimitRepository.save(dailyLimit);

                    if (dto != null && dto.getPositionSeconds() != null) {
                        AudioListenEvent event = AudioListenEvent.builder()
                                .id("ale-" + UUID.randomUUID().toString().substring(0, 8))
                                .session(session)
                                .positionSeconds(dto.getPositionSeconds())
                                .durationSeconds(allowedContentSeconds)
                                .recordedAt(now)
                                .build();
                        audioListenEventRepository.save(event);
                    }

                    int credited = session.getCreditedSeconds() != null ? session.getCreditedSeconds() : 0;
                    if (newValid >= MINIMUM_SESSION_THRESHOLD_SECONDS) {
                        int uncredited = newValid - credited;
                        if (uncredited > 0) {
                            creditStatsToAuthorAndBook(session.getBook().getId(), today, uncredited, credited == 0);
                            session.setCreditedSeconds(credited + uncredited);
                        }
                    }
                }
            }
            session.setEndedAt(now);
            audioSessionRepository.save(session);
        }

        if (dto != null && dto.getPositionSeconds() != null) {
            try {
                readingProgressService.updateProgress(userId, session.getBook().getId(), ReadingProgressRequestDto.builder()
                        .currentAudioChapterId(session.getChapterId())
                        .currentAudioTime(dto.getPositionSeconds())
                        .build());
            } catch (Exception e) {
                log.debug("Reading progress sync during session end skipped: {}", e.getMessage());
            }
        }

        log.info("Ended audio session={} for user={}, total validSeconds={}, creditedSeconds={}",
                sessionId, userId, session.getValidSeconds(), session.getCreditedSeconds());
        return toSessionResponseDto(session);
    }

    private void creditStatsToAuthorAndBook(String bookId, LocalDate today, int secondsToCredit, boolean isFirstListen) {
        if (secondsToCredit <= 0) return;

        // 1. Update book-level aggregate in audio_daily_stats
        Book book = bookRepository.findById(bookId).orElse(null);
        if (book != null) {
            AudioDailyStats bStats = audioDailyStatsRepository.findByBookIdAndStatDate(bookId, today)
                    .orElseGet(() -> AudioDailyStats.builder()
                            .id("ads-" + UUID.randomUUID().toString().substring(0, 8))
                            .book(book)
                            .statDate(today)
                            .totalSeconds(0L)
                            .listenCount(0)
                            .uniqueListeners(1)
                            .build());

            bStats.setTotalSeconds((bStats.getTotalSeconds() != null ? bStats.getTotalSeconds() : 0L) + secondsToCredit);
            if (isFirstListen) {
                bStats.setListenCount((bStats.getListenCount() != null ? bStats.getListenCount() : 0) + 1);
            }
            audioDailyStatsRepository.save(bStats);
        }

        // 2. Find the active author for this book and record to author_daily_book_stats
        List<AuthorBook> activeAssignments = authorBookRepository.findByBookIdAndIsActiveTrue(bookId);
        if (!activeAssignments.isEmpty()) {
            for (AuthorBook ab : activeAssignments) {
                recordAuthorDailyStat(ab.getAuthorId(), bookId, today, secondsToCredit, isFirstListen);
            }
        } else {
            // Fallback by author name match if not explicitly mapped
            if (book != null && book.getAuthor() != null && !book.getAuthor().isBlank()) {
                String matchName = book.getAuthor().trim().toLowerCase();
                authorRepository.findAll().stream()
                        .filter(a -> a.getDisplayName() != null && a.getDisplayName().trim().equalsIgnoreCase(matchName))
                        .findFirst()
                        .ifPresent(a -> recordAuthorDailyStat(a.getId(), bookId, today, secondsToCredit, isFirstListen));
            }
        }
    }

    private void recordAuthorDailyStat(String authorId, String bookId, LocalDate today, int secondsToCredit, boolean isFirstListen) {
        AuthorDailyBookStats aStats = authorDailyBookStatsRepository.findByAuthorIdAndBookIdAndStatDate(authorId, bookId, today)
                .orElseGet(() -> AuthorDailyBookStats.builder()
                        .id("adbs-" + UUID.randomUUID().toString().substring(0, 8))
                        .authorId(authorId)
                        .bookId(bookId)
                        .statDate(today)
                        .totalSeconds(0L)
                        .listenCount(0)
                        .build());

        aStats.setTotalSeconds((aStats.getTotalSeconds() != null ? aStats.getTotalSeconds() : 0L) + secondsToCredit);
        if (isFirstListen) {
            aStats.setListenCount((aStats.getListenCount() != null ? aStats.getListenCount() : 0) + 1);
        }
        authorDailyBookStatsRepository.save(aStats);
    }

    private AudioSessionResponseDto toSessionResponseDto(AudioSession session) {
        return AudioSessionResponseDto.builder()
                .sessionId(session.getId())
                .bookId(session.getBook() != null ? session.getBook().getId() : null)
                .chapterId(session.getChapterId())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .validSeconds(session.getValidSeconds())
                .build();
    }
}
