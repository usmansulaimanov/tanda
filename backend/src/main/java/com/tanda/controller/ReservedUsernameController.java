package com.tanda.controller;

import com.tanda.service.ReservedUsernameService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/admin/usernames/reserved", "/api/admin/usernames/reserved"})
@RequiredArgsConstructor
public class ReservedUsernameController {

    private final ReservedUsernameService reservedUsernameService;

    @GetMapping
    public ResponseEntity<List<String>> getReservedUsernames() {
        return ResponseEntity.ok(reservedUsernameService.getAllReservedUsernames());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> addReservedUsername(
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        String createdBy = auth != null ? auth.getName() : null;
        Object rawUsername = body.get("username");
        Object rawUsernames = body.get("usernames");

        if (rawUsername instanceof String str && !str.isBlank()) {
            reservedUsernameService.addReservedUsername(str, createdBy);
        } else if (rawUsernames instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof String s && !s.isBlank()) {
                    reservedUsernameService.addReservedUsername(s, createdBy);
                }
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removeReservedUsername(@PathVariable String username) {
        reservedUsernameService.removeReservedUsername(username);
        return ResponseEntity.noContent().build();
    }
}
