package com.tanda.controller;

import com.tanda.dto.system.SystemSettingsResponseDto;
import com.tanda.dto.system.UpdateSystemSettingsRequestDto;
import com.tanda.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1", "/api"})
@RequiredArgsConstructor
@Tag(name = "System Settings", description = "Global system configuration, open access mode and audio ads")
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    @GetMapping("/system/settings")
    @Operation(summary = "Get public system settings (open access mode, audio ad settings, pricing)")
    public ResponseEntity<SystemSettingsResponseDto> getPublicSettings() {
        return ResponseEntity.ok(systemSettingService.getSettings());
    }

    @PutMapping({"/admin/system/settings", "/admin/settings"})
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update system settings (Admin only)")
    public ResponseEntity<SystemSettingsResponseDto> updateSettings(
            @RequestBody UpdateSystemSettingsRequestDto request) {
        return ResponseEntity.ok(systemSettingService.updateSettings(request));
    }
}
