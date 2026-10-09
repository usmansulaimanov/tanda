package com.tanda.unit;

import com.tanda.dto.groups.ReadingGroupCreateRequestDto;
import com.tanda.dto.groups.ReadingGroupResponseDto;
import com.tanda.dto.premium.PremiumStatusResponseDto;
import com.tanda.entity.ReadingGroup;
import com.tanda.entity.ReadingGroupInvitation;
import com.tanda.entity.ReadingGroupMember;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.repository.ReadingGroupInvitationRepository;
import com.tanda.repository.ReadingGroupMemberRepository;
import com.tanda.repository.ReadingGroupMonthlyArchiveRepository;
import com.tanda.repository.ReadingGroupRepository;
import com.tanda.repository.ReadingSessionRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.PremiumService;
import com.tanda.service.ReadingGroupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReadingGroupServiceTest {

    @Mock
    private ReadingGroupRepository groupRepository;

    @Mock
    private ReadingGroupMemberRepository memberRepository;

    @Mock
    private ReadingGroupInvitationRepository invitationRepository;

    @Mock
    private ReadingGroupMonthlyArchiveRepository archiveRepository;

    @Mock
    private ReadingSessionRepository sessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PremiumService premiumService;

    private ReadingGroupService groupService;

    @BeforeEach
    void setUp() {
        groupService = new ReadingGroupService(
                groupRepository,
                memberRepository,
                invitationRepository,
                archiveRepository,
                sessionRepository,
                userRepository,
                premiumService
        );
    }

    @Test
    @DisplayName("Free user should create group when below limit of 3 groups")
    void shouldCreateGroupForFreeUser() {
        User user = User.builder().id("user-1").name("Sherkhan").build();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(premiumService.getPremiumStatus("user-1")).thenReturn(PremiumStatusResponseDto.builder().isPremium(false).build());
        when(groupRepository.countByCreatorId("user-1")).thenReturn(1L);

        ReadingGroupCreateRequestDto dto = ReadingGroupCreateRequestDto.builder()
                .name("Abai Club")
                .description("Desc")
                .isPublic(false)
                .build();

        ReadingGroupResponseDto result = groupService.createGroup("user-1", dto);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Abai Club");
        assertThat(result.getMaxMembers()).isEqualTo(5); // Free tier = 5 members
        verify(groupRepository).save(any(ReadingGroup.class));
        verify(memberRepository).save(any(ReadingGroupMember.class));
    }

    @Test
    @DisplayName("Free user should be blocked from creating 4th group")
    void shouldBlockFreeUserExceedingLimit() {
        User user = User.builder().id("user-1").build();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(premiumService.getPremiumStatus("user-1")).thenReturn(PremiumStatusResponseDto.builder().isPremium(false).build());
        when(groupRepository.countByCreatorId("user-1")).thenReturn(3L);

        ReadingGroupCreateRequestDto dto = ReadingGroupCreateRequestDto.builder()
                .name("New Club")
                .build();

        assertThatThrownBy(() -> groupService.createGroup("user-1", dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("лимитіңіз (3 топ) толған");
    }

    @Test
    @DisplayName("Premium user can create up to 10 groups with 50 members")
    void shouldAllowPremiumUserMoreGroups() {
        User user = User.builder().id("user-1").name("Sherkhan").build();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(premiumService.getPremiumStatus("user-1")).thenReturn(PremiumStatusResponseDto.builder().isPremium(true).build());
        when(groupRepository.countByCreatorId("user-1")).thenReturn(5L);

        ReadingGroupCreateRequestDto dto = ReadingGroupCreateRequestDto.builder()
                .name("Premium Club")
                .isPublic(false)
                .build();

        ReadingGroupResponseDto result = groupService.createGroup("user-1", dto);

        assertThat(result).isNotNull();
        assertThat(result.getMaxMembers()).isEqualTo(50); // Premium = 50 members
    }

    @Test
    @DisplayName("Sending invitation should fail if invitee turned off invitations")
    void shouldFailIfInviteeTurnedOffInvites() {
        User inviter = User.builder().id("user-1").build();
        ReadingGroup group = ReadingGroup.builder().id("group-1").maxMembers(5).build();
        ReadingGroupMember member = ReadingGroupMember.builder().groupId("group-1").userId("user-1").build();
        User invitee = User.builder().id("user-2").email("asylkhan@gmail.com").allowGroupInvites(false).build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(inviter));
        when(groupRepository.findById("group-1")).thenReturn(Optional.of(group));
        when(memberRepository.findByGroupIdAndUserId("group-1", "user-1")).thenReturn(Optional.of(member));
        when(userRepository.findByEmail("asylkhan@gmail.com")).thenReturn(Optional.of(invitee));

        assertThatThrownBy(() -> groupService.sendInvitation("user-1", "group-1", "asylkhan@gmail.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("шақыруларды баптауларында өшіріп тастаған");
    }
}
