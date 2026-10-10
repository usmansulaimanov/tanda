package com.tanda.controller;

import com.tanda.dto.AmbientSoundResponseDto;
import com.tanda.service.AmbientSoundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/paraqta/ambient-sounds", "/api/v1/paraqta/ambient-sounds"})
@RequiredArgsConstructor
@Tag(name = "Ambient Sounds", description = "Парақта оқу фонының дыбыстары")
public class AmbientSoundController {

    private final AmbientSoundService ambientSoundService;

    @GetMapping
    @Operation(summary = "Барлық белсенді атмосфералық дыбыстарды алу")
    public ResponseEntity<List<AmbientSoundResponseDto>> getActiveSounds() {
        return ResponseEntity.ok(ambientSoundService.getActiveSounds());
    }
}
