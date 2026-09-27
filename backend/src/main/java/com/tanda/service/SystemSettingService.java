package com.tanda.service;

import com.tanda.dto.system.SystemSettingsResponseDto;
import com.tanda.dto.system.UpdateSystemSettingsRequestDto;
import com.tanda.entity.SystemSetting;
import com.tanda.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;

    @Transactional(readOnly = true)
    public SystemSettingsResponseDto getSettings() {
        List<SystemSetting> list = systemSettingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        OffsetDateTime lastUpdated = OffsetDateTime.now();
        for (SystemSetting s : list) {
            map.put(s.getSettingKey(), s.getSettingValue());
            if (s.getUpdatedAt() != null && s.getUpdatedAt().isAfter(lastUpdated)) {
                lastUpdated = s.getUpdatedAt();
            }
        }

        boolean premiumEnabled;
        if (map.containsKey("premium_enabled")) {
            premiumEnabled = "true".equalsIgnoreCase(map.get("premium_enabled"));
        } else if (map.containsKey("open_access_mode")) {
            premiumEnabled = !"true".equalsIgnoreCase(map.get("open_access_mode"));
        } else {
            premiumEnabled = true; // Default is ON (Premium system active)
        }

        return SystemSettingsResponseDto.builder()
                .premiumEnabled(premiumEnabled)
                .openAccessMode(!premiumEnabled)
                .audioAdEnabled("true".equalsIgnoreCase(map.getOrDefault("audio_ad_enabled", "false")))
                .audioAdUrl(map.getOrDefault("audio_ad_url", ""))
                .audioAdTitle(map.getOrDefault("audio_ad_title", "Tanda Premium — Жарнамасыз тыңдаңыз"))
                .kaspiPhone(map.getOrDefault("kaspi_phone", "+7 (777) 000-00-00"))
                .kaspiCard(map.getOrDefault("kaspi_card", ""))
                .kaspiRecipientName(map.getOrDefault("kaspi_recipient_name", "Tanda"))
                .price1Month(parseIntOrDefault(map.get("price_1_month"), 1490))
                .price3Months(parseIntOrDefault(map.get("price_3_months"), 3990))
                .price1Year(parseIntOrDefault(map.get("price_1_year"), 11990))
                .updatedAt(lastUpdated)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean isPremiumEnabled() {
        return systemSettingRepository.findBySettingKey("premium_enabled")
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElseGet(() -> !isOpenAccessMode());
    }

    @Transactional(readOnly = true)
    public boolean isOpenAccessMode() {
        return systemSettingRepository.findBySettingKey("open_access_mode")
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(false);
    }

    @Transactional
    public SystemSettingsResponseDto updateSettings(UpdateSystemSettingsRequestDto dto) {
        if (dto.getPremiumEnabled() != null) {
            saveSetting("premium_enabled", String.valueOf(dto.getPremiumEnabled()));
            saveSetting("open_access_mode", String.valueOf(!dto.getPremiumEnabled()));
        } else if (dto.getOpenAccessMode() != null) {
            saveSetting("open_access_mode", String.valueOf(dto.getOpenAccessMode()));
            saveSetting("premium_enabled", String.valueOf(!dto.getOpenAccessMode()));
        }
        if (dto.getAudioAdEnabled() != null) {
            saveSetting("audio_ad_enabled", String.valueOf(dto.getAudioAdEnabled()));
        }
        if (dto.getAudioAdUrl() != null) {
            saveSetting("audio_ad_url", dto.getAudioAdUrl().trim());
        }
        if (dto.getAudioAdTitle() != null) {
            saveSetting("audio_ad_title", dto.getAudioAdTitle().trim());
        }
        if (dto.getKaspiPhone() != null) {
            saveSetting("kaspi_phone", dto.getKaspiPhone().trim());
        }
        if (dto.getKaspiCard() != null) {
            saveSetting("kaspi_card", dto.getKaspiCard().trim());
        }
        if (dto.getKaspiRecipientName() != null) {
            saveSetting("kaspi_recipient_name", dto.getKaspiRecipientName().trim());
        }
        if (dto.getPrice1Month() != null) {
            saveSetting("price_1_month", String.valueOf(dto.getPrice1Month()));
        }
        if (dto.getPrice3Months() != null) {
            saveSetting("price_3_months", String.valueOf(dto.getPrice3Months()));
        }
        if (dto.getPrice1Year() != null) {
            saveSetting("price_1_year", String.valueOf(dto.getPrice1Year()));
        }

        log.info("System settings updated successfully: {}", dto);
        return getSettings();
    }

    private void saveSetting(String key, String value) {
        SystemSetting s = systemSettingRepository.findBySettingKey(key)
                .orElseGet(() -> SystemSetting.builder().settingKey(key).build());
        s.setSettingValue(value);
        s.setUpdatedAt(OffsetDateTime.now());
        systemSettingRepository.save(s);
    }

    private int parseIntOrDefault(String value, int fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
