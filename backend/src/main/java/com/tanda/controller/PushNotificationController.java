package com.tanda.controller;

import com.tanda.dto.push.PushPayloadDto;
import com.tanda.dto.push.PushSubscriptionRequestDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.PushNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PushNotificationController {

    private final PushNotificationService pushNotificationService;

    @GetMapping({"/api/v1/push/public-key", "/api/push/public-key"})
    public ResponseEntity<Map<String, String>> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", pushNotificationService.getVapidPublicKey()));
    }

    @PostMapping({"/api/v1/push/subscribe", "/api/push/subscribe"})
    public ResponseEntity<Map<String, String>> subscribe(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PushSubscriptionRequestDto dto
    ) {
        String userId = principal != null ? principal.getId() : null;
        pushNotificationService.subscribe(userId, dto);
        return ResponseEntity.ok(Map.of("message", "Subscribed successfully"));
    }

    @PostMapping({"/api/v1/push/unsubscribe", "/api/push/unsubscribe"})
    public ResponseEntity<Map<String, String>> unsubscribe(
            @RequestBody Map<String, String> body
    ) {
        String endpoint = body.get("endpoint");
        pushNotificationService.unsubscribe(endpoint);
        return ResponseEntity.ok(Map.of("message", "Unsubscribed successfully"));
    }

    @PostMapping({"/api/v1/admin/push/test", "/api/admin/push/test"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> sendTestPush(
            @Valid @RequestBody PushPayloadDto payload
    ) {
        pushNotificationService.sendToAllAsync(payload);
        return ResponseEntity.ok(Map.of("message", "Test push broadcast triggered"));
    }
}
