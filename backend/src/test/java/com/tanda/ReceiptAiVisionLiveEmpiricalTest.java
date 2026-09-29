package com.tanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.premium.ReceiptAnalysisResult;
import com.tanda.service.OpenAiVisionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class ReceiptAiVisionLiveEmpiricalTest {

    private OpenAiVisionService openAiVisionService;
    private final String apiKey = System.getenv().getOrDefault("OPENAI_API_KEY", "sk-proj-test");


    @BeforeEach
    void setUp() {
        openAiVisionService = new OpenAiVisionService(new ObjectMapper());
        ReflectionTestUtils.setField(openAiVisionService, "apiKey", apiKey);
        ReflectionTestUtils.setField(openAiVisionService, "model", "gpt-4o-mini");
    }

    @Test
    @DisplayName("Empirical Test 1: Real Kaspi to Kaspi receipt (330 KZT, Касимхон К.)")
    void testKaspiReceipt() throws Exception {
        Path path = Path.of("/Users/usman/.gemini/antigravity/brain/18a8a194-dc43-4fc1-ac37-8664d86c9901/.user_uploaded/media_1790670745095.png");
        org.junit.jupiter.api.Assumptions.assumeTrue(Files.exists(path) && !apiKey.equals("sk-proj-test"), "Skipped: local test files or API key absent");
        byte[] bytes = Files.readAllBytes(path);


        ReceiptAnalysisResult result = openAiVisionService.analyzeReceipt(null, bytes);

        assertTrue(result.isReceipt(), "Must be recognized as receipt");
        assertEquals("Kaspi", result.getBankName());
        assertEquals("888426276918023483", result.getReceiptNumber());
        assertEquals(330, result.getAmountKzt());
        assertNotNull(result.getRecipientName());
        assertTrue(result.getRecipientName().contains("Касимхон"));
    }

    @Test
    @DisplayName("Empirical Test 2: Real Kaspi to Halyk receipt (28000 KZT, *7230)")
    void testHalykReceipt() throws Exception {
        Path path = Path.of("/Users/usman/.gemini/antigravity/brain/18a8a194-dc43-4fc1-ac37-8664d86c9901/.user_uploaded/media_1790670990352.png");
        org.junit.jupiter.api.Assumptions.assumeTrue(Files.exists(path) && !apiKey.equals("sk-proj-test"), "Skipped: local test files or API key absent");
        byte[] bytes = Files.readAllBytes(path);

        ReceiptAnalysisResult result = openAiVisionService.analyzeReceipt(null, bytes);

        assertTrue(result.isReceipt(), "Must be recognized as receipt");
        assertTrue(result.getBankName().contains("Halyk"));
        assertEquals("854328634870655418", result.getReceiptNumber());
        assertEquals(28000, result.getAmountKzt());
        assertEquals("7230", result.getRecipientCardLast4());
    }

    @Test
    @DisplayName("Empirical Test 3: Real Kaspi to Freedom Finance receipt (16000 KZT, *5096)")
    void testFreedomReceipt() throws Exception {
        Path path = Path.of("/Users/usman/.gemini/antigravity/brain/18a8a194-dc43-4fc1-ac37-8664d86c9901/.user_uploaded/media_1790671266550.png");
        org.junit.jupiter.api.Assumptions.assumeTrue(Files.exists(path) && !apiKey.equals("sk-proj-test"), "Skipped: local test files or API key absent");
        byte[] bytes = Files.readAllBytes(path);


        ReceiptAnalysisResult result = openAiVisionService.analyzeReceipt(null, bytes);

        assertTrue(result.isReceipt(), "Must be recognized as receipt");
        assertTrue(result.getBankName().contains("Freedom"));
        assertEquals("806040152838843337", result.getReceiptNumber());
        assertEquals(16000, result.getAmountKzt());
        assertEquals("5096", result.getRecipientCardLast4());
    }
}
