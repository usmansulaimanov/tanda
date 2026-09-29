package com.tanda.unit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.service.OpenAiVisionService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class OpenAiVisionPdfTest {

    private OpenAiVisionService visionService;

    @BeforeEach
    void setUp() {
        visionService = new OpenAiVisionService(new ObjectMapper());
    }

    private byte[] createTestPdf(String text) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                contentStream.newLineAtOffset(100, 700);
                contentStream.showText(text);
                contentStream.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    @Test
    @DisplayName("Should detect PDF file by magic bytes %PDF")
    void testIsPdfDetection() throws IOException {
        byte[] pdfBytes = createTestPdf("Kaspi Receipt 12345678");
        assertTrue(visionService.isPdf(pdfBytes));

        byte[] nonPdf = new byte[]{0x01, 0x02, 0x03, 0x04};
        assertFalse(visionService.isPdf(nonPdf));
        assertFalse(visionService.isPdf(null));
        assertFalse(visionService.isPdf(new byte[0]));
    }

    @Test
    @DisplayName("Should render PDF first page to JPEG bytes")
    void testConvertPdfFirstPageToImage() throws IOException {
        byte[] pdfBytes = createTestPdf("Kaspi Payment Receipt 2500 KZT");
        byte[] imageBytes = visionService.convertPdfFirstPageToImage(pdfBytes);

        assertNotNull(imageBytes);
        assertTrue(imageBytes.length > 0);
        // JPEG magic bytes: 0xFF, 0xD8
        assertEquals((byte) 0xFF, imageBytes[0]);
        assertEquals((byte) 0xD8, imageBytes[1]);
    }
}
