package com.tanda.unit;

import com.tanda.dto.tracker.ReadingSessionRequestDto;
import com.tanda.dto.tracker.ReadingSessionResponseDto;
import com.tanda.dto.tracker.UserReadingStatsResponseDto;
import com.tanda.entity.ReadingGroupMember;
import com.tanda.entity.ReadingSession;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.repository.ReadingGroupMemberRepository;
import com.tanda.repository.ReadingSessionRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.ReadingTrackerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReadingTrackerServiceTest {

    @Mock
    private ReadingSessionRepository sessionRepository;

    @Mock
    private ReadingGroupMemberRepository groupMemberRepository;

    @Mock
    private UserRepository userRepository;

    private ReadingTrackerService trackerService;

    @BeforeEach
    void setUp() {
        trackerService = new ReadingTrackerService(sessionRepository, groupMemberRepository, userRepository);
    }

    @Test
    @DisplayName("Should save reading session and increment user total reading seconds")
    void shouldSaveSessionSuccessfully() {
        User user = User.builder()
                .id("user-1")
                .name("Asylkhan")
                .totalReadingSeconds(100L)
                .build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        OffsetDateTime start = OffsetDateTime.now().minusMinutes(30);
        OffsetDateTime end = OffsetDateTime.now();

        ReadingSessionRequestDto dto = ReadingSessionRequestDto.builder()
                .durationSeconds(1800L)
                .sessionType("TIMER")
                .bookTitle("Abai Joly")
                .startedAt(start)
                .endedAt(end)
                .build();

        ReadingSessionResponseDto result = trackerService.saveSession("user-1", dto);

        assertThat(result).isNotNull();
        assertThat(result.getDurationSeconds()).isEqualTo(1800L);
        assertThat(user.getTotalReadingSeconds()).isEqualTo(1900L);
        verify(sessionRepository).save(any(ReadingSession.class));
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("Should update group member monthly and total reading seconds if groupId is provided")
    void shouldUpdateGroupMemberSeconds() {
        User user = User.builder().id("user-1").totalReadingSeconds(0L).build();
        ReadingGroupMember member = ReadingGroupMember.builder()
                .id("mem-1")
                .groupId("group-1")
                .userId("user-1")
                .status("ACTIVE")
                .monthlyReadingSeconds(500L)
                .totalReadingSeconds(500L)
                .build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(groupMemberRepository.findByGroupIdAndUserId("group-1", "user-1")).thenReturn(Optional.of(member));

        OffsetDateTime start = OffsetDateTime.now().minusMinutes(20);
        OffsetDateTime end = OffsetDateTime.now();

        ReadingSessionRequestDto dto = ReadingSessionRequestDto.builder()
                .groupId("group-1")
                .durationSeconds(1200L)
                .startedAt(start)
                .endedAt(end)
                .build();

        trackerService.saveSession("user-1", dto);

        assertThat(member.getMonthlyReadingSeconds()).isEqualTo(1700L);
        assertThat(member.getTotalReadingSeconds()).isEqualTo(1700L);
        verify(groupMemberRepository).save(member);
    }

    @Test
    @DisplayName("Should throw BadRequestException if endedAt is before startedAt")
    void shouldThrowWhenEndedBeforeStarted() {
        User user = User.builder().id("user-1").build();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        OffsetDateTime now = OffsetDateTime.now();
        ReadingSessionRequestDto dto = ReadingSessionRequestDto.builder()
                .durationSeconds(100L)
                .startedAt(now)
                .endedAt(now.minusMinutes(10))
                .build();

        assertThatThrownBy(() -> trackerService.saveSession("user-1", dto))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Should toggle allowGroupInvites setting")
    void shouldToggleInviteSetting() {
        User user = User.builder().id("user-1").allowGroupInvites(true).build();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        trackerService.updateUserInviteSetting("user-1", false);

        assertThat(user.getAllowGroupInvites()).isFalse();
        verify(userRepository).save(user);
    }
}
