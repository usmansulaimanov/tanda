package com.tanda.service;

import com.tanda.dto.audio.AudioEndSessionRequestDto;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.AudioSessionHeartbeatResponseDto;
import com.tanda.dto.audio.AudioSessionResponseDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.shelf.UserBookRequestDto;
import com.tanda.entity.AudioListenEvent;
import com.tanda.entity.AudioSession;
import com.tanda.entity.Book;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AudioListenEventRepository;
import com.tanda.repository.AudioSessionRepository;
import com.tanda.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioSessionService {

    private final AudioSessionRepository audioSessionRepository;
    private final AudioListenEventRepository audioListenEventRepository;
    private final BookRepository bookRepository;
    private final UserBookService userBookService;
    private final ReadingProgressService readingProgressService;

    @Transactional
    public AudioSessionResponseDto startSession(String userId, StartAudioSessionRequestDto dto) {
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

        if (session.getEndedAt() != null) {
            return AudioSessionHeartbeatResponseDto.builder()
                    .sessionId(sessionId)
                    .validSeconds(session.getValidSeconds())
                    .positionSeconds(dto.getPositionSeconds())
                    .build();
        }

        OffsetDateTime now = OffsetDateTime.now();
        long wallClockDiff = Duration.between(session.getLastHeartbeatAt(), now).getSeconds();

        if (wallClockDiff > 0) {
            // Anti-cheat: Maximum acceptable delta between consecutive heartbeats is 45 seconds
            int deltaSeconds = (int) Math.min(wallClockDiff, 45);
            session.setValidSeconds(session.getValidSeconds() + deltaSeconds);

            AudioListenEvent event = AudioListenEvent.builder()
                    .id("ale-" + UUID.randomUUID().toString().substring(0, 8))
                    .session(session)
                    .positionSeconds(dto.getPositionSeconds())
                    .durationSeconds(deltaSeconds)
                    .recordedAt(now)
                    .build();
            audioListenEventRepository.save(event);
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

        return AudioSessionHeartbeatResponseDto.builder()
                .sessionId(sessionId)
                .validSeconds(session.getValidSeconds())
                .positionSeconds(dto.getPositionSeconds())
                .build();
    }

    @Transactional
    public AudioSessionResponseDto endSession(String userId, String sessionId, AudioEndSessionRequestDto dto) {
        AudioSession session = audioSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AudioSession", "id", sessionId));

        if (!session.getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied to audio session: " + sessionId);
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (session.getEndedAt() == null) {
            long wallClockDiff = Duration.between(session.getLastHeartbeatAt(), now).getSeconds();
            if (wallClockDiff > 0 && wallClockDiff <= 45) {
                int deltaSeconds = (int) wallClockDiff;
                session.setValidSeconds(session.getValidSeconds() + deltaSeconds);

                if (dto != null && dto.getPositionSeconds() != null) {
                    AudioListenEvent event = AudioListenEvent.builder()
                            .id("ale-" + UUID.randomUUID().toString().substring(0, 8))
                            .session(session)
                            .positionSeconds(dto.getPositionSeconds())
                            .durationSeconds(deltaSeconds)
                            .recordedAt(now)
                            .build();
                    audioListenEventRepository.save(event);
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

        log.info("Ended audio session={} for user={}, total validSeconds={}", sessionId, userId, session.getValidSeconds());
        return toSessionResponseDto(session);
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
