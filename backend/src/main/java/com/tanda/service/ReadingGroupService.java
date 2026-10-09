package com.tanda.service;

import com.tanda.dto.groups.ReadingGroupArchiveDto;
import com.tanda.dto.groups.ReadingGroupCreateRequestDto;
import com.tanda.dto.groups.ReadingGroupDetailResponseDto;
import com.tanda.dto.groups.ReadingGroupInvitationResponseDto;
import com.tanda.dto.groups.ReadingGroupMemberDto;
import com.tanda.dto.groups.ReadingGroupResponseDto;
import com.tanda.dto.groups.ReadingGroupUpdateRequestDto;
import com.tanda.dto.groups.UserSearchResponseDto;
import com.tanda.dto.premium.PremiumStatusResponseDto;
import com.tanda.entity.ReadingGroup;
import com.tanda.entity.ReadingGroupInvitation;
import com.tanda.entity.ReadingGroupMember;
import com.tanda.entity.ReadingGroupMonthlyArchive;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.exception.UnauthorizedException;
import com.tanda.repository.ReadingGroupInvitationRepository;
import com.tanda.repository.ReadingGroupMemberRepository;
import com.tanda.repository.ReadingGroupMonthlyArchiveRepository;
import com.tanda.repository.ReadingGroupRepository;
import com.tanda.repository.ReadingSessionRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReadingGroupService {

    private final ReadingGroupRepository groupRepository;
    private final ReadingGroupMemberRepository memberRepository;
    private final ReadingGroupInvitationRepository invitationRepository;
    private final ReadingGroupMonthlyArchiveRepository archiveRepository;
    private final ReadingSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final PremiumService premiumService;

    @Transactional
    public ReadingGroupResponseDto createGroup(String userId, ReadingGroupCreateRequestDto dto) {
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        PremiumStatusResponseDto premiumStatus = premiumService.getPremiumStatus(userId);
        boolean isPremium = Boolean.TRUE.equals(premiumStatus.getIsPremium());

        int maxAllowedGroups = isPremium ? 10 : 3;
        long existingCreatedGroups = groupRepository.countByCreatorId(userId);

        if (existingCreatedGroups >= maxAllowedGroups) {
            throw new BadRequestException("Сіздің тарифтегі топ ашу лимитіңіз (" + maxAllowedGroups + " топ) толған. Жүйені кеңейту үшін Премиумды жаңартыңыз.");
        }

        int maxMembers;
        if (Boolean.TRUE.equals(dto.getIsPublic())) {
            maxMembers = 500;
        } else {
            maxMembers = isPremium ? 50 : 5;
        }

        String groupId = UUID.randomUUID().toString();
        ReadingGroup group = ReadingGroup.builder()
                .id(groupId)
                .name(dto.getName().trim())
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .coverImageUrl(dto.getCoverImageUrl())
                .isPublic(Boolean.TRUE.equals(dto.getIsPublic()))
                .creatorId(userId)
                .maxMembers(maxMembers)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        groupRepository.save(group);

        // Add creator as member
        ReadingGroupMember creatorMember = ReadingGroupMember.builder()
                .id(UUID.randomUUID().toString())
                .groupId(groupId)
                .userId(userId)
                .role("CREATOR")
                .status("ACTIVE")
                .monthlyReadingSeconds(0L)
                .totalReadingSeconds(0L)
                .joinedAt(OffsetDateTime.now())
                .build();

        memberRepository.save(creatorMember);

        // Send invitations if provided
        if (dto.getInviteeEmails() != null && !dto.getInviteeEmails().isEmpty()) {
            for (String email : dto.getInviteeEmails()) {
                if (email != null && !email.trim().isBlank()) {
                    try {
                        sendInvitationInternal(creator, group, email.trim());
                    } catch (Exception e) {
                        log.warn("Could not send initial invite to {}: {}", email, e.getMessage());
                    }
                }
            }
        }

        return toDto(group, creator, 1L, true, "CREATOR", 0L, 0L);
    }

    @Transactional
    public ReadingGroupResponseDto updateGroup(String userId, String groupId, ReadingGroupUpdateRequestDto dto) {
        ReadingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        ReadingGroupMember member = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));

        if (!"CREATOR".equalsIgnoreCase(member.getRole()) && !"ADMIN".equalsIgnoreCase(member.getRole())) {
            throw new UnauthorizedException("Only creator or admin can update group settings");
        }

        if (dto.getName() != null && !dto.getName().trim().isBlank()) {
            group.setName(dto.getName().trim());
        }
        if (dto.getDescription() != null) {
            group.setDescription(dto.getDescription().trim());
        }
        if (dto.getCoverImageUrl() != null) {
            group.setCoverImageUrl(dto.getCoverImageUrl());
        }
        if (dto.getIsPublic() != null) {
            group.setIsPublic(dto.getIsPublic());
            if (dto.getIsPublic()) {
                group.setMaxMembers(500);
            }
        }

        group.setUpdatedAt(OffsetDateTime.now());
        groupRepository.save(group);

        User creator = userRepository.findById(group.getCreatorId()).orElse(null);
        long memberCount = memberRepository.countByGroupIdAndStatus(groupId, "ACTIVE");

        return toDto(group, creator, memberCount, true, member.getRole(), member.getMonthlyReadingSeconds(), member.getTotalReadingSeconds());
    }

    @Transactional
    public void deleteGroup(String userId, String groupId) {
        ReadingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        if (!group.getCreatorId().equals(userId)) {
            throw new UnauthorizedException("Only group creator can delete this group");
        }

        groupRepository.delete(group);
    }

    @Transactional(readOnly = true)
    public Page<ReadingGroupResponseDto> getPublicGroups(String query, Pageable pageable, String currentUserId) {
        Page<ReadingGroup> groups;
        if (query != null && !query.trim().isBlank()) {
            groups = groupRepository.searchPublicGroups(query.trim(), pageable);
        } else {
            groups = groupRepository.findByIsPublicTrueOrderByCreatedAtDesc(pageable);
        }

        return groups.map(g -> {
            User creator = userRepository.findById(g.getCreatorId()).orElse(null);
            long memberCount = memberRepository.countByGroupIdAndStatus(g.getId(), "ACTIVE");
            Optional<ReadingGroupMember> myMember = currentUserId != null ?
                    memberRepository.findByGroupIdAndUserId(g.getId(), currentUserId) : Optional.empty();

            boolean isMember = myMember.isPresent() && "ACTIVE".equalsIgnoreCase(myMember.get().getStatus());
            String myRole = myMember.map(ReadingGroupMember::getRole).orElse(null);
            Long myMonthly = myMember.map(ReadingGroupMember::getMonthlyReadingSeconds).orElse(0L);
            Long myTotal = myMember.map(ReadingGroupMember::getTotalReadingSeconds).orElse(0L);

            return toDto(g, creator, memberCount, isMember, myRole, myMonthly, myTotal);
        });
    }

    @Transactional(readOnly = true)
    public List<ReadingGroupResponseDto> getMyGroups(String currentUserId) {
        List<ReadingGroupMember> memberships = memberRepository.findByUserIdAndStatusOrderByJoinedAtDesc(currentUserId, "ACTIVE");
        if (memberships.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> groupIds = memberships.stream().map(ReadingGroupMember::getGroupId).collect(Collectors.toList());
        Map<String, ReadingGroup> groupMap = groupRepository.findAllById(groupIds).stream()
                .collect(Collectors.toMap(ReadingGroup::getId, g -> g));

        List<ReadingGroupResponseDto> result = new ArrayList<>();
        for (ReadingGroupMember m : memberships) {
            ReadingGroup g = groupMap.get(m.getGroupId());
            if (g != null) {
                User creator = userRepository.findById(g.getCreatorId()).orElse(null);
                long memberCount = memberRepository.countByGroupIdAndStatus(g.getId(), "ACTIVE");
                result.add(toDto(g, creator, memberCount, true, m.getRole(), m.getMonthlyReadingSeconds(), m.getTotalReadingSeconds()));
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public ReadingGroupDetailResponseDto getGroupDetail(String groupId, String currentUserId) {
        ReadingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        User creator = userRepository.findById(group.getCreatorId()).orElse(null);
        long memberCount = memberRepository.countByGroupIdAndStatus(groupId, "ACTIVE");

        Optional<ReadingGroupMember> currentMemberOpt = currentUserId != null ?
                memberRepository.findByGroupIdAndUserId(groupId, currentUserId) : Optional.empty();

        boolean isMember = currentMemberOpt.isPresent() && "ACTIVE".equalsIgnoreCase(currentMemberOpt.get().getStatus());
        String myRole = currentMemberOpt.map(ReadingGroupMember::getRole).orElse(null);
        Long myMonthly = currentMemberOpt.map(ReadingGroupMember::getMonthlyReadingSeconds).orElse(0L);
        Long myTotal = currentMemberOpt.map(ReadingGroupMember::getTotalReadingSeconds).orElse(0L);

        // Fetch sorted members by monthly reading seconds
        List<ReadingGroupMember> members = memberRepository.findByGroupIdAndStatusOrderByMonthlyReadingSecondsDesc(groupId, "ACTIVE");
        List<String> userIds = members.stream().map(ReadingGroupMember::getUserId).collect(Collectors.toList());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        ZoneId kzZone = ZoneId.of("Asia/Almaty");
        OffsetDateTime startOfToday = LocalDate.now(kzZone).atStartOfDay(kzZone).toOffsetDateTime();

        List<Object[]> todayRows = sessionRepository.sumDurationSecondsByGroupIdGroupedByUser(groupId, startOfToday);
        Map<String, Long> todayMap = new HashMap<>();
        for (Object[] row : todayRows) {
            String uId = (String) row[0];
            Long sec = ((Number) row[1]).longValue();
            todayMap.put(uId, sec);
        }

        AtomicInteger rankCounter = new AtomicInteger(1);
        List<ReadingGroupMemberDto> memberDtos = members.stream().map(m -> {
            User u = userMap.get(m.getUserId());
            Long todaySec = todayMap.getOrDefault(m.getUserId(), 0L);
            return ReadingGroupMemberDto.builder()
                    .id(m.getId())
                    .userId(m.getUserId())
                    .name(u != null ? u.getName() : "Оқырман")
                    .username(u != null ? u.getUsername() : null)
                    .avatarUrl(u != null ? u.getAvatarUrl() : null)
                    .role(m.getRole())
                    .todayReadingSeconds(todaySec)
                    .monthlyReadingSeconds(m.getMonthlyReadingSeconds())
                    .totalReadingSeconds(m.getTotalReadingSeconds())
                    .rank(rankCounter.getAndIncrement())
                    .joinedAt(m.getJoinedAt())
                    .build();
        }).collect(Collectors.toList());

        // Fetch monthly archives
        List<ReadingGroupMonthlyArchive> archives = archiveRepository.findByGroupIdOrderByYearMonthDesc(groupId);
        List<ReadingGroupArchiveDto> archiveDtos = archives.stream().map(a -> ReadingGroupArchiveDto.builder()
                .id(a.getId())
                .yearMonth(a.getYearMonth())
                .winnerUserId(a.getWinnerUserId())
                .winnerName(a.getWinnerName())
                .winnerReadingSeconds(a.getWinnerReadingSeconds())
                .totalGroupReadingSeconds(a.getTotalGroupReadingSeconds())
                .createdAt(a.getCreatedAt())
                .build()).collect(Collectors.toList());

        Long myToday = (currentUserId != null && isMember) ? todayMap.getOrDefault(currentUserId, 0L) : 0L;

        return ReadingGroupDetailResponseDto.builder()
                .group(toDto(group, creator, memberCount, isMember, myRole, myToday, myMonthly, myTotal))
                .members(memberDtos)
                .archives(archiveDtos)
                .build();
    }

    @Transactional
    public ReadingGroupResponseDto joinPublicGroup(String userId, String groupId) {
        ReadingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        if (!Boolean.TRUE.equals(group.getIsPublic())) {
            throw new BadRequestException("Бұл жабық топ. Тек шақыру сілтемесі арқылы ғана қосылуға болады.");
        }

        Optional<ReadingGroupMember> existingMemberOpt = memberRepository.findByGroupIdAndUserId(groupId, userId);
        if (existingMemberOpt.isPresent()) {
            ReadingGroupMember existing = existingMemberOpt.get();
            if ("BANNED".equalsIgnoreCase(existing.getStatus())) {
                throw new BadRequestException("Сіз бұл топтан шығарылғансыз, қайта қосыла алмайсыз.");
            }
            if ("ACTIVE".equalsIgnoreCase(existing.getStatus())) {
                return getGroupDetail(groupId, userId).getGroup();
            }
            // If was left, reactivate
            existing.setStatus("ACTIVE");
            existing.setMonthlyReadingSeconds(0L);
            existing.setJoinedAt(OffsetDateTime.now());
            memberRepository.save(existing);
            return getGroupDetail(groupId, userId).getGroup();
        }

        long activeCount = memberRepository.countByGroupIdAndStatus(groupId, "ACTIVE");
        if (activeCount >= group.getMaxMembers()) {
            throw new BadRequestException("Топта орын толған (максимум " + group.getMaxMembers() + " адам).");
        }

        ReadingGroupMember newMember = ReadingGroupMember.builder()
                .id(UUID.randomUUID().toString())
                .groupId(groupId)
                .userId(userId)
                .role("MEMBER")
                .status("ACTIVE")
                .monthlyReadingSeconds(0L)
                .totalReadingSeconds(0L)
                .joinedAt(OffsetDateTime.now())
                .build();

        memberRepository.save(newMember);
        return getGroupDetail(groupId, userId).getGroup();
    }

    @Transactional
    public void leaveGroup(String userId, String groupId) {
        ReadingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        ReadingGroupMember member = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new BadRequestException("You are not a member of this group"));

        if ("CREATOR".equalsIgnoreCase(member.getRole())) {
            long memberCount = memberRepository.countByGroupIdAndStatus(groupId, "ACTIVE");
            if (memberCount > 1) {
                // Transfer ownership to next active member
                List<ReadingGroupMember> otherMembers = memberRepository.findByGroupIdAndStatusOrderByMonthlyReadingSecondsDesc(groupId, "ACTIVE")
                        .stream().filter(m -> !m.getUserId().equals(userId)).collect(Collectors.toList());
                if (!otherMembers.isEmpty()) {
                    ReadingGroupMember nextOwner = otherMembers.get(0);
                    nextOwner.setRole("CREATOR");
                    group.setCreatorId(nextOwner.getUserId());
                    memberRepository.save(nextOwner);
                    groupRepository.save(group);
                }
            } else {
                // Last person leaving deletes the group
                groupRepository.delete(group);
                return;
            }
        }

        memberRepository.delete(member);
    }

    @Transactional
    public void kickMember(String currentUserId, String groupId, String targetUserId) {
        ReadingGroupMember actor = memberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new UnauthorizedException("You are not in this group"));

        if (!"CREATOR".equalsIgnoreCase(actor.getRole()) && !"ADMIN".equalsIgnoreCase(actor.getRole())) {
            throw new UnauthorizedException("Only creator or admin can kick members");
        }

        if (currentUserId.equals(targetUserId)) {
            throw new BadRequestException("Cannot kick yourself");
        }

        ReadingGroupMember target = memberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target member not found"));

        if ("CREATOR".equalsIgnoreCase(target.getRole())) {
            throw new BadRequestException("Cannot kick the group creator");
        }

        target.setStatus("BANNED");
        memberRepository.save(target);
    }

    @Transactional
    public ReadingGroupInvitationResponseDto sendInvitation(String currentUserId, String groupId, String email) {
        User inviter = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUserId));

        ReadingGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));

        ReadingGroupMember inviterMember = memberRepository.findByGroupIdAndUserId(groupId, currentUserId)
                .orElseThrow(() -> new UnauthorizedException("You must be a member of this group to invite others"));

        return sendInvitationInternal(inviter, group, email);
    }

    private ReadingGroupInvitationResponseDto sendInvitationInternal(User inviter, ReadingGroup group, String email) {
        String cleanEmail = email.trim().toLowerCase();

        User invitee = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Бұл email-мен оқырман тіркелмеген: " + cleanEmail));

        if (Boolean.FALSE.equals(invitee.getAllowGroupInvites())) {
            throw new BadRequestException("Бұл оқырман топтық шақыруларды баптауларында өшіріп тастаған.");
        }

        // Check if already an active member
        if (memberRepository.existsByGroupIdAndUserIdAndStatus(group.getId(), invitee.getId(), "ACTIVE")) {
            throw new BadRequestException("Оқырман бұл топта бар.");
        }

        // Check member limit
        long activeMembers = memberRepository.countByGroupIdAndStatus(group.getId(), "ACTIVE");
        if (activeMembers >= group.getMaxMembers()) {
            throw new BadRequestException("Топтағы орын лимиті толған (" + group.getMaxMembers() + " адам).");
        }

        // Check 24-hour rejection cooldown
        OffsetDateTime oneDayAgo = OffsetDateTime.now().minusHours(24);
        List<ReadingGroupInvitation> recentRejections = invitationRepository.findRecentRejections(group.getId(), cleanEmail, oneDayAgo);
        if (!recentRejections.isEmpty()) {
            throw new BadRequestException("Бұл оқырман шақырудан бас тартқан. 24 сағаттан кейін ғана қайта шақыра аласыз.");
        }

        // Check if pending invitation already exists
        Optional<ReadingGroupInvitation> pendingOpt = invitationRepository.findByGroupIdAndInviteeEmailAndStatus(group.getId(), cleanEmail, "PENDING");
        if (pendingOpt.isPresent()) {
            return toInvitationDto(pendingOpt.get(), group, inviter);
        }

        ReadingGroupInvitation invitation = ReadingGroupInvitation.builder()
                .id(UUID.randomUUID().toString())
                .groupId(group.getId())
                .inviterId(inviter.getId())
                .inviteeId(invitee.getId())
                .inviteeEmail(cleanEmail)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status("PENDING")
                .createdAt(OffsetDateTime.now())
                .expiresAt(OffsetDateTime.now().plusDays(7))
                .build();

        invitationRepository.save(invitation);

        return toInvitationDto(invitation, group, inviter);
    }

    @Transactional
    public ReadingGroupResponseDto acceptInvitation(String currentUserId, String token) {
        ReadingGroupInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Шақыру табылмады"));

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw new BadRequestException("Бұл шақыру белсенді емес немесе қолданылған.");
        }

        if (invitation.getExpiresAt().isBefore(OffsetDateTime.now())) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);
            throw new BadRequestException("Шақырудың мерзімі біткен.");
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUserId));

        if (!currentUser.getEmail().equalsIgnoreCase(invitation.getInviteeEmail()) &&
                (invitation.getInviteeId() != null && !invitation.getInviteeId().equals(currentUserId))) {
            throw new UnauthorizedException("Бұл шақыру басқа қолданушыға арналған.");
        }

        ReadingGroup group = groupRepository.findById(invitation.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Топ табылмады немесе өшірілген"));

        long activeCount = memberRepository.countByGroupIdAndStatus(group.getId(), "ACTIVE");
        if (activeCount >= group.getMaxMembers()) {
            throw new BadRequestException("Топтағы орын толған (" + group.getMaxMembers() + " адам).");
        }

        Optional<ReadingGroupMember> memberOpt = memberRepository.findByGroupIdAndUserId(group.getId(), currentUserId);
        ReadingGroupMember member;
        if (memberOpt.isPresent()) {
            member = memberOpt.get();
            member.setStatus("ACTIVE");
            member.setMonthlyReadingSeconds(0L);
            member.setJoinedAt(OffsetDateTime.now());
        } else {
            member = ReadingGroupMember.builder()
                    .id(UUID.randomUUID().toString())
                    .groupId(group.getId())
                    .userId(currentUserId)
                    .role("MEMBER")
                    .status("ACTIVE")
                    .monthlyReadingSeconds(0L)
                    .totalReadingSeconds(0L)
                    .joinedAt(OffsetDateTime.now())
                    .build();
        }
        memberRepository.save(member);

        invitation.setStatus("ACCEPTED");
        invitationRepository.save(invitation);

        return getGroupDetail(group.getId(), currentUserId).getGroup();
    }

    @Transactional
    public void rejectInvitation(String currentUserId, String token) {
        ReadingGroupInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Шақыру табылмады"));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUserId));

        if (!currentUser.getEmail().equalsIgnoreCase(invitation.getInviteeEmail()) &&
                (invitation.getInviteeId() != null && !invitation.getInviteeId().equals(currentUserId))) {
            throw new UnauthorizedException("Бұл шақыру сізге тиесілі емес.");
        }

        invitation.setStatus("REJECTED");
        invitation.setRejectedAt(OffsetDateTime.now());
        invitationRepository.save(invitation);
    }

    @Transactional(readOnly = true)
    public List<ReadingGroupInvitationResponseDto> getMyInvitations(String currentUserId) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUserId));

        List<ReadingGroupInvitation> list = invitationRepository.findByInviteeEmailAndStatusOrderByCreatedAtDesc(user.getEmail().toLowerCase(), "PENDING");
        if (list.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> groupIds = list.stream().map(ReadingGroupInvitation::getGroupId).collect(Collectors.toList());
        List<String> inviterIds = list.stream().map(ReadingGroupInvitation::getInviterId).collect(Collectors.toList());

        Map<String, ReadingGroup> groupMap = groupRepository.findAllById(groupIds).stream().collect(Collectors.toMap(ReadingGroup::getId, g -> g));
        Map<String, User> inviterMap = userRepository.findAllById(inviterIds).stream().collect(Collectors.toMap(User::getId, u -> u));

        return list.stream().map(i -> toInvitationDto(i, groupMap.get(i.getGroupId()), inviterMap.get(i.getInviterId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserSearchResponseDto> searchUsers(String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        return userRepository.searchClients(query.trim()).stream()
                .limit(10)
                .map(u -> UserSearchResponseDto.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .username(u.getUsername())
                        .email(u.getEmail())
                        .avatarUrl(u.getAvatarUrl())
                        .allowGroupInvites(u.getAllowGroupInvites() != null ? u.getAllowGroupInvites() : true)
                        .build())
                .collect(Collectors.toList());
    }

    @Scheduled(cron = "0 0 0 1 * ?") // 00:00 on the 1st day of every month
    @Transactional
    public void archiveMonthlyLeaderboardsAndReset() {
        log.info("Starting monthly reading groups archive & reset job...");
        String previousMonth = LocalDate.now().minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM"));

        List<ReadingGroup> groups = groupRepository.findAll();
        for (ReadingGroup group : groups) {
            try {
                List<ReadingGroupMember> members = memberRepository.findByGroupIdAndStatusOrderByMonthlyReadingSecondsDesc(group.getId(), "ACTIVE");
                if (!members.isEmpty() && members.get(0).getMonthlyReadingSeconds() > 0) {
                    ReadingGroupMember winner = members.get(0);
                    User winnerUser = userRepository.findById(winner.getUserId()).orElse(null);
                    long totalSeconds = members.stream().mapToLong(ReadingGroupMember::getMonthlyReadingSeconds).sum();

                    ReadingGroupMonthlyArchive archive = ReadingGroupMonthlyArchive.builder()
                            .id(UUID.randomUUID().toString())
                            .groupId(group.getId())
                            .yearMonth(previousMonth)
                            .winnerUserId(winner.getUserId())
                            .winnerName(winnerUser != null ? winnerUser.getName() : "Оқырман")
                            .winnerReadingSeconds(winner.getMonthlyReadingSeconds())
                            .totalGroupReadingSeconds(totalSeconds)
                            .createdAt(OffsetDateTime.now())
                            .build();

                    archiveRepository.save(archive);
                }
            } catch (Exception e) {
                log.error("Failed to archive group {}: {}", group.getId(), e.getMessage());
            }
        }

        // Reset monthly reading seconds
        memberRepository.resetAllMonthlyReadingSeconds();
        log.info("Monthly reading groups reset complete for month: {}", previousMonth);
    }

    private ReadingGroupResponseDto toDto(ReadingGroup g, User creator, long memberCount, boolean isMember, String myRole, Long myToday, Long myMonthly, Long myTotal) {
        return ReadingGroupResponseDto.builder()
                .id(g.getId())
                .name(g.getName())
                .description(g.getDescription())
                .coverImageUrl(g.getCoverImageUrl())
                .isPublic(g.getIsPublic())
                .creatorId(g.getCreatorId())
                .creatorName(creator != null ? creator.getName() : null)
                .creatorAvatarUrl(creator != null ? creator.getAvatarUrl() : null)
                .maxMembers(g.getMaxMembers())
                .memberCount(memberCount)
                .isMember(isMember)
                .myRole(myRole)
                .myTodaySeconds(myToday != null ? myToday : 0L)
                .myMonthlySeconds(myMonthly != null ? myMonthly : 0L)
                .myTotalSeconds(myTotal != null ? myTotal : 0L)
                .createdAt(g.getCreatedAt())
                .build();
    }

    private ReadingGroupResponseDto toDto(ReadingGroup g, User creator, long memberCount, boolean isMember, String myRole, Long myMonthly, Long myTotal) {
        return toDto(g, creator, memberCount, isMember, myRole, 0L, myMonthly, myTotal);
    }

    private ReadingGroupInvitationResponseDto toInvitationDto(ReadingGroupInvitation inv, ReadingGroup g, User inviter) {
        return ReadingGroupInvitationResponseDto.builder()
                .id(inv.getId())
                .groupId(inv.getGroupId())
                .groupName(g != null ? g.getName() : null)
                .groupDescription(g != null ? g.getDescription() : null)
                .groupCoverImageUrl(g != null ? g.getCoverImageUrl() : null)
                .inviterId(inv.getInviterId())
                .inviterName(inviter != null ? inviter.getName() : null)
                .inviterAvatarUrl(inviter != null ? inviter.getAvatarUrl() : null)
                .inviteeEmail(inv.getInviteeEmail())
                .token(inv.getToken())
                .status(inv.getStatus())
                .createdAt(inv.getCreatedAt())
                .expiresAt(inv.getExpiresAt())
                .build();
    }
}
