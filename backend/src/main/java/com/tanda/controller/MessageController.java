package com.tanda.controller;

import com.tanda.dto.content.MessageRequestDto;
import com.tanda.dto.content.MessageResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/api/v1/me/messages")
    public ResponseEntity<List<MessageResponseDto>> getMyMessages(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(messageService.getMessagesForUser(principal.getId()));
    }

    @PatchMapping("/api/v1/me/messages/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        messageService.markAsRead(principal.getId(), id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/api/v1/me/messages/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        messageService.markAllAsRead(principal.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/v1/me/messages/{id}")
    public ResponseEntity<Void> deleteMyMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        messageService.deleteForUser(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/api/v1/admin/messages", "/api/admin/messages"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MessageResponseDto>> getAllMessagesAdmin() {
        return ResponseEntity.ok(messageService.getAllMessagesAdmin());
    }

    @PostMapping({"/api/v1/admin/messages", "/api/admin/messages"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponseDto> sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody MessageRequestDto request
    ) {
        String senderId = principal != null ? principal.getId() : null;
        String senderName = principal != null ? principal.getUsername() : "Tanda";
        return ResponseEntity.status(HttpStatus.CREATED).body(
                messageService.sendMessage(senderId, senderName, "admin", request)
        );
    }

    @DeleteMapping({"/api/v1/admin/messages/{id}", "/api/admin/messages/{id}"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMessageAdmin(@PathVariable String id) {
        messageService.deleteMessageAdmin(id);
        return ResponseEntity.noContent().build();
    }
}
