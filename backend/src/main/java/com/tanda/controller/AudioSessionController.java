package com.tanda.controller;

import com.tanda.dto.audio.AudioEndSessionRequestDto;
import com.tanda.dto.audio.AudioHeartbeatRequestDto;
import com.tanda.dto.audio.AudioSessionHeartbeatResponseDto;
import com.tanda.dto.audio.AudioSessionResponseDto;
import com.tanda.dto.audio.StartAudioSessionRequestDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.AudioSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audio/sessions")
@RequiredArgsConstructor
public class AudioSessionController {

    private final AudioSessionService audioSessionService;

    @PostMapping
    public ResponseEntity<AudioSessionResponseDto> startSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody StartAudioSessionRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AudioSessionResponseDto response = audioSessionService.startSession(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{sessionId}/heartbeat")
    public ResponseEntity<AudioSessionHeartbeatResponseDto> heartbeat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String sessionId,
            @Valid @RequestBody AudioHeartbeatRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(audioSessionService.heartbeat(principal.getId(), sessionId, request));
    }

    @PatchMapping("/{sessionId}/end")
    public ResponseEntity<AudioSessionResponseDto> endSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String sessionId,
            @RequestBody(required = false) @Valid AudioEndSessionRequestDto request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(audioSessionService.endSession(principal.getId(), sessionId, request));
    }
}
