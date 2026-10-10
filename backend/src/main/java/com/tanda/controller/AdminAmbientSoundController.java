package com.tanda.controller;

import com.tanda.dto.AmbientSoundRequestDto;
import com.tanda.dto.AmbientSoundResponseDto;
import com.tanda.service.AmbientSoundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/admin/ambient-sounds", "/api/v1/admin/ambient-sounds"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Ambient Sounds", description = "Админ: Парақта атмосфералық дыбыстарын басқару")
public class AdminAmbientSoundController {

    private final AmbientSoundService ambientSoundService;

    @GetMapping
    @Operation(summary = "Админ: Барлық атмосфералық дыбыстар тізімі")
    public ResponseEntity<List<AmbientSoundResponseDto>> getAllSounds() {
        return ResponseEntity.ok(ambientSoundService.getAllSoundsForAdmin());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Админ: Дыбыс мәліметін алу")
    public ResponseEntity<AmbientSoundResponseDto> getSoundById(@PathVariable Long id) {
        return ResponseEntity.ok(ambientSoundService.getSoundById(id));
    }

    @PostMapping
    @Operation(summary = "Админ: Жаңа атмосфералық дыбыс қосу")
    public ResponseEntity<AmbientSoundResponseDto> createSound(@Valid @RequestBody AmbientSoundRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ambientSoundService.createSound(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Админ: Дыбыс мәліметтерін жаңарту")
    public ResponseEntity<AmbientSoundResponseDto> updateSound(
            @PathVariable Long id,
            @Valid @RequestBody AmbientSoundRequestDto request) {
        return ResponseEntity.ok(ambientSoundService.updateSound(id, request));
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Админ: Дыбыстың активтілігін ауыстыру")
    public ResponseEntity<AmbientSoundResponseDto> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ambientSoundService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Админ: Дыбысты өшіру")
    public ResponseEntity<Void> deleteSound(@PathVariable Long id) {
        ambientSoundService.deleteSound(id);
        return ResponseEntity.noContent().build();
    }
}
