package com.tanda.service;

import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class DeviceParserService {

    @Data
    @Builder
    public static class DeviceInfo {
        private String deviceName;
        private String deviceType; // MOBILE, DESKTOP, TABLET, UNKNOWN
    }

    public DeviceInfo parseUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return DeviceInfo.builder()
                    .deviceName("Белгісіз құрылғы")
                    .deviceType("UNKNOWN")
                    .build();
        }

        String ua = userAgent.toLowerCase(Locale.ROOT);

        // 1. Determine device type
        String deviceType = "DESKTOP";
        if (ua.contains("ipad") || ua.contains("tablet") || (ua.contains("android") && !ua.contains("mobile"))) {
            deviceType = "TABLET";
        } else if (ua.contains("mobile") || ua.contains("iphone") || ua.contains("ipod") || ua.contains("android")) {
            deviceType = "MOBILE";
        }

        // 2. Determine OS
        String os = "Құрылғы";
        if (ua.contains("iphone")) {
            os = "iPhone (iOS)";
        } else if (ua.contains("ipad")) {
            os = "iPad (iPadOS)";
        } else if (ua.contains("android")) {
            os = "Android құрылғысы";
        } else if (ua.contains("windows nt 10") || ua.contains("windows nt 11") || ua.contains("windows")) {
            os = "Windows компьютер";
        } else if (ua.contains("macintosh") || ua.contains("mac os x")) {
            os = "MacBook (macOS)";
        } else if (ua.contains("linux")) {
            os = "Linux компьютер";
        }

        // 3. Determine Browser
        String browser = "";
        if (ua.contains("edg/")) {
            browser = "Edge";
        } else if (ua.contains("opr/") || ua.contains("opera")) {
            browser = "Opera";
        } else if (ua.contains("samsungbrowser")) {
            browser = "Samsung Internet";
        } else if (ua.contains("chrome") && !ua.contains("chromium")) {
            browser = "Chrome";
        } else if (ua.contains("firefox")) {
            browser = "Firefox";
        } else if (ua.contains("safari") && !ua.contains("chrome")) {
            browser = "Safari";
        }

        String deviceName = browser.isEmpty() ? os : os + " • " + browser;
        if (deviceName.length() > 120) {
            deviceName = deviceName.substring(0, 120);
        }

        return DeviceInfo.builder()
                .deviceName(deviceName)
                .deviceType(deviceType)
                .build();
    }
}
