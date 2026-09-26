package com.tanda.dto.push;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscriptionRequestDto {

    @NotBlank(message = "Endpoint is required")
    private String endpoint;

    private Keys keys;

    private String userAgent;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Keys {
        @NotBlank(message = "p256dh is required")
        private String p256dh;

        @NotBlank(message = "auth is required")
        private String auth;
    }
}
