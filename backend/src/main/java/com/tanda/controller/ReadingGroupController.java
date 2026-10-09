package com.tanda.controller;

import com.tanda.dto.groups.ReadingGroupCreateRequestDto;
import com.tanda.dto.groups.ReadingGroupDetailResponseDto;
import com.tanda.dto.groups.ReadingGroupInvitationResponseDto;
import com.tanda.dto.groups.ReadingGroupInviteRequestDto;
import com.tanda.dto.groups.ReadingGroupResponseDto;
import com.tanda.dto.groups.ReadingGroupUpdateRequestDto;
import com.tanda.dto.groups.UserSearchResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.ReadingGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/reading-groups", "/api/reading-groups"})
@RequiredArgsConstructor
public class ReadingGroupController {

    private final ReadingGroupService groupService;

    @PostMapping
    public ResponseEntity<ReadingGroupResponseDto> createGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ReadingGroupCreateRequestDto dto
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.createGroup(principal.getId(), dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReadingGroupResponseDto> updateGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody ReadingGroupUpdateRequestDto dto
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.updateGroup(principal.getId(), id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        groupService.deleteGroup(principal.getId(), id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Топ өшірілді"));
    }

    @GetMapping("/public")
    public ResponseEntity<Page<ReadingGroupResponseDto>> getPublicGroups(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String userId = principal != null ? principal.getId() : null;
        Pageable pageable = PageRequest.of(page, Math.min(50, size));
        return ResponseEntity.ok(groupService.getPublicGroups(query, pageable, userId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ReadingGroupResponseDto>> getMyGroups(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.getMyGroups(principal.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReadingGroupDetailResponseDto> getGroupDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        String userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(groupService.getGroupDetail(id, userId));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ReadingGroupResponseDto> joinPublicGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.joinPublicGroup(principal.getId(), id));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<Map<String, Object>> leaveGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        groupService.leaveGroup(principal.getId(), id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Топтан шықтыңыз"));
    }

    @PostMapping("/{id}/kick/{userId}")
    public ResponseEntity<Map<String, Object>> kickMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @PathVariable String userId
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        groupService.kickMember(principal.getId(), id, userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Мүше топтан шығарылды"));
    }

    @PostMapping("/{id}/invitations")
    public ResponseEntity<ReadingGroupInvitationResponseDto> sendInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody ReadingGroupInviteRequestDto dto
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.sendInvitation(principal.getId(), id, dto.getEmail()));
    }

    @GetMapping("/invitations/my")
    public ResponseEntity<List<ReadingGroupInvitationResponseDto>> getMyInvitations(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.getMyInvitations(principal.getId()));
    }

    @PostMapping("/invitations/{token}/accept")
    public ResponseEntity<ReadingGroupResponseDto> acceptInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String token
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.acceptInvitation(principal.getId(), token));
    }

    @PostMapping("/invitations/{token}/reject")
    public ResponseEntity<Map<String, Object>> rejectInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String token
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        groupService.rejectInvitation(principal.getId(), token);
        return ResponseEntity.ok(Map.of("success", true, "message", "Шақырудан бас тартылды"));
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<UserSearchResponseDto>> searchUsers(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String query
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(groupService.searchUsers(query));
    }
}
