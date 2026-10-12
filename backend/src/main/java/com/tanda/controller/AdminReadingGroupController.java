package com.tanda.controller;

import com.tanda.dto.groups.ReadingGroupModerationActionDto;
import com.tanda.dto.groups.ReadingGroupResponseDto;
import com.tanda.service.ReadingGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/admin/reading-groups", "/api/admin/reading-groups"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReadingGroupController {

    private final ReadingGroupService groupService;

    @GetMapping
    public ResponseEntity<Page<ReadingGroupResponseDto>> getAdminGroups(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(groupService.getAdminGroups(status, pageable));
    }

    @GetMapping("/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount() {
        return ResponseEntity.ok(Map.of("pendingCount", groupService.getAdminPendingCount()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ReadingGroupResponseDto> approveGroup(
            @PathVariable String id,
            @RequestBody(required = false) ReadingGroupModerationActionDto dto
    ) {
        Boolean isVerified = dto != null ? dto.getIsVerified() : Boolean.FALSE;
        return ResponseEntity.ok(groupService.approveGroup(id, isVerified));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ReadingGroupResponseDto> rejectGroup(
            @PathVariable String id,
            @RequestBody(required = false) ReadingGroupModerationActionDto dto
    ) {
        String note = dto != null ? dto.getAdminNote() : null;
        return ResponseEntity.ok(groupService.rejectGroup(id, note));
    }

    @PostMapping("/{id}/warn")
    public ResponseEntity<ReadingGroupResponseDto> warnGroup(
            @PathVariable String id,
            @RequestBody(required = false) ReadingGroupModerationActionDto dto
    ) {
        String note = dto != null ? dto.getAdminNote() : null;
        return ResponseEntity.ok(groupService.warnGroup(id, note));
    }

    @PostMapping("/{id}/toggle-verify")
    public ResponseEntity<ReadingGroupResponseDto> toggleVerify(@PathVariable String id) {
        return ResponseEntity.ok(groupService.toggleGroupVerification(id));
    }
}
