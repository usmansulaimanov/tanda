package com.tanda.controller;

import com.tanda.dto.admin.ManagerRequestDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.service.ManagerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/managers", "/api/admin/managers"})
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ManagerController {

    private final ManagerService managerService;

    @GetMapping
    public ResponseEntity<List<UserResponseDto>> getAllManagers() {
        return ResponseEntity.ok(managerService.getAllManagers());
    }

    @PostMapping
    public ResponseEntity<UserResponseDto> createManager(@Valid @RequestBody ManagerRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(managerService.createManager(request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserResponseDto> updateManager(
            @PathVariable String id,
            @Valid @RequestBody ManagerRequestDto request
    ) {
        return ResponseEntity.ok(managerService.updateManager(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteManager(@PathVariable String id) {
        managerService.deleteManager(id);
        return ResponseEntity.noContent().build();
    }
}
