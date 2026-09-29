package com.tanda.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.premium.ReceiptAnalysisResult;
import com.tanda.dto.system.SystemSettingsResponseDto;
import com.tanda.repository.SubscriptionPaymentRequestRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptVerificationService {

    private final OpenAiVisionService openAiVisionService;
    private final SubscriptionPaymentRequestRepository requestRepository;
    private final SystemSettingService systemSettingService;
    private final ObjectMapper objectMapper;

    @Data
    @Builder
    public static class VerificationResult {
        private boolean approved;
        private String aiStatus; // 'APPROVED', 'REJECTED', 'DUPLICATE', 'MANUAL_REVIEW_NEEDED'
        private Double confidence;
        private String rejectionReason;
        private ReceiptAnalysisResult analysis;
        private String receiptHash;
        private String extractedDataJson;
    }

    public VerificationResult verifyReceipt(String receiptUrl, byte[] explicitBytes, int expectedAmountKzt, String planName) {
        byte[] bytes = (explicitBytes != null && explicitBytes.length > 0) ? explicitBytes : openAiVisionService.loadReceiptBytes(receiptUrl);
        String receiptHash = openAiVisionService.computeSha256(bytes);

        // 1. Analyze with OpenAI Vision
        ReceiptAnalysisResult analysis = openAiVisionService.analyzeReceipt(receiptUrl, bytes);

        String extractedJson = null;
        try {
            extractedJson = objectMapper.writeValueAsString(analysis);
        } catch (Exception ignored) {}

        // Rule 1: Must be recognized as an authentic bank payment receipt
        if (!analysis.isReceipt()) {
            return VerificationResult.builder()
                    .approved(false)
                    .aiStatus("REJECTED")
                    .confidence(0.0)
                    .rejectionReason(analysis.getRawSummary() != null && !analysis.getRawSummary().isBlank()
                            ? analysis.getRawSummary()
                            : "Жіберілген файл төлем чегі емес немесе жарамсыз сурет")
                    .analysis(analysis)
                    .receiptHash(receiptHash)
                    .extractedDataJson(extractedJson)
                    .build();
        }

        // Rule 2: Duplicate check via receiptNumber (№ квитанции / RRN)
        String receiptNum = analysis.getReceiptNumber();
        if (receiptNum != null && !receiptNum.isBlank()) {
            if (requestRepository.existsByReceiptNumberAndStatus(receiptNum, "APPROVED")) {
                log.warn("Duplicate receipt number detected: {}", receiptNum);
                return VerificationResult.builder()
                        .approved(false)
                        .aiStatus("DUPLICATE")
                        .confidence(0.99)
                        .rejectionReason("Бұл чек бұрын тіркелген және қолданылған (№ " + receiptNum + ")")
                        .analysis(analysis)
                        .receiptHash(receiptHash)
                        .extractedDataJson(extractedJson)
                        .build();
            }
        }

        // Rule 2b: Duplicate check via SHA-256 image hash
        if (receiptHash != null && !receiptHash.isBlank()) {
            if (requestRepository.existsByReceiptHashAndStatus(receiptHash, "APPROVED")) {
                log.warn("Duplicate receipt image hash detected: {}", receiptHash);
                return VerificationResult.builder()
                        .approved(false)
                        .aiStatus("DUPLICATE")
                        .confidence(0.99)
                        .rejectionReason("Бұл чек суреті жүйеде бұрын пайдаланылған")
                        .analysis(analysis)
                        .receiptHash(receiptHash)
                        .extractedDataJson(extractedJson)
                        .build();
            }
        }

        // Rule 3: Amount match
        if (analysis.getAmountKzt() == null) {
            return VerificationResult.builder()
                    .approved(false)
                    .aiStatus("REJECTED")
                    .confidence(0.5)
                    .rejectionReason("Чектен төлем сомасы анықталмады. Сапалы түбіртек жүктеңіз")
                    .analysis(analysis)
                    .receiptHash(receiptHash)
                    .extractedDataJson(extractedJson)
                    .build();
        }

        if (expectedAmountKzt > 0 && !analysis.getAmountKzt().equals(expectedAmountKzt)) {
            String reason = String.format("Чектегі төлем сомасы (%s ₸) таңдалған тариф сомасына (%s ₸) сәйкес келмейді",
                    analysis.getAmountKzt(), expectedAmountKzt);
            log.info("Amount mismatch: receipt={}, expected={}", analysis.getAmountKzt(), expectedAmountKzt);
            return VerificationResult.builder()
                    .approved(false)
                    .aiStatus("REJECTED")
                    .confidence(0.95)
                    .rejectionReason(reason)
                    .analysis(analysis)
                    .receiptHash(receiptHash)
                    .extractedDataJson(extractedJson)
                    .build();
        }

        // Rule 4: Destination account / recipient name check
        SystemSettingsResponseDto settings = systemSettingService.getSettings();

        // 4a: If receipt has card last 4 digits (e.g. *7230 or *5096 for interbank transfers)
        if (analysis.getRecipientCardLast4() != null && !analysis.getRecipientCardLast4().isBlank()) {
            String configuredCard = settings.getKaspiCard();
            if (configuredCard != null && !configuredCard.isBlank()) {
                String cardDigits = configuredCard.replaceAll("\\D", "");
                if (cardDigits.length() >= 4) {
                    String configuredLast4 = cardDigits.substring(cardDigits.length() - 4);
                    if (!configuredLast4.equals(analysis.getRecipientCardLast4())) {
                        String reason = String.format("Аударым жіберілген карта (*%s) сайттағы реквизиттерге (*%s) сәйкес келмейді",
                                analysis.getRecipientCardLast4(), configuredLast4);
                        log.info("Card mismatch: receipt last4={}, configured last4={}", analysis.getRecipientCardLast4(), configuredLast4);
                        return VerificationResult.builder()
                                .approved(false)
                                .aiStatus("REJECTED")
                                .confidence(0.95)
                                .rejectionReason(reason)
                                .analysis(analysis)
                                .receiptHash(receiptHash)
                                .extractedDataJson(extractedJson)
                                .build();
                    }
                }
            }
        }

        // 4b: If receipt has recipient name (e.g. "Касимхон К." for Kaspi-to-Kaspi transfers)
        if (analysis.getRecipientName() != null && !analysis.getRecipientName().isBlank()) {
            String configuredRecipient = settings.getKaspiRecipientName();
            if (configuredRecipient != null && !configuredRecipient.isBlank() && !configuredRecipient.equalsIgnoreCase("Tanda")) {
                if (!matchesRecipientName(configuredRecipient, analysis.getRecipientName())) {
                    String reason = String.format("Чектегі алушы аты (%s) сайтта көрсетілген алушыға (%s) сәйкес келмейді",
                            analysis.getRecipientName(), configuredRecipient);
                    log.info("Recipient name mismatch: receipt={}, configured={}", analysis.getRecipientName(), configuredRecipient);
                    return VerificationResult.builder()
                            .approved(false)
                            .aiStatus("REJECTED")
                            .confidence(0.9)
                            .rejectionReason(reason)
                            .analysis(analysis)
                            .receiptHash(receiptHash)
                            .extractedDataJson(extractedJson)
                            .build();
                }
            }
        }

        // All checks passed!
        log.info("Receipt verification APPROVED for amount={} KZT, receiptNum={}", analysis.getAmountKzt(), receiptNum);
        return VerificationResult.builder()
                .approved(true)
                .aiStatus("APPROVED")
                .confidence(0.95)
                .rejectionReason(null)
                .analysis(analysis)
                .receiptHash(receiptHash)
                .extractedDataJson(extractedJson)
                .build();
    }

    private boolean matchesRecipientName(String configuredName, String receiptName) {
        if (configuredName == null || receiptName == null) return false;
        String conf = configuredName.toLowerCase(Locale.ROOT).trim();
        String rec = receiptName.toLowerCase(Locale.ROOT).trim();

        if (conf.contains(rec) || rec.contains(conf)) {
            return true;
        }

        // Compare words of length >= 3 (e.g. "Касимхон" or "Сулайманов")
        String[] confWords = conf.split("[\\s,.]+");
        String[] recWords = rec.split("[\\s,.]+");

        for (String cw : confWords) {
            if (cw.length() < 3) continue;
            for (String rw : recWords) {
                if (rw.length() < 3) continue;
                if (cw.startsWith(rw) || rw.startsWith(cw) || cw.contains(rw) || rw.contains(cw)) {
                    return true;
                }
            }
        }

        return false;
    }
}
