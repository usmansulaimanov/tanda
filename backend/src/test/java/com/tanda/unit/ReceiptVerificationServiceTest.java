package com.tanda.unit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.premium.ReceiptAnalysisResult;
import com.tanda.dto.system.SystemSettingsResponseDto;
import com.tanda.repository.SubscriptionPaymentRequestRepository;
import com.tanda.service.OpenAiVisionService;
import com.tanda.service.ReceiptVerificationService;
import com.tanda.service.SystemSettingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceiptVerificationServiceTest {

    @Mock
    private OpenAiVisionService openAiVisionService;

    @Mock
    private SubscriptionPaymentRequestRepository requestRepository;

    @Mock
    private SystemSettingService systemSettingService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ReceiptVerificationService verificationService;

    private SystemSettingsResponseDto settings;

    @BeforeEach
    void setUp() {
        settings = SystemSettingsResponseDto.builder()
                .bankName("Freedom Finance Bank")
                .kaspiCard("0000 0000 0000 5096")
                .kaspiRecipientName("Сулайманов У.Б.")
                .price1Month(2500)
                .price3Months(7500)
                .price1Year(30000)
                .build();
    }

    @Test
    @DisplayName("Valid Freedom card receipt with matching amount and card last4 -> APPROVED")
    void validFreedomCardReceipt_approved() {
        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(true)
                .bankName("Freedom Finance Bank")
                .receiptNumber("806040152838843337")
                .dateTime("02.02.2026 10:55")
                .amountKzt(2500)
                .recipientCardLast4("5096")
                .senderName("Сулайманов У.Б.")
                .confidence(0.95)
                .build();

        when(openAiVisionService.loadReceiptBytes(any())).thenReturn(new byte[]{1, 2, 3});
        when(openAiVisionService.computeSha256(any())).thenReturn("hash123");
        when(openAiVisionService.analyzeReceipt(any(), any())).thenReturn(analysis);
        when(requestRepository.existsByReceiptNumberAndStatus("806040152838843337", "APPROVED")).thenReturn(false);
        when(requestRepository.existsByReceiptHashAndStatus("hash123", "APPROVED")).thenReturn(false);
        when(systemSettingService.getSettings()).thenReturn(settings);

        ReceiptVerificationService.VerificationResult result =
                verificationService.verifyReceipt("/uploads/covers/test.jpg", null, 2500, "1_MONTH");

        assertTrue(result.isApproved());
        assertEquals("APPROVED", result.getAiStatus());
        assertNull(result.getRejectionReason());
    }

    @Test
    @DisplayName("Non-receipt image (arbitrary photo/meme) -> REJECTED")
    void nonReceiptImage_rejected() {
        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(false)
                .rawSummary("Жіберілген файл төлем чегі емес")
                .build();

        when(openAiVisionService.loadReceiptBytes(any())).thenReturn(new byte[]{1, 2, 3});
        when(openAiVisionService.computeSha256(any())).thenReturn("hash_fake");
        when(openAiVisionService.analyzeReceipt(any(), any())).thenReturn(analysis);

        ReceiptVerificationService.VerificationResult result =
                verificationService.verifyReceipt("/uploads/covers/fake.jpg", null, 2500, "1_MONTH");

        assertFalse(result.isApproved());
        assertEquals("REJECTED", result.getAiStatus());
        assertTrue(result.getRejectionReason().contains("төлем чегі емес"));
    }

    @Test
    @DisplayName("Duplicate receipt number previously APPROVED -> DUPLICATE rejected")
    void duplicateReceiptNumber_rejected() {
        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(true)
                .bankName("Kaspi")
                .receiptNumber("888426276918023483")
                .amountKzt(2500)
                .recipientName("Сулайманов У.Б.")
                .build();

        when(openAiVisionService.loadReceiptBytes(any())).thenReturn(new byte[]{1, 2, 3});
        when(openAiVisionService.computeSha256(any())).thenReturn("hash_dup");
        when(openAiVisionService.analyzeReceipt(any(), any())).thenReturn(analysis);
        when(requestRepository.existsByReceiptNumberAndStatus("888426276918023483", "APPROVED")).thenReturn(true);

        ReceiptVerificationService.VerificationResult result =
                verificationService.verifyReceipt("/uploads/covers/dup.jpg", null, 2500, "1_MONTH");

        assertFalse(result.isApproved());
        assertEquals("DUPLICATE", result.getAiStatus());
        assertTrue(result.getRejectionReason().contains("бұрын тіркелген"));
    }

    @Test
    @DisplayName("Amount mismatch (receipt has 1000 KZT, tariff requires 2500 KZT) -> REJECTED")
    void amountMismatch_rejected() {
        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(true)
                .bankName("Kaspi")
                .receiptNumber("999111222")
                .amountKzt(1000)
                .recipientName("Сулайманов")
                .build();

        when(openAiVisionService.loadReceiptBytes(any())).thenReturn(new byte[]{1, 2, 3});
        when(openAiVisionService.computeSha256(any())).thenReturn("hash_mismatch");
        when(openAiVisionService.analyzeReceipt(any(), any())).thenReturn(analysis);
        when(requestRepository.existsByReceiptNumberAndStatus("999111222", "APPROVED")).thenReturn(false);
        when(requestRepository.existsByReceiptHashAndStatus("hash_mismatch", "APPROVED")).thenReturn(false);

        ReceiptVerificationService.VerificationResult result =
                verificationService.verifyReceipt("/uploads/covers/mismatch.jpg", null, 2500, "1_MONTH");

        assertFalse(result.isApproved());
        assertEquals("REJECTED", result.getAiStatus());
        assertTrue(result.getRejectionReason().contains("сәйкес келмейді"));
    }

    @Test
    @DisplayName("Card mismatch (destination card *9999 does not match configured *5096) -> REJECTED")
    void cardMismatch_rejected() {
        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(true)
                .bankName("Freedom Finance Bank")
                .receiptNumber("806040152838843337")
                .amountKzt(2500)
                .recipientCardLast4("9999")
                .build();

        when(openAiVisionService.loadReceiptBytes(any())).thenReturn(new byte[]{1, 2, 3});
        when(openAiVisionService.computeSha256(any())).thenReturn("hash_card");
        when(openAiVisionService.analyzeReceipt(any(), any())).thenReturn(analysis);
        when(requestRepository.existsByReceiptNumberAndStatus("806040152838843337", "APPROVED")).thenReturn(false);
        when(requestRepository.existsByReceiptHashAndStatus("hash_card", "APPROVED")).thenReturn(false);
        when(systemSettingService.getSettings()).thenReturn(settings);

        ReceiptVerificationService.VerificationResult result =
                verificationService.verifyReceipt("/uploads/covers/card_wrong.jpg", null, 2500, "1_MONTH");

        assertFalse(result.isApproved());
        assertEquals("REJECTED", result.getAiStatus());
        assertTrue(result.getRejectionReason().contains("карта"));
    }

    @Test
    @DisplayName("AI Unavailable / Quota exhausted -> MANUAL_REVIEW_NEEDED fallback")
    void aiUnavailable_fallbackToManualReview() {
        ReceiptAnalysisResult analysis = ReceiptAnalysisResult.builder()
                .isReceipt(false)
                .aiUnavailable(true)
                .rawSummary("OpenAI API қатесі: HTTP 429")
                .build();

        when(openAiVisionService.loadReceiptBytes(any())).thenReturn(new byte[]{1, 2, 3});
        when(openAiVisionService.computeSha256(any())).thenReturn("hash_fallback");
        when(openAiVisionService.analyzeReceipt(any(), any())).thenReturn(analysis);

        ReceiptVerificationService.VerificationResult result =
                verificationService.verifyReceipt("/uploads/covers/test.jpg", null, 2500, "1_MONTH");

        assertFalse(result.isApproved());
        assertEquals("MANUAL_REVIEW_NEEDED", result.getAiStatus());
        assertEquals("OpenAI API қатесі: HTTP 429", result.getRejectionReason());
    }
}
