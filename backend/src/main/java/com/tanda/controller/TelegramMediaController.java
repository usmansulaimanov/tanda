package com.tanda.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.tanda.service.TelegramMediaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/media/telegram", "/api/media/telegram"})
@RequiredArgsConstructor
public class TelegramMediaController {

    private final TelegramMediaService telegramMediaService;

    @GetMapping("/{fileId}")
    public void streamAudio(
            @PathVariable String fileId,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        telegramMediaService.streamTelegramAudio(fileId, request, response);
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> receiveWebhook(@RequestBody JsonNode update) {
        telegramMediaService.handleTelegramWebhook(update);
        return ResponseEntity.ok().build();
    }
}
