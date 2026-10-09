package com.tanda.service;

import com.tanda.dto.tracker.ReadingSessionRequestDto;
import com.tanda.dto.tracker.ReadingSessionResponseDto;
import com.tanda.dto.tracker.UserReadingStatsResponseDto;
import com.tanda.entity.ReadingGroupMember;
import com.tanda.entity.ReadingSession;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.ReadingGroupMemberRepository;
import com.tanda.repository.ReadingSessionRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReadingTrackerService {

    private final ReadingSessionRepository sessionRepository;
    private final ReadingGroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReadingSessionResponseDto saveSession(String userId, ReadingSessionRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (dto.getStartedAt() == null || dto.getEndedAt() == null) {
            throw new BadRequestException("StartedAt and EndedAt are required");
        }

        if (dto.getEndedAt().isBefore(dto.getStartedAt())) {
            throw new BadRequestException("EndedAt cannot be before StartedAt");
        }

        long actualDuration = Duration.between(dto.getStartedAt(), dto.getEndedAt()).getSeconds();
        // Allow up to 10 seconds grace period for network delays/client timings
        if (dto.getDurationSeconds() > actualDuration + 10) {
            log.warn("Potential cheat detected for user {}: claimed {}s, actual {}s", userId, dto.getDurationSeconds(), actualDuration);
            dto.setDurationSeconds(Math.max(1, actualDuration));
        }

        ReadingSession session = ReadingSession.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .groupId(dto.getGroupId())
                .bookId(dto.getBookId())
                .bookTitle(dto.getBookTitle() != null ? dto.getBookTitle().trim() : null)
                .sessionType(dto.getSessionType() != null ? dto.getSessionType() : "STOPWATCH")
                .durationSeconds(dto.getDurationSeconds())
                .startedAt(dto.getStartedAt())
                .endedAt(dto.getEndedAt())
                .createdAt(OffsetDateTime.now())
                .build();

        sessionRepository.save(session);

        // Update user total reading seconds
        long newTotal = (user.getTotalReadingSeconds() != null ? user.getTotalReadingSeconds() : 0L) + dto.getDurationSeconds();
        user.setTotalReadingSeconds(newTotal);
        userRepository.save(user);

        // If groupId is provided, update group member monthly and total reading seconds
        if (dto.getGroupId() != null && !dto.getGroupId().isBlank()) {
            Optional<ReadingGroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(dto.getGroupId(), userId);
            if (memberOpt.isPresent()) {
                ReadingGroupMember member = memberOpt.get();
                if ("ACTIVE".equalsIgnoreCase(member.getStatus())) {
                    member.setMonthlyReadingSeconds((member.getMonthlyReadingSeconds() != null ? member.getMonthlyReadingSeconds() : 0L) + dto.getDurationSeconds());
                    member.setTotalReadingSeconds((member.getTotalReadingSeconds() != null ? member.getTotalReadingSeconds() : 0L) + dto.getDurationSeconds());
                    groupMemberRepository.save(member);
                }
            }
        }

        return toDto(session);
    }

    @Transactional(readOnly = true)
    public UserReadingStatsResponseDto getUserStats(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startOfToday = now.toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime startOfWeek = now.toLocalDate().minusDays(now.getDayOfWeek().getValue() - 1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        Long todaySeconds = sessionRepository.sumDurationSecondsByUserIdSince(userId, startOfToday);
        Long weekSeconds = sessionRepository.sumDurationSecondsByUserIdSince(userId, startOfWeek);
        Long monthSeconds = sessionRepository.sumDurationSecondsByUserIdSince(userId, startOfMonth);

        return UserReadingStatsResponseDto.builder()
                .totalReadingSeconds(user.getTotalReadingSeconds() != null ? user.getTotalReadingSeconds() : 0L)
                .todayReadingSeconds(todaySeconds != null ? todaySeconds : 0L)
                .weekReadingSeconds(weekSeconds != null ? weekSeconds : 0L)
                .monthReadingSeconds(monthSeconds != null ? monthSeconds : 0L)
                .allowGroupInvites(user.getAllowGroupInvites() != null ? user.getAllowGroupInvites() : true)
                .build();
    }

    @Transactional
    public void updateUserInviteSetting(String userId, boolean allow) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        user.setAllowGroupInvites(allow);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Page<ReadingSessionResponseDto> getUserSessions(String userId, Pageable pageable) {
        return sessionRepository.findByUserIdOrderByStartedAtDesc(userId, pageable).map(this::toDto);
    }

    private ReadingSessionResponseDto toDto(ReadingSession s) {
        return ReadingSessionResponseDto.builder()
                .id(s.getId())
                .userId(s.getUserId())
                .groupId(s.getGroupId())
                .bookId(s.getBookId())
                .bookTitle(s.getBookTitle())
                .sessionType(s.getSessionType())
                .durationSeconds(s.getDurationSeconds())
                .startedAt(s.getStartedAt())
                .endedAt(s.getEndedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
