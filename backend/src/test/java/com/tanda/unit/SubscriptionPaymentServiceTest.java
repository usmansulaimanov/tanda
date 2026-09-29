package com.tanda.unit;

import com.tanda.dto.premium.CreateSubscriptionPaymentRequestDto;
import com.tanda.dto.premium.ReceiptAnalysisResult;
import com.tanda.dto.premium.SubscriptionPaymentRequestResponseDto;
import com.tanda.entity.SubscriptionPaymentRequest;
import com.tanda.entity.User;
import com.tanda.repository.SubscriptionPaymentRequestRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionPaymentServiceTest {

    @Mock
    private SubscriptionPaymentRequestRepository requestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PremiumService premiumService;

    @Mock
    private MessageService messageService;

    @Mock
    private ReceiptVerificationService receiptVerificationService;

    @Mock
    private SystemSettingService systemSettingService;

    @InjectMocks
    private SubscriptionPaymentService paymentService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-123")
                .email("user@tanda.kz")
                .name("Оқырман Аслан")
                .build();

        lenient().when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        lenient().when(requestRepository.save(any(SubscriptionPaymentRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("When AI verification is disabled by Admin -> request is saved as PENDING for manual review")
    void whenAiDisabled_createsPendingRequest() {
        when(systemSettingService.isAiReceiptVerificationEnabled()).thenReturn(false);

        CreateSubscriptionPaymentRequestDto dto = CreateSubscriptionPaymentRequestDto.builder()
                .planName("1_MONTH")
                .planDays(30)
                .amountKzt(1490)
                .receiptUrl("/uploads/covers/receipt1.jpg")
                .notes("Қолмен тексеру сынағы")
                .build();

        SubscriptionPaymentRequestResponseDto result = paymentService.createRequest("user-123", dto);

        assertEquals("PENDING", result.getStatus());
        assertFalse(result.getAiVerified());
        assertEquals("MANUAL_REVIEW_NEEDED", result.getAiStatus());
        verifyNoInteractions(receiptVerificationService);
        verifyNoInteractions(premiumService);
    }

    @Test
    @DisplayName("When AI is enabled but quota exhausted / unavailable -> gracefully falls back to PENDING")
    void whenAiFailsOrQuotaExhausted_fallsBackToPending() {
        when(systemSettingService.isAiReceiptVerificationEnabled()).thenReturn(true);

        ReceiptVerificationService.VerificationResult fallbackResult = ReceiptVerificationService.VerificationResult.builder()
                .approved(false)
                .aiStatus("MANUAL_REVIEW_NEEDED")
                .rejectionReason("OpenAI API қатесі: HTTP 429")
                .build();

        when(receiptVerificationService.verifyReceipt(any(), any(), anyInt(), any()))
                .thenReturn(fallbackResult);

        CreateSubscriptionPaymentRequestDto dto = CreateSubscriptionPaymentRequestDto.builder()
                .planName("1_MONTH")
                .planDays(30)
                .amountKzt(1490)
                .receiptUrl("/uploads/covers/receipt1.jpg")
                .build();

        SubscriptionPaymentRequestResponseDto result = paymentService.createRequest("user-123", dto);

        assertEquals("PENDING", result.getStatus());
        assertFalse(result.getAiVerified());
        assertEquals("MANUAL_REVIEW_NEEDED", result.getAiStatus());
        verifyNoInteractions(premiumService);
    }

    @Test
    @DisplayName("When AI is enabled and receipt is valid -> APPROVED and instant premium granted")
    void whenAiApproved_grantsPremium() {
        when(systemSettingService.isAiReceiptVerificationEnabled()).thenReturn(true);

        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(true)
                .receiptNumber("123456789")
                .build();

        ReceiptVerificationService.VerificationResult approvedResult = ReceiptVerificationService.VerificationResult.builder()
                .approved(true)
                .aiStatus("APPROVED")
                .confidence(0.98)
                .analysis(analysis)
                .build();

        when(receiptVerificationService.verifyReceipt(any(), any(), anyInt(), any()))
                .thenReturn(approvedResult);

        CreateSubscriptionPaymentRequestDto dto = CreateSubscriptionPaymentRequestDto.builder()
                .planName("1_MONTH")
                .planDays(30)
                .amountKzt(1490)
                .receiptUrl("/uploads/covers/receipt1.jpg")
                .build();

        SubscriptionPaymentRequestResponseDto result = paymentService.createRequest("user-123", dto);

        assertEquals("APPROVED", result.getStatus());
        assertTrue(result.getAiVerified());
        assertEquals("APPROVED", result.getAiStatus());
        verify(premiumService).grantPremium("user-123", 30, "AI_AUTO_RECEIPT", "AI_VERIFIER");
    }

    @Test
    @DisplayName("Cooldown Stage 1: 1st rejected receipt sets 5-minute cooldown")
    void whenFirstRejection_sets5MinuteCooldown() {
        SubscriptionPaymentRequest req1 = SubscriptionPaymentRequest.builder()
                .id("req-1")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(java.time.OffsetDateTime.now().minusMinutes(2))
                .reviewedAt(java.time.OffsetDateTime.now().minusMinutes(2))
                .build();

        when(requestRepository.findByUserIdOrderByCreatedAtDesc("user-123"))
                .thenReturn(java.util.List.of(req1));

        com.tanda.dto.premium.ReceiptCooldownDto cooldown = paymentService.getCooldownStatus("user-123");

        assertTrue(cooldown.isLocked());
        assertEquals(1, cooldown.getCurrentStage());
        assertTrue(cooldown.getRemainingSeconds() > 100 && cooldown.getRemainingSeconds() <= 180);
    }

    @Test
    @DisplayName("Cooldown Stage 2: 2nd rejected receipt within 1 hour sets 10-minute cooldown")
    void whenSecondRejection_sets10MinuteCooldown() {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        SubscriptionPaymentRequest req2 = SubscriptionPaymentRequest.builder()
                .id("req-2")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(2))
                .reviewedAt(now.minusMinutes(2))
                .build();

        SubscriptionPaymentRequest req1 = SubscriptionPaymentRequest.builder()
                .id("req-1")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(10))
                .reviewedAt(now.minusMinutes(10))
                .build();

        when(requestRepository.findByUserIdOrderByCreatedAtDesc("user-123"))
                .thenReturn(java.util.List.of(req2, req1));

        com.tanda.dto.premium.ReceiptCooldownDto cooldown = paymentService.getCooldownStatus("user-123");

        assertTrue(cooldown.isLocked());
        assertEquals(2, cooldown.getCurrentStage());
        assertTrue(cooldown.getRemainingSeconds() > 400 && cooldown.getRemainingSeconds() <= 480);
    }

    @Test
    @DisplayName("Cooldown Stage 3: 3rd rejected receipt within 1 hour sets 60-minute cooldown")
    void whenThirdRejection_sets60MinuteCooldown() {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        SubscriptionPaymentRequest req3 = SubscriptionPaymentRequest.builder()
                .id("req-3")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(5))
                .reviewedAt(now.minusMinutes(5))
                .build();

        SubscriptionPaymentRequest req2 = SubscriptionPaymentRequest.builder()
                .id("req-2")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(20))
                .reviewedAt(now.minusMinutes(20))
                .build();

        SubscriptionPaymentRequest req1 = SubscriptionPaymentRequest.builder()
                .id("req-1")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(35))
                .reviewedAt(now.minusMinutes(35))
                .build();

        when(requestRepository.findByUserIdOrderByCreatedAtDesc("user-123"))
                .thenReturn(java.util.List.of(req3, req2, req1));

        com.tanda.dto.premium.ReceiptCooldownDto cooldown = paymentService.getCooldownStatus("user-123");

        assertTrue(cooldown.isLocked());
        assertEquals(3, cooldown.getCurrentStage());
        assertTrue(cooldown.getRemainingSeconds() > 3000 && cooldown.getRemainingSeconds() <= 3300);
    }

    @Test
    @DisplayName("Cooldown Stage 4: 4th rejected receipt sets lockout until next day")
    void whenFourthRejection_setsNextDayLockout() {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        SubscriptionPaymentRequest req4 = SubscriptionPaymentRequest.builder()
                .id("req-4")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(2))
                .reviewedAt(now.minusMinutes(2))
                .build();

        SubscriptionPaymentRequest req3 = SubscriptionPaymentRequest.builder()
                .id("req-3")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(15))
                .reviewedAt(now.minusMinutes(15))
                .build();

        SubscriptionPaymentRequest req2 = SubscriptionPaymentRequest.builder()
                .id("req-2")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(30))
                .reviewedAt(now.minusMinutes(30))
                .build();

        SubscriptionPaymentRequest req1 = SubscriptionPaymentRequest.builder()
                .id("req-1")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(45))
                .reviewedAt(now.minusMinutes(45))
                .build();

        // 4 consecutive rejections within the active session (< 60 min between each)
        when(requestRepository.findByUserIdOrderByCreatedAtDesc("user-123"))
                .thenReturn(java.util.List.of(req4, req3, req2, req1));

        com.tanda.dto.premium.ReceiptCooldownDto cooldown = paymentService.getCooldownStatus("user-123");

        assertTrue(cooldown.isLocked());
        assertEquals(4, cooldown.getCurrentStage());
        assertTrue(cooldown.getMessage().contains("келесі күні"));
    }

    @Test
    @DisplayName("Session Reset: Gap > 1 hour resets rejection cycle back to Stage 1")
    void whenGapOver1Hour_resetsCooldownToStage1() {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        SubscriptionPaymentRequest reqNew = SubscriptionPaymentRequest.builder()
                .id("req-new")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusMinutes(1))
                .reviewedAt(now.minusMinutes(1))
                .build();

        // Old rejection was 3 hours ago
        SubscriptionPaymentRequest reqOld = SubscriptionPaymentRequest.builder()
                .id("req-old")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(now.minusHours(3))
                .reviewedAt(now.minusHours(3))
                .build();

        when(requestRepository.findByUserIdOrderByCreatedAtDesc("user-123"))
                .thenReturn(java.util.List.of(reqNew, reqOld));

        com.tanda.dto.premium.ReceiptCooldownDto cooldown = paymentService.getCooldownStatus("user-123");

        assertTrue(cooldown.isLocked());
        assertEquals(1, cooldown.getCurrentStage()); // Reset to Stage 1 (5 min)
    }

    @Test
    @DisplayName("Submission while locked throws BadRequestException")
    void whenSubmittingWhileLocked_throwsBadRequestException() {
        SubscriptionPaymentRequest req1 = SubscriptionPaymentRequest.builder()
                .id("req-1")
                .userId("user-123")
                .status("REJECTED")
                .createdAt(java.time.OffsetDateTime.now().minusMinutes(2))
                .reviewedAt(java.time.OffsetDateTime.now().minusMinutes(2))
                .build();

        when(requestRepository.findByUserIdOrderByCreatedAtDesc("user-123"))
                .thenReturn(java.util.List.of(req1));

        CreateSubscriptionPaymentRequestDto dto = CreateSubscriptionPaymentRequestDto.builder()
                .planName("1_MONTH")
                .planDays(30)
                .amountKzt(1490)
                .receiptUrl("/uploads/covers/receipt.jpg")
                .build();

        com.tanda.exception.BadRequestException ex = assertThrows(
                com.tanda.exception.BadRequestException.class,
                () -> paymentService.createRequest("user-123", dto)
        );

        assertTrue(ex.getMessage().contains("5 минут күту қажет"));
    }
}
