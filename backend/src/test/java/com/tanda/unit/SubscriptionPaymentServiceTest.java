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

        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(requestRepository.save(any(SubscriptionPaymentRequest.class)))
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
}
