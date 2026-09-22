package com.tanda.service;

import com.tanda.dto.content.MessageRequestDto;
import com.tanda.dto.premium.PremiumEntitlementResponseDto;
import com.tanda.dto.premium.PremiumStatusResponseDto;
import com.tanda.entity.BirthdayGift;
import com.tanda.entity.PremiumEntitlement;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.BirthdayGiftRepository;
import com.tanda.repository.PremiumEntitlementRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PremiumService {

    private final PremiumEntitlementRepository entitlementRepository;
    private final BirthdayGiftRepository birthdayGiftRepository;
    private final UserRepository userRepository;
    private final MessageService messageService;

    @Transactional(readOnly = true)
    public PremiumStatusResponseDto getPremiumStatus(String userId) {
        OffsetDateTime now = OffsetDateTime.now();
        Optional<PremiumEntitlement> active = entitlementRepository
                .findTopByUserIdAndIsActiveTrueAndExpiresAtAfterOrderByExpiresAtDesc(userId, now);

        if (active.isPresent()) {
            PremiumEntitlement ent = active.get();
            long daysRemaining = Math.max(0, Duration.between(now, ent.getExpiresAt()).toDays());
            return PremiumStatusResponseDto.builder()
                    .isPremium(true)
                    .expiresAt(ent.getExpiresAt())
                    .source(ent.getSource())
                    .daysRemaining(daysRemaining)
                    .build();
        }

        return PremiumStatusResponseDto.builder()
                .isPremium(false)
                .expiresAt(null)
                .source(null)
                .daysRemaining(0L)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PremiumEntitlementResponseDto> getUserEntitlements(String userId) {
        List<PremiumEntitlement> list = entitlementRepository.findByUserIdAndIsActiveTrueOrderByExpiresAtDesc(userId);
        User user = userRepository.findById(userId).orElse(null);
        String userName = user != null ? user.getName() : null;
        String userEmail = user != null ? user.getEmail() : null;

        return list.stream()
                .map(e -> toDto(e, userName, userEmail))
                .collect(Collectors.toList());
    }

    @Transactional
    public PremiumEntitlementResponseDto grantPremium(String userId, int days, String source, String grantedBy) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + userId));

        OffsetDateTime now = OffsetDateTime.now();
        Optional<PremiumEntitlement> activeOpt = entitlementRepository
                .findTopByUserIdAndIsActiveTrueAndExpiresAtAfterOrderByExpiresAtDesc(userId, now);

        OffsetDateTime baseTime = activeOpt.map(PremiumEntitlement::getExpiresAt).orElse(now);
        if (baseTime.isBefore(now)) {
            baseTime = now;
        }

        OffsetDateTime newExpiresAt = baseTime.plusDays(days);

        PremiumEntitlement entitlement = PremiumEntitlement.builder()
                .userId(userId)
                .source(source != null ? source : "MANUAL_ADMIN")
                .startsAt(now)
                .expiresAt(newExpiresAt)
                .grantedBy(grantedBy)
                .isActive(true)
                .createdAt(now)
                .build();

        PremiumEntitlement saved = entitlementRepository.save(entitlement);
        log.info("Granted {} days premium to user {} ({}) via {}, expires: {}",
                days, userId, user.getEmail(), source, newExpiresAt);

        return toDto(saved, user.getName(), user.getEmail());
    }

    @Transactional
    public Map<String, Object> grantBirthdayGift(String userId, Integer giftYear, String grantedBy) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + userId));

        int year = giftYear != null ? giftYear : LocalDate.now().getYear();

        if (birthdayGiftRepository.existsByUserIdAndGiftYearAndGiftType(userId, year, "PREMIUM_30")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Оқырманға биылғы (" + year + ") туған күн сыйлығы бұрын берілген");
        }

        // 1. Grant 30 days premium
        PremiumEntitlementResponseDto ent = grantPremium(userId, 30, "BIRTHDAY_GIFT", grantedBy);

        // 2. Record gift
        BirthdayGift gift = BirthdayGift.builder()
                .userId(userId)
                .giftYear(year)
                .giftType("PREMIUM_30")
                .createdAt(OffsetDateTime.now())
                .build();
        birthdayGiftRepository.save(gift);

        // 3. Send celebratory message to reader inbox
        messageService.createBirthdayMessage(userId, user.getName());

        return Map.of(
                "success", true,
                "message", "Туған күн сыйлығы сәтті қосылды (+30 күн Премиум)",
                "expiresAt", ent.getExpiresAt()
        );
    }

    @Transactional(readOnly = true)
    public List<PremiumEntitlementResponseDto> getAllActivePremiumEntitlements() {
        OffsetDateTime now = OffsetDateTime.now();
        List<PremiumEntitlement> active = entitlementRepository.findByIsActiveTrueAndExpiresAtAfter(now);

        return active.stream().map(e -> {
            User u = userRepository.findById(e.getUserId()).orElse(null);
            return toDto(e, u != null ? u.getName() : null, u != null ? u.getEmail() : null);
        }).collect(Collectors.toList());
    }

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void processDailyBirthdayGifts() {
        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int day = today.getDayOfMonth();
        int year = today.getYear();

        log.info("Running daily birthday gift check for date: {} (day: {}, month: {})", today, day, month);

        List<User> clients = userRepository.findByRole("client");
        int count = 0;

        for (User u : clients) {
            if (u.getBirthDate() == null || u.getBirthDate().trim().isEmpty()) {
                continue;
            }

            if (isBirthdayToday(u.getBirthDate(), month, day)) {
                if (!birthdayGiftRepository.existsByUserIdAndGiftYearAndGiftType(u.getId(), year, "PREMIUM_30")) {
                    try {
                        grantBirthdayGift(u.getId(), year, "SYSTEM");
                        count++;
                    } catch (Exception e) {
                        log.error("Failed to process birthday gift for user {}: {}", u.getId(), e.getMessage());
                    }
                }
            }
        }

        log.info("Finished daily birthday gift check. Processed {} gifts for year {}", count, year);
    }

    private boolean isBirthdayToday(String birthDateStr, int todayMonth, int todayDay) {
        String clean = birthDateStr.trim();
        // Check "YYYY-MM-DD"
        if (clean.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            String[] parts = clean.split("-");
            int m = Integer.parseInt(parts[1]);
            int d = Integer.parseInt(parts[2]);
            return m == todayMonth && d == todayDay;
        }
        // Check "DD.MM.YYYY"
        if (clean.matches("^\\d{2}\\.\\d{2}\\.\\d{4}$")) {
            String[] parts = clean.split("\\.");
            int d = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            return m == todayMonth && d == todayDay;
        }
        // Check "DD-MM-YYYY"
        if (clean.matches("^\\d{2}-\\d{2}-\\d{4}$")) {
            String[] parts = clean.split("-");
            int d = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            return m == todayMonth && d == todayDay;
        }
        return false;
    }

    private PremiumEntitlementResponseDto toDto(PremiumEntitlement e, String name, String email) {
        return PremiumEntitlementResponseDto.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .userName(name)
                .userEmail(email)
                .source(e.getSource())
                .startsAt(e.getStartsAt())
                .expiresAt(e.getExpiresAt())
                .grantedBy(e.getGrantedBy())
                .isActive(e.getIsActive())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
