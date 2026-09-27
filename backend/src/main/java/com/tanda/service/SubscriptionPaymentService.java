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

    @Transactional
    public SubscriptionPaymentRequestResponseDto createRequest(String userId, CreateSubscriptionPaymentRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады: " + userId));

        int days = (dto.getPlanDays() != null && dto.getPlanDays() > 0) ? dto.getPlanDays() : 30;
        int amount = (dto.getAmountKzt() != null && dto.getAmountKzt() > 0) ? dto.getAmountKzt() : 1490;

        SubscriptionPaymentRequest req = SubscriptionPaymentRequest.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .planName(dto.getPlanName() != null ? dto.getPlanName() : "1_MONTH")
                .planDays(days)
                .amountKzt(amount)
                .receiptUrl(dto.getReceiptUrl())
                .phoneOrAccount(dto.getPhoneOrAccount())
                .notes(dto.getNotes())
                .status("PENDING")
                .createdAt(OffsetDateTime.now())
                .build();

        SubscriptionPaymentRequest saved = requestRepository.save(req);
        log.info("User {} created subscription payment request {} for plan {} ({} days, {} KZT)",
                userId, saved.getId(), saved.getPlanName(), days, amount);

        return toDto(saved, user.getName(), user.getEmail());
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPaymentRequestResponseDto> getMyRequests(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        String name = user != null ? user.getName() : null;
        String email = user != null ? user.getEmail() : null;

        return requestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> toDto(r, name, email))
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
            User u = userRepository.findById(r.getUserId()).orElse(null);
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
            messageService.sendMessage(adminId, "Tanda", "admin", MessageRequestDto.builder()
                    .title("Tanda Premium сәтті қосылды! 👑")
                    .content("Құрметті " + (user.getName() != null ? user.getName() : "оқырман") + "! Сіздің " + days + " күндік Премиум жазылымыңыз сәтті белсендірілді. Барлық кітаптарды шектеусіз әрі жарнамасыз тыңдаңыз!")
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

        req.setStatus("REJECTED");
        req.setRejectionReason(reason != null ? reason : "Чек расталмады немесе төлем сомасы сәйкес келмейді");
        req.setReviewedBy(adminId);
        req.setReviewedAt(OffsetDateTime.now());
        SubscriptionPaymentRequest saved = requestRepository.save(req);

        // Send rejection notification
        try {
            messageService.sendMessage(adminId, "Tanda", "admin", MessageRequestDto.builder()
                    .title("Төлем сұранысы бойынша хабарлама")
                    .content("Сіз жіберген Kaspi чегі расталмады. Себебі: " + req.getRejectionReason() + ". Сұрақтарыңыз болса қолдау қызметіне хабарласыңыз.")
                    .targetType("single")
                    .targetUserIds(List.of(req.getUserId()))
                    .priority("normal")
                    .build());
        } catch (Exception e) {
            log.warn("Could not send rejection message to user {}: {}", req.getUserId(), e.getMessage());
        }

        log.info("Admin {} REJECTED subscription request {} for user {}. Reason: {}",
                adminId, requestId, req.getUserId(), req.getRejectionReason());

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
                .createdAt(r.getCreatedAt())
                .build();
    }
}
