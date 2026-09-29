package com.tanda.service;

import com.tanda.dto.content.MessageRequestDto;
import com.tanda.dto.premium.CreateSubscriptionPaymentRequestDto;
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

import java.time.OffsetDateTime;
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

    private User findUserByIdOrEmail(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Пайдаланушы табылмады");
        }
        return userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier.trim().toLowerCase()))
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + identifier));
    }

    @Transactional
    public SubscriptionPaymentRequestResponseDto createRequest(String userIdOrEmail, CreateSubscriptionPaymentRequestDto dto) {
        User user = findUserByIdOrEmail(userIdOrEmail);
        String userId = user.getId();

        int days = (dto.getPlanDays() != null && dto.getPlanDays() > 0) ? dto.getPlanDays() : 30;
        int amount = (dto.getAmountKzt() != null && dto.getAmountKzt() > 0) ? dto.getAmountKzt() : 1490;

        // Perform automated AI verification using OpenAI Vision & business rules
        ReceiptVerificationService.VerificationResult verification = receiptVerificationService.verifyReceipt(
                dto.getReceiptUrl(),
                null,
                amount,
                dto.getPlanName() != null ? dto.getPlanName() : "1_MONTH"
        );

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
                messageService.sendMessage("system", "Tanda", "admin", MessageRequestDto.builder()
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
                messageService.sendMessage("system", "Tanda", "admin", MessageRequestDto.builder()
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

