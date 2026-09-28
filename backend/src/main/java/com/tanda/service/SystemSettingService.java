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

        OffsetDateTime heroExpiresAt = null;
        String heroExpiresStr = map.get("hero_message_expires_at");
        if (heroExpiresStr != null && !heroExpiresStr.trim().isEmpty()) {
            try {
                heroExpiresAt = OffsetDateTime.parse(heroExpiresStr.trim());
            } catch (Exception ignored) {}
        }

        return SystemSettingsResponseDto.builder()
                .premiumEnabled(premiumEnabled)
                .openAccessMode(!premiumEnabled)
                .audioAdEnabled("true".equalsIgnoreCase(map.getOrDefault("audio_ad_enabled", "false")))
                .audioAdUrl(map.getOrDefault("audio_ad_url", ""))
                .audioAdTitle(map.getOrDefault("audio_ad_title", "Tanda Premium — Жарнамасыз тыңдаңыз"))
                .bankName(map.getOrDefault("bank_name", "Kaspi Bank"))
                .kaspiPhone(map.getOrDefault("kaspi_phone", "+7 (777) 000-00-00"))
                .kaspiCard(map.getOrDefault("kaspi_card", ""))
                .kaspiRecipientName(map.getOrDefault("kaspi_recipient_name", "Tanda"))
                .price1Month(parseIntOrDefault(map.get("price_1_month"), 1490))
                .price3Months(parseIntOrDefault(map.get("price_3_months"), 3990))
                .price1Year(parseIntOrDefault(map.get("price_1_year"), 11990))
                .oldPrice1Month(parseNullableInt(map.get("old_price_1_month")))
                .oldPrice3Months(parseNullableInt(map.get("old_price_3_months")))
                .oldPrice1Year(parseNullableInt(map.get("old_price_1_year")))
                .plan1MonthEnabled(!"false".equalsIgnoreCase(map.get("plan_1_month_enabled")))
                .plan3MonthsEnabled(!"false".equalsIgnoreCase(map.get("plan_3_months_enabled")))
                .plan1YearEnabled(!"false".equalsIgnoreCase(map.get("plan_1_year_enabled")))
                .kaspiPhoneEnabled(!"false".equalsIgnoreCase(map.get("kaspi_phone_enabled")))
                .kaspiCardEnabled(!"false".equalsIgnoreCase(map.get("kaspi_card_enabled")))
                .heroMessageEnabled("true".equalsIgnoreCase(map.getOrDefault("hero_message_enabled", "false")))
                .heroMessageText(map.getOrDefault("hero_message_text", ""))
                .heroMessageTarget(map.getOrDefault("hero_message_target", "all"))
                .heroMessageExpiresAt(heroExpiresAt)
                .paymentNotice(map.getOrDefault("payment_notice", ""))
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
        if (dto.getBankName() != null) {
            saveSetting("bank_name", dto.getBankName().trim());
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
        if (dto.getOldPrice1Month() != null) {
            saveSetting("old_price_1_month", dto.getOldPrice1Month() > 0 ? String.valueOf(dto.getOldPrice1Month()) : "");
        }
        if (dto.getOldPrice3Months() != null) {
            saveSetting("old_price_3_months", dto.getOldPrice3Months() > 0 ? String.valueOf(dto.getOldPrice3Months()) : "");
        }
        if (dto.getOldPrice1Year() != null) {
            saveSetting("old_price_1_year", dto.getOldPrice1Year() > 0 ? String.valueOf(dto.getOldPrice1Year()) : "");
        }
        if (dto.getPlan1MonthEnabled() != null) {
            saveSetting("plan_1_month_enabled", String.valueOf(dto.getPlan1MonthEnabled()));
        }
        if (dto.getPlan3MonthsEnabled() != null) {
            saveSetting("plan_3_months_enabled", String.valueOf(dto.getPlan3MonthsEnabled()));
        }
        if (dto.getPlan1YearEnabled() != null) {
            saveSetting("plan_1_year_enabled", String.valueOf(dto.getPlan1YearEnabled()));
        }
        if (dto.getKaspiPhoneEnabled() != null) {
            saveSetting("kaspi_phone_enabled", String.valueOf(dto.getKaspiPhoneEnabled()));
        }
        if (dto.getKaspiCardEnabled() != null) {
            saveSetting("kaspi_card_enabled", String.valueOf(dto.getKaspiCardEnabled()));
        }
        if (dto.getHeroMessageEnabled() != null) {
            saveSetting("hero_message_enabled", String.valueOf(dto.getHeroMessageEnabled()));
        }
        if (dto.getHeroMessageText() != null) {
            saveSetting("hero_message_text", dto.getHeroMessageText().trim());
        }
        if (dto.getHeroMessageTarget() != null) {
            saveSetting("hero_message_target", dto.getHeroMessageTarget().trim());
        }
        if (dto.getHeroMessageExpiresAt() != null) {
            saveSetting("hero_message_expires_at", dto.getHeroMessageExpiresAt().toString());
        } else if (Boolean.FALSE.equals(dto.getHeroMessageEnabled()) || (dto.getHeroMessageText() != null && dto.getHeroMessageExpiresAt() == null)) {
            // If explicitly clearing or updating without expiration
            if (dto.getHeroMessageExpiresAt() == null && dto.getHeroMessageText() != null) {
                saveSetting("hero_message_expires_at", "");
            }
        }
        if (dto.getPaymentNotice() != null) {
            saveSetting("payment_notice", dto.getPaymentNotice().trim());
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

    private Integer parseNullableInt(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        try {
            int val = Integer.parseInt(value.trim());
            return val > 0 ? val : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
