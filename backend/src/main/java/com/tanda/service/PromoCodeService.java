package com.tanda.service;

import com.tanda.dto.promo.ApplyPromoResponseDto;
import com.tanda.dto.promo.GeneratePromoCodesRequestDto;
import com.tanda.dto.promo.PromoBatchResponseDto;
import com.tanda.dto.promo.PromoCodeResponseDto;
import com.tanda.dto.promo.PromoUsageRecordDto;
import com.tanda.dto.promo.UpdatePromoCodeRequestDto;
import com.tanda.dto.promo.ValidatePromoResponseDto;
import com.tanda.entity.PromoBatch;
import com.tanda.entity.PromoCode;
import com.tanda.entity.PromoUse;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.PromoBatchRepository;
import com.tanda.repository.PromoCodeRepository;
import com.tanda.repository.PromoUseRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromoCodeService {

    private final PromoBatchRepository batchRepository;
    private final PromoCodeRepository codeRepository;
    private final PromoUseRepository useRepository;
    private final UserRepository userRepository;
    private final PremiumService premiumService;

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional(readOnly = true)
    public List<PromoBatchResponseDto> getAllBatches() {
        return batchRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toBatchDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PromoCodeResponseDto> getAllCodes() {
        List<PromoCode> codes = codeRepository.findAllByOrderByCreatedAtDesc();
        return mapCodesWithUsage(codes);
    }

    @Transactional(readOnly = true)
    public List<PromoCodeResponseDto> getCodesByBatch(String batchId) {
        List<PromoCode> codes = codeRepository.findByBatchIdOrderByCreatedAtDesc(batchId);
        return mapCodesWithUsage(codes);
    }

    @Transactional
    public Map<String, Object> generatePromoCodes(GeneratePromoCodesRequestDto req) {
        int count = req.getCount() != null ? Math.max(1, Math.min(req.getCount(), 1000)) : 10;
        int durationDays = req.getDurationDays() != null ? req.getDurationDays() : 30;
        int maxUses = req.getMaxUses() != null ? req.getMaxUses() : 1;
        String rewardType = req.getRewardType() != null ? req.getRewardType() : "subscription_1m";
        String rewardTitle = req.getRewardTitle() != null ? req.getRewardTitle() : "1 айлық тегін жазылым";
        String prefix = req.getPrefix() != null && !req.getPrefix().trim().isEmpty()
                ? req.getPrefix().trim().toUpperCase() : "TANDA";

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusDays(durationDays);

        String batchId = "batch-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4);
        String batchName = req.getBatchName() != null && !req.getBatchName().trim().isEmpty()
                ? req.getBatchName().trim()
                : "Топтама (" + count + " промокод) - " + now.toLocalDate();

        PromoBatch batch = PromoBatch.builder()
                .id(batchId)
                .name(batchName)
                .rewardType(rewardType)
                .rewardTitle(rewardTitle)
                .durationDays(durationDays)
                .expiresAt(expiresAt)
                .prefix(prefix)
                .totalCodes(count)
                .createdAt(now)
                .build();
        batchRepository.save(batch);

        List<PromoCode> codesToSave = new ArrayList<>();
        Set<String> generatedCodes = new HashSet<>();

        for (int i = 0; i < count; i++) {
            String codeCandidate;
            do {
                codeCandidate = generateCodeString(req.getCustomWord(), prefix);
            } while (generatedCodes.contains(codeCandidate) || codeRepository.existsByCodeIgnoreCase(codeCandidate));

            generatedCodes.add(codeCandidate);

            PromoCode code = PromoCode.builder()
                    .id("promo-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6) + "-" + i)
                    .batchId(batchId)
                    .batchName(batchName)
                    .code(codeCandidate)
                    .rewardType(rewardType)
                    .rewardTitle(rewardTitle)
                    .durationDays(durationDays)
                    .discountPercent(req.getDiscountPercent() != null ? req.getDiscountPercent() : 0)
                    .expiresAt(expiresAt)
                    .maxUses(maxUses)
                    .usedCount(0)
                    .isActive(true)
                    .isIssued(false)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            codesToSave.add(code);
        }

        List<PromoCode> savedCodes = codeRepository.saveAll(codesToSave);
        log.info("Generated batch {} with {} promo codes", batchId, savedCodes.size());

        PromoBatchResponseDto batchDto = toBatchDto(batch);
        List<PromoCodeResponseDto> codeDtos = savedCodes.stream()
                .map(c -> toCodeDto(c, Collections.emptyList()))
                .collect(Collectors.toList());

        return Map.of("batch", batchDto, "codes", codeDtos);
    }

    @Transactional
    public PromoCodeResponseDto updateCode(String id, UpdatePromoCodeRequestDto req) {
        PromoCode code = codeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Промокод табылмады: " + id));

        if (req.getIsActive() != null) {
            code.setIsActive(req.getIsActive());
        }
        if (req.getIsIssued() != null) {
            code.setIsIssued(req.getIsIssued());
        }
        if (req.getNote() != null) {
            code.setNote(req.getNote());
        }

        PromoCode saved = codeRepository.save(code);
        List<PromoUsageRecordDto> usage = getUsageForCode(saved.getId());
        return toCodeDto(saved, usage);
    }

    @Transactional
    public void deleteCode(String id) {
        PromoCode code = codeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Промокод табылмады: " + id));

        String batchId = code.getBatchId();
        codeRepository.delete(code);

        if (batchId != null) {
            batchRepository.findById(batchId).ifPresent(batch -> {
                int count = codeRepository.findByBatchIdOrderByCreatedAtDesc(batchId).size();
                batch.setTotalCodes(count);
                batchRepository.save(batch);
            });
        }
    }

    @Transactional
    public void deleteBatch(String batchId) {
        if (!batchRepository.existsById(batchId)) {
            throw new ResourceNotFoundException("Топтама табылмады: " + batchId);
        }
        codeRepository.deleteByBatchId(batchId);
        batchRepository.deleteById(batchId);
        log.info("Deleted batch {} and all associated codes", batchId);
    }

    @Transactional
    public void toggleBatchStatus(String batchId, Boolean isActive) {
        List<PromoCode> codes = codeRepository.findByBatchIdOrderByCreatedAtDesc(batchId);
        if (codes.isEmpty()) return;

        boolean targetActive;
        if (isActive != null) {
            targetActive = isActive;
        } else {
            targetActive = !codes.stream().anyMatch(PromoCode::getIsActive);
        }

        codes.forEach(c -> c.setIsActive(targetActive));
        codeRepository.saveAll(codes);
    }

    @Transactional(readOnly = true)
    public ValidatePromoResponseDto validatePromoCode(String rawCode, String userId) {
        if (rawCode == null || rawCode.trim().isEmpty()) {
            return ValidatePromoResponseDto.builder()
                    .valid(false)
                    .message("Промокодты енгізіңіз")
                    .build();
        }

        String code = rawCode.trim().toUpperCase();
        Optional<PromoCode> opt = codeRepository.findByCodeIgnoreCase(code);
        if (opt.isEmpty()) {
            return ValidatePromoResponseDto.builder()
                    .valid(false)
                    .code(code)
                    .message("Мұндай промокод табылмады. Қайта тексеріңіз")
                    .build();
        }

        PromoCode promo = opt.get();
        if (!Boolean.TRUE.equals(promo.getIsActive())) {
            return ValidatePromoResponseDto.builder()
                    .valid(false)
                    .code(code)
                    .message("Бұл промокод жарамсыз немесе өшірілген")
                    .build();
        }

        if (promo.getExpiresAt().isBefore(OffsetDateTime.now())) {
            return ValidatePromoResponseDto.builder()
                    .valid(false)
                    .code(code)
                    .message("Бұл промокодтың жарамдылық мерзімі өтіп кеткен")
                    .build();
        }

        if (userId != null && useRepository.existsByPromoCodeIdAndUserId(promo.getId(), userId)) {
            return ValidatePromoResponseDto.builder()
                    .valid(false)
                    .code(code)
                    .message("Сіз бұл промокодты бұрын белсендіргенсіз")
                    .build();
        }

        if (promo.getUsedCount() >= promo.getMaxUses()) {
            return ValidatePromoResponseDto.builder()
                    .valid(false)
                    .code(code)
                    .message("Бұл промокод толық пайдаланылған")
                    .build();
        }

        return ValidatePromoResponseDto.builder()
                .valid(true)
                .code(code)
                .rewardType(promo.getRewardType())
                .rewardTitle(promo.getRewardTitle())
                .durationDays(promo.getDurationDays())
                .discountPercent(promo.getDiscountPercent())
                .message("Промокод белсендіруге дайын")
                .build();
    }

    @Transactional
    public ApplyPromoResponseDto applyPromoCode(String rawCode, String userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пайдаланушы анықталмады");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пайдаланушы табылмады"));

        ValidatePromoResponseDto validation = validatePromoCode(rawCode, userId);
        if (!validation.isValid()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, validation.getMessage());
        }

        PromoCode promo = codeRepository.findByCodeIgnoreCase(rawCode.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Промокод табылмады"));

        // Save use record
        PromoUse use = PromoUse.builder()
                .promoCodeId(promo.getId())
                .userId(user.getId())
                .userName(user.getName())
                .userEmail(user.getEmail())
                .usedAt(OffsetDateTime.now())
                .build();
        useRepository.save(use);

        // Update promo used count
        promo.setUsedCount(promo.getUsedCount() + 1);
        codeRepository.save(promo);

        // Grant premium if promo gives subscription/premium access
        int days = promo.getDurationDays() != null && promo.getDurationDays() > 0 ? promo.getDurationDays() : 30;
        String rt = promo.getRewardType() != null ? promo.getRewardType().toLowerCase() : "";
        String title = promo.getRewardTitle() != null ? promo.getRewardTitle().toLowerCase() : "";
        if (rt.contains("subscription") || rt.contains("premium") || title.contains("жазылым") || title.contains("премиум") || title.contains("подписка")) {
            try {
                premiumService.grantPremium(user.getId(), days, "PROMO_CODE", "SYSTEM");
            } catch (Exception e) {
                log.warn("Failed to automatically grant premium for promo code {}: {}", promo.getCode(), e.getMessage());
            }
        }

        log.info("User {} ({}) successfully applied promo code {}", user.getId(), user.getEmail(), promo.getCode());

        return ApplyPromoResponseDto.builder()
                .success(true)
                .code(promo.getCode())
                .rewardType(promo.getRewardType())
                .rewardTitle(promo.getRewardTitle())
                .message("Құттықтаймыз! «" + promo.getRewardTitle() + "» сәтті белсендірілді!")
                .build();
    }

    @Transactional(readOnly = true)
    public List<PromoCodeResponseDto> getUserActivatedPromos(String userId) {
        List<PromoUse> uses = useRepository.findByUserIdOrderByUsedAtDesc(userId);
        if (uses.isEmpty()) return Collections.emptyList();

        List<String> codeIds = uses.stream().map(PromoUse::getPromoCodeId).distinct().collect(Collectors.toList());
        List<PromoCode> codes = codeRepository.findAllById(codeIds);

        return mapCodesWithUsage(codes);
    }

    // Helper methods
    private String generateCodeString(String customWord, String prefix) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        String randomPart = sb.toString();
        if (customWord != null && !customWord.trim().isEmpty()) {
            String cleanWord = customWord.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (!cleanWord.isEmpty()) {
                return cleanWord + "-" + randomPart + "-TANDA";
            }
        }
        String p = (prefix != null && !prefix.trim().isEmpty()) ? prefix.trim().toUpperCase() : "TANDA";
        return p + "-" + randomPart;
    }

    private List<PromoCodeResponseDto> mapCodesWithUsage(List<PromoCode> codes) {
        return codes.stream().map(c -> {
            List<PromoUsageRecordDto> usage = getUsageForCode(c.getId());
            return toCodeDto(c, usage);
        }).collect(Collectors.toList());
    }

    private List<PromoUsageRecordDto> getUsageForCode(String codeId) {
        return useRepository.findByPromoCodeIdOrderByUsedAtDesc(codeId)
                .stream()
                .map(u -> PromoUsageRecordDto.builder()
                        .userId(u.getUserId())
                        .userName(u.getUserName())
                        .userEmail(u.getUserEmail())
                        .usedAt(u.getUsedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private PromoBatchResponseDto toBatchDto(PromoBatch b) {
        return PromoBatchResponseDto.builder()
                .id(b.getId())
                .name(b.getName())
                .rewardType(b.getRewardType())
                .rewardTitle(b.getRewardTitle())
                .durationDays(b.getDurationDays())
                .expiresAt(b.getExpiresAt())
                .prefix(b.getPrefix())
                .totalCodes(b.getTotalCodes())
                .createdAt(b.getCreatedAt())
                .build();
    }

    private PromoCodeResponseDto toCodeDto(PromoCode c, List<PromoUsageRecordDto> usage) {
        return PromoCodeResponseDto.builder()
                .id(c.getId())
                .batchId(c.getBatchId())
                .batchName(c.getBatchName())
                .code(c.getCode())
                .rewardType(c.getRewardType())
                .rewardTitle(c.getRewardTitle())
                .description(c.getDescription())
                .durationDays(c.getDurationDays())
                .discountPercent(c.getDiscountPercent())
                .expiresAt(c.getExpiresAt())
                .maxUses(c.getMaxUses())
                .usedCount(c.getUsedCount())
                .usedBy(usage)
                .isActive(c.getIsActive())
                .isIssued(c.getIsIssued())
                .note(c.getNote())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
