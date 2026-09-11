package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.entity.Book;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import com.tanda.repository.SavedBookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.ArrayList;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SavedBookAndProgressIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private SavedBookRepository savedBookRepository;

    @Autowired
    private ReadingProgressRepository progressRepository;

    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        savedBookRepository.deleteAll();
        progressRepository.deleteAll();

        if (!bookRepository.existsById("test-book-1")) {
            Book testBook = Book.builder()
                    .id("test-book-1")
                    .title("Тест кітап")
                    .author("Тест автор")
                    .category("Классика")
                    .pages(150)
                    .hasAudio(true)
                    .audioNarrator("Диктор 1")
                    .audioDuration("1 сағат")
                    .audioUrl("https://example.com/audio.mp3")
                    .coverImage("https://example.com/cover.jpg")
                    .isFree(true)
                    .isArchived(false)
                    .gradient("linear-gradient(135deg, #000, #333)")
                    .description("Тест сипаттамасы")
                    .createdAt(OffsetDateTime.now())
                    .audioChapters(new ArrayList<>())
                    .build();
            bookRepository.save(testBook);
        }

        LoginRequestDto request = LoginRequestDto.builder()
                .email("admin@tanda.kz")
                .password("admin123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        adminToken = objectMapper.readTree(body).path("token").asText();
    }

    @Test
    @DisplayName("Saved books flow: Save, Get, and Delete")
    void testSavedBooksFlow() throws Exception {
        // Save book
        mockMvc.perform(post("/api/saved-books/test-book-1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.saved", is(true)));

        // Get saved books
        mockMvc.perform(get("/api/saved-books")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookIds[0]", is("test-book-1")));

        // Delete saved book
        mockMvc.perform(delete("/api/saved-books/test-book-1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Reading progress flow: Update and Get")
    void testReadingProgressFlow() throws Exception {
        ReadingProgressRequestDto progressDto = ReadingProgressRequestDto.builder()
                .currentPage(42)
                .currentAudioChapterId("ch-1")
                .currentAudioTime(120)
                .build();

        mockMvc.perform(put("/api/progress/test-book-1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(progressDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPage", is(42)))
                .andExpect(jsonPath("$.currentAudioTime", is(120)));

        mockMvc.perform(get("/api/progress/test-book-1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPage", is(42)))
                .andExpect(jsonPath("$.currentAudioTime", is(120)));
    }

    @Test
    @DisplayName("Reading progress update rejects invalid currentPage (0) with 400 Bad Request")
    void testReadingProgressValidationInvalidPage() throws Exception {
        ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                .currentPage(0)
                .currentAudioTime(10)
                .build();

        mockMvc.perform(put("/api/progress/test-book-1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Reading progress update rejects negative audio time (-5) with 400 Bad Request")
    void testReadingProgressValidationInvalidAudioTime() throws Exception {
        ReadingProgressRequestDto invalidDto = ReadingProgressRequestDto.builder()
                .currentPage(1)
                .currentAudioTime(-5)
                .build();

        mockMvc.perform(put("/api/progress/test-book-1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest());
    }
}
