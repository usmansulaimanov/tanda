package com.tanda.service;

import com.tanda.dto.content.MessageRequestDto;
import com.tanda.dto.premium.CreateSubscriptionPaymentRequestDto;
import com.tanda.dto.premium.ReceiptCooldownDto;
import com.tanda.dto.premium.SubscriptionPaymentRequestResponseDto;
import com.tanda.entity.SubscriptionPaymentRequest;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.SubscriptionPaymentRequestRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionPaymentService {

    private final SubscriptionPaymentRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final PremiumService premiumService;
    private final MessageService messageService;
    private final ReceiptVerificationService receiptVerificationService;
    private final SystemSettingService systemSettingService;

    private User findUserByIdOrEmail(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Пайдаланушы табылмады");
        }
        return userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier.trim().toLowerCase()))
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + identifier));
    }

    @Transactional(readOnly = true)
    public ReceiptCooldownDto getCooldownStatus(String userIdOrEmail) {
        User user = findUserByIdOrEmail(userIdOrEmail);
        String userId = user.getId();

        List<SubscriptionPaymentRequest> requests = requestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (requests == null || requests.isEmpty()) {
            return ReceiptCooldownDto.builder()
                    .locked(false)
                    .remainingSeconds(0)
                    .currentStage(0)
                    .unlockAt(null)
                    .message(null)
                    .build();
        }

        // Check if the most recent request was rejected
        SubscriptionPaymentRequest latest = requests.get(0);
        if (!"REJECTED".equalsIgnoreCase(latest.getStatus())) {
            return ReceiptCooldownDto.builder()
                    .locked(false)
                    .remainingSeconds(0)
                    .currentStage(0)
                    .unlockAt(null)
                    .message(null)
                    .build();
        }

        OffsetDateTime lastRejectedAt = latest.getReviewedAt() != null ? latest.getReviewedAt() : latest.getCreatedAt();
        if (lastRejectedAt == null) {
            lastRejectedAt = OffsetDateTime.now();
        }

        // Calculate consecutive rejections streak in the current active session (rolling window <= 60 minutes)
        int streak = 1;
        OffsetDateTime currentChainTime = lastRejectedAt;

        for (int i = 1; i < requests.size(); i++) {
            SubscriptionPaymentRequest r = requests.get(i);
            if ("APPROVED".equalsIgnoreCase(r.getStatus())) {
                break;
            }
            if ("REJECTED".equalsIgnoreCase(r.getStatus())) {
                OffsetDateTime prevTime = r.getReviewedAt() != null ? r.getReviewedAt() : r.getCreatedAt();
                if (prevTime != null) {
                    long minutesBetween = Duration.between(prevTime, currentChainTime).toMinutes();
                    if (minutesBetween > 60) {
                        break; // Session gap > 1 hour resets the streak
                    } else {
                        streak++;
                        currentChainTime = prevTime;
                    }
                }
            }
        }

        int stage = Math.min(streak, 4);
        OffsetDateTime unlockAt;

        if (stage == 1) {
            unlockAt = lastRejectedAt.plusMinutes(5);
        } else if (stage == 2) {
            unlockAt = lastRejectedAt.plusMinutes(10);
        } else if (stage == 3) {
            unlockAt = lastRejectedAt.plusMinutes(60);
        } else {
            // Stage 4+: Locked until the next calendar day (Asia/Almaty 00:00:00)
            ZoneId kzZone = ZoneId.of("Asia/Almaty");
            unlockAt = lastRejectedAt.atZoneSameInstant(kzZone).toLocalDate().plusDays(1).atStartOfDay(kzZone).toOffsetDateTime();
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(unlockAt)) {
            long remainingSeconds = Math.max(1, Duration.between(now, unlockAt).getSeconds());
            long mins = remainingSeconds / 60;
            long secs = remainingSeconds % 60;
            String timeStr = mins > 0 ? String.format("%d мин %02d сек", mins, secs) : String.format("%d сек", secs);

            String message;
            if (stage == 1) {
                message = "Төлем чегі қабылданбады. Қайта жіберу үшін 5 минут күту қажет (қалды: " + timeStr + ").";
            } else if (stage == 2) {
                message = "Төлем чегі 2-ші рет қабылданбады. Қайта жіберу үшін 10 минут күту қажет (қалды: " + timeStr + ").";
            } else if (stage == 3) {
                message = "Төлем чегі 3-ші рет қабылданбады. Қайта жіберу үшін 1 сағат күту қажет (қалды: " + timeStr + ").";
            } else {
                message = "Төлем чегі бірнеше рет қабылданбады. Жаңа сұраныс тек келесі күні қабылданады.";
            }

            return ReceiptCooldownDto.builder()
                    .locked(true)
                    .remainingSeconds(remainingSeconds)
                    .currentStage(stage)
                    .unlockAt(unlockAt)
                    .message(message)
                    .build();
        }

        return ReceiptCooldownDto.builder()
                .locked(false)
                .remainingSeconds(0)
                .currentStage(stage)
                .unlockAt(unlockAt)
                .message(null)
                .build();
    }

    @Transactional
    public SubscriptionPaymentRequestResponseDto createRequest(String userIdOrEmail, CreateSubscriptionPaymentRequestDto dto) {
        User user = findUserByIdOrEmail(userIdOrEmail);
        String userId = user.getId();

        // Check progressive rate limiting cooldown
        ReceiptCooldownDto cooldown = getCooldownStatus(userId);
        if (cooldown.isLocked()) {
            throw new BadRequestException(cooldown.getMessage());
        }

        int days = (dto.getPlanDays() != null && dto.getPlanDays() > 0) ? dto.getPlanDays() : 30;
        int amount = (dto.getAmountKzt() != null && dto.getAmountKzt() > 0) ? dto.getAmountKzt() : 1490;

        boolean aiEnabled = systemSettingService.isAiReceiptVerificationEnabled();

        // Mode A: If AI receipt verification is explicitly disabled by Admin
        if (!aiEnabled) {
            log.info("AI receipt verification is disabled in system settings. Creating subscription request as PENDING for manual admin review.");
            SubscriptionPaymentRequest req = SubscriptionPaymentRequest.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(userId)
                    .planName(dto.getPlanName() != null ? dto.getPlanName() : "1_MONTH")
                    .planDays(days)
                    .amountKzt(amount)
                    .receiptUrl(dto.getReceiptUrl())
                    .phoneOrAccount(dto.getPhoneOrAccount())
                    .notes(dto.getNotes())
                    .aiVerified(false)
                    .aiStatus("MANUAL_REVIEW_NEEDED")
                    .status("PENDING")
                    .reviewedBy(null)
                    .reviewedAt(null)
                    .createdAt(OffsetDateTime.now())
                    .build();

            SubscriptionPaymentRequest saved = requestRepository.save(req);
            return toDto(saved, user.getName(), user.getEmail());
        }

        // Mode B: Perform automated AI verification using OpenAI Vision & business rules with automatic fallback
        ReceiptVerificationService.VerificationResult verification;
        try {
            verification = receiptVerificationService.verifyReceipt(
                    dto.getReceiptUrl(),
                    null,
                    amount,
                    dto.getPlanName() != null ? dto.getPlanName() : "1_MONTH"
            );
        } catch (Exception e) {
            log.warn("Receipt AI verification encountered exception (quota/timeout/network): {}. Falling back to manual review.", e.getMessage());
            verification = ReceiptVerificationService.VerificationResult.builder()
                    .approved(false)
                    .aiStatus("MANUAL_REVIEW_NEEDED")
                    .rejectionReason("ЖИ қызметі уақытша қолжетімсіз (байланыс немесе токен қатесі)")
                    .build();
        }

        // Mode C: Fallback to Manual Review if AI is unavailable / quota exhausted
        if ("MANUAL_REVIEW_NEEDED".equals(verification.getAiStatus())) {
            log.info("AI returned MANUAL_REVIEW_NEEDED (fallback). Saving request as PENDING for admin review.");
            SubscriptionPaymentRequest req = SubscriptionPaymentRequest.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(userId)
                    .planName(dto.getPlanName() != null ? dto.getPlanName() : "1_MONTH")
                    .planDays(days)
                    .amountKzt(amount)
                    .receiptUrl(dto.getReceiptUrl())
                    .phoneOrAccount(dto.getPhoneOrAccount())
                    .notes((dto.getNotes() != null && !dto.getNotes().isBlank() ? dto.getNotes() + " | " : "") + "[ЖИ токені/байланысы қолжетімсіз: қолмен тексеру күтілуде]")
                    .aiVerified(false)
                    .aiStatus("MANUAL_REVIEW_NEEDED")
                    .aiRejectionReason(verification.getRejectionReason())
                    .status("PENDING")
                    .reviewedBy(null)
                    .reviewedAt(null)
                    .createdAt(OffsetDateTime.now())
                    .build();

            SubscriptionPaymentRequest saved = requestRepository.save(req);
            return toDto(saved, user.getName(), user.getEmail());
        }

        String receiptNum = (verification.getAnalysis() != null) ? verification.getAnalysis().getReceiptNumber() : null;
        boolean isApproved = verification.isApproved();

        SubscriptionPaymentRequest req = SubscriptionPaymentRequest.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .planName(dto.getPlanName() != null ? dto.getPlanName() : "1_MONTH")
                .planDays(days)
                .amountKzt(amount)
                .receiptUrl(dto.getReceiptUrl())
                .phoneOrAccount(dto.getPhoneOrAccount())
                .notes(dto.getNotes())
                .receiptNumber(receiptNum)
                .aiVerified(true)
                .aiStatus(verification.getAiStatus())
                .aiConfidence(verification.getConfidence())
                .aiExtractedData(verification.getExtractedDataJson())
                .aiRejectionReason(verification.getRejectionReason())
                .receiptHash(verification.getReceiptHash())
                .status(isApproved ? "APPROVED" : "REJECTED")
                .rejectionReason(isApproved ? null : verification.getRejectionReason())
                .reviewedBy("AI_AUTO")
                .reviewedAt(OffsetDateTime.now())
                .createdAt(OffsetDateTime.now())
                .build();

        SubscriptionPaymentRequest saved = requestRepository.save(req);

        String readerName = user.getName() != null && !user.getName().isBlank() ? user.getName().trim() : "оқырман";

        if (isApproved) {
            // 1. Instantly grant premium!
            premiumService.grantPremium(userId, days, "AI_AUTO_RECEIPT", "AI_VERIFIER");

            // 2. Send instant congratulatory message
            try {
                messageService.sendMessage(null, "Tanda", "admin", MessageRequestDto.builder()
                        .title("Tanda Premium сәтті қосылды! 👑")
                        .content("Құрметті " + readerName + "! Сіздің " + days + " күндік Tanda Premium жазылымыңыз сәтті белсендірілді. Төлем чегі автоматты түрде расталды. Барлық аудио және электронды кітаптарды шектеусіз әрі жарнамасыз тыңдай аласыз!")
                        .targetType("single")
                        .targetUserIds(List.of(userId))
                        .priority("important")
                        .build());
            } catch (Exception e) {
                log.warn("Could not send AI confirmation message to user {}: {}", userId, e.getMessage());
            }

            log.info("AI Auto-Approved subscription request {} for user {} ({} days, {} KZT, receiptNum={})",
                    saved.getId(), userId, days, amount, receiptNum);
        } else {
            // Send clear rejection notification with reason
            String reasonText = verification.getRejectionReason() != null
                    ? verification.getRejectionReason()
                    : "Чек расталмады немесе төлем сомасы сәйкес келмейді";

            try {
                messageService.sendMessage(null, "Tanda", "admin", MessageRequestDto.builder()
                        .title("Төлем чегі қабылданбады")
                        .content("Құрметті " + readerName + "!\n\n"
                                + "Сіздің Tanda Premium жазылымына жіберген төлем чегіңіз қабылданбады.\n\n"
                                + "Себебі: " + reasonText + "\n\n"
                                + "Дұрыс сомадағы, ресми банк чегін (Kaspi/Halyk/Freedom) қайта жүктеп көріңіз немесе қолдау қызметіне хабарласыңыз.")
                        .targetType("single")
                        .targetUserIds(List.of(userId))
                        .priority("important")
                        .build());
            } catch (Exception e) {
                log.warn("Could not send AI rejection message to user {}: {}", userId, e.getMessage());
            }

            log.warn("AI Auto-Rejected subscription request {} for user {}: {}",
                    saved.getId(), userId, reasonText);
        }

        return toDto(saved, user.getName(), user.getEmail());
    }


    @Transactional(readOnly = true)
    public List<SubscriptionPaymentRequestResponseDto> getMyRequests(String userIdOrEmail) {
        User user = findUserByIdOrEmail(userIdOrEmail);
        String userId = user.getId();

        return requestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> toDto(r, user.getName(), user.getEmail()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPaymentRequestResponseDto> getAllRequests(String status) {
        List<SubscriptionPaymentRequest> list;
        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            list = requestRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase().trim());
        } else {
            list = requestRepository.findAllByOrderByCreatedAtDesc();
        }

        return list.stream().map(r -> {
            User u = (r.getUserId() != null && !r.getUserId().isBlank())
                    ? userRepository.findById(r.getUserId()).orElse(null)
                    : null;
            return toDto(r, u != null ? u.getName() : null, u != null ? u.getEmail() : null);
        }).collect(Collectors.toList());
    }

    @Transactional
    public SubscriptionPaymentRequestResponseDto approveRequest(String requestId, String adminId) {
        SubscriptionPaymentRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Төлем сұранысы табылмады: " + requestId));

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Бұл төлем сұранысы бұрын өңделген (статусы: " + req.getStatus() + ")");
        }

        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + req.getUserId()));

        // 1. Grant Premium
        int days = req.getPlanDays() != null && req.getPlanDays() > 0 ? req.getPlanDays() : 30;
        premiumService.grantPremium(req.getUserId(), days, "SUBSCRIPTION", adminId);

        // 2. Update Request Status
        req.setStatus("APPROVED");
        req.setReviewedBy(adminId);
        req.setReviewedAt(OffsetDateTime.now());
        SubscriptionPaymentRequest saved = requestRepository.save(req);

        // 3. Send notification message to user
        try {
            String readerName = user.getName() != null && !user.getName().isBlank() ? user.getName().trim() : "оқырман";
            messageService.sendMessage(adminId, "Tanda", "admin", MessageRequestDto.builder()
                    .title("Tanda Premium сәтті қосылды! 👑")
                    .content("Құрметті " + readerName + "! Сіздің " + days + " күндік Tanda Premium жазылымыңыз сәтті белсендірілді. Барлық аудио және электронды кітаптарды шектеусіз әрі жарнамасыз тыңдай аласыз!")
                    .targetType("single")
                    .targetUserIds(List.of(req.getUserId()))
                    .priority("important")
                    .build());
        } catch (Exception e) {
            log.warn("Could not send confirmation message to user {}: {}", req.getUserId(), e.getMessage());
        }

        log.info("Admin {} APPROVED subscription request {} for user {} ({} days)",
                adminId, requestId, req.getUserId(), days);

        return toDto(saved, user.getName(), user.getEmail());
    }

    @Transactional
    public SubscriptionPaymentRequestResponseDto rejectRequest(String requestId, String reason, String adminId) {
        SubscriptionPaymentRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Төлем сұранысы табылмады: " + requestId));

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Бұл төлем сұранысы бұрын өңделген (статусы: " + req.getStatus() + ")");
        }

        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + req.getUserId()));

        String finalReason = reason != null && !reason.isBlank() ? reason.trim() : "Чек расталмады немесе төлем сомасы сәйкес келмейді";
        req.setStatus("REJECTED");
        req.setRejectionReason(finalReason);
        req.setReviewedBy(adminId);
        req.setReviewedAt(OffsetDateTime.now());
        SubscriptionPaymentRequest saved = requestRepository.save(req);

        // Send rejection notification
        boolean isWarning = finalReason.toLowerCase().contains("соңғы ескерту") || finalReason.toLowerCase().contains("блок");
        String msgTitle = isWarning ? "⚠️ Төлем сұранысы қабылданбады (Соңғы ескерту)" : "Төлем сұранысы қабылданбады";
        String msgPriority = isWarning ? "urgent" : "important";
        String readerName = user.getName() != null && !user.getName().isBlank() ? user.getName().trim() : "оқырман";

        try {
            messageService.sendMessage(adminId, "Tanda", "admin", MessageRequestDto.builder()
                    .title(msgTitle)
                    .content("Құрметті " + readerName + "!\n\n"
                            + "Сіздің Tanda Premium жазылымына жіберген төлем сұранысыңыз қабылданбады.\n\n"
                            + "Себебі: " + finalReason + "\n\n"
                            + "Сұрақтарыңыз болса немесе түсінбеушілік орын алса, қолдау қызметіне хабарласа аласыз.")
                    .targetType("single")
                    .targetUserIds(List.of(req.getUserId()))
                    .priority(msgPriority)
                    .build());
        } catch (Exception e) {
            log.warn("Could not send rejection message to user {}: {}", req.getUserId(), e.getMessage());
        }

        log.info("Admin {} REJECTED subscription request {} for user {}. Reason: {}",
                adminId, requestId, req.getUserId(), req.getRejectionReason());

        return toDto(saved, user.getName(), user.getEmail());
    }

    @Transactional
    public SubscriptionPaymentRequestResponseDto revokeApprovedRequest(String requestId, String reason, String adminId) {
        SubscriptionPaymentRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Төлем сұранысы табылмады: " + requestId));

        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + req.getUserId()));

        String finalReason = reason != null && !reason.isBlank()
                ? reason.trim()
                : "Төлем чегі қайта тексеріліп, жарамсыз деп танылды. Премиум жазылым тоқтатылды";

        req.setStatus("REVOKED");
        req.setRejectionReason(finalReason);
        req.setReviewedBy(adminId);
        req.setReviewedAt(OffsetDateTime.now());
        SubscriptionPaymentRequest saved = requestRepository.save(req);

        // 1. Revoke active premium entitlements in DB
        premiumService.revokePremium(req.getUserId(), finalReason, adminId);

        // 2. Send urgent message to user
        String readerName = user.getName() != null && !user.getName().isBlank() ? user.getName().trim() : "оқырман";
        try {
            messageService.sendMessage(adminId, "Tanda", "admin", MessageRequestDto.builder()
                    .title("⚠️ Tanda Premium жазылымы тоқтатылды")
                    .content("Құрметті " + readerName + "!\n\n"
                            + "Сіздің бұрын қосылған Tanda Premium жазылымыңыз әкімшілік тексеруден кейін тоқтатылды.\n\n"
                            + "Себебі: " + finalReason + "\n\n"
                            + "Сұрақтарыңыз болса, қолдау қызметіне хабарласыңыз.")
                    .targetType("single")
                    .targetUserIds(List.of(req.getUserId()))
                    .priority("urgent")
                    .build());
        } catch (Exception e) {
            log.warn("Could not send revocation message to user {}: {}", req.getUserId(), e.getMessage());
        }

        log.warn("Admin {} REVOKED approved request {} for user {}. Reason: {}", adminId, requestId, req.getUserId(), finalReason);
        return toDto(saved, user.getName(), user.getEmail());
    }

    private SubscriptionPaymentRequestResponseDto toDto(SubscriptionPaymentRequest r, String userName, String userEmail) {
        return SubscriptionPaymentRequestResponseDto.builder()
                .id(r.getId())
                .userId(r.getUserId())
                .userName(userName)
                .userEmail(userEmail)
                .planName(r.getPlanName())
                .planDays(r.getPlanDays())
                .amountKzt(r.getAmountKzt())
                .receiptUrl(r.getReceiptUrl())
                .phoneOrAccount(r.getPhoneOrAccount())
                .notes(r.getNotes())
                .status(r.getStatus())
                .rejectionReason(r.getRejectionReason())
                .reviewedBy(r.getReviewedBy())
                .reviewedAt(r.getReviewedAt())
                .receiptNumber(r.getReceiptNumber())
                .aiVerified(r.getAiVerified())
                .aiStatus(r.getAiStatus())
                .aiConfidence(r.getAiConfidence())
                .aiExtractedData(r.getAiExtractedData())
                .aiRejectionReason(r.getAiRejectionReason())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

