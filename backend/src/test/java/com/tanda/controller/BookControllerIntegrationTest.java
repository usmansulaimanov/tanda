package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.AudioChapterDto;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.UpdateBookRequestDto;
import com.tanda.entity.Book;
import com.tanda.repository.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookRepository bookRepository;

    @BeforeEach
    void setUp() {
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
    }

    @Test
    @DisplayName("GET /api/v1/books returns 200 OK and book list")
    void testGetAllBooks() throws Exception {
        mockMvc.perform(get("/api/v1/books")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", notNullValue()))
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("GET /api/v1/books with category filter returns matching books")
    void testGetBooksByCategory() throws Exception {
        mockMvc.perform(get("/api/v1/books")
                        .param("category", "Классика")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].category", is("Классика")));
    }

    @Test
    @DisplayName("GET /api/v1/books with search query returns matching books")
    void testGetBooksBySearch() throws Exception {
        mockMvc.perform(get("/api/v1/books")
                        .param("search", "Тест кітап")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title", is("Тест кітап")));
    }

    @Test
    @DisplayName("GET /api/v1/books/{id} returns 200 OK for existing book with details")
    void testGetBookByIdSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/books/test-book-1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is("test-book-1")))
                .andExpect(jsonPath("$.title", is("Тест кітап")))
                .andExpect(jsonPath("$.author", is("Тест автор")))
                .andExpect(jsonPath("$.category", is("Классика")))
                .andExpect(jsonPath("$.audioChapters", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/v1/books/{id} returns 404 NOT_FOUND for non-existing book")
    void testGetBookByIdNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/books/non-existing-book-id-999")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("POST /api/v1/books creates a new book and returns 201 CREATED")
    void testCreateBookSuccess() throws Exception {
        String newId = "new-created-book-" + System.currentTimeMillis();
        CreateBookRequestDto request = CreateBookRequestDto.builder()
                .id(newId)
                .title("Жаңа кітап")
                .author("Жаңа автор")
                .category("Бизнес")
                .pages(250)
                .hasAudio(true)
                .audioNarrator("Диктор Жаңа")
                .audioDuration("45 минут")
                .audioUrl("https://example.com/new.mp3")
                .coverImage("https://example.com/new.jpg")
                .isFree(true)
                .isArchived(false)
                .gradient("linear-gradient(135deg, #111, #222)")
                .description("Жаңа бизнес кітап сипаттамасы")
                .audioChapters(List.of(
                        AudioChapterDto.builder()
                                .id("new-ch-1")
                                .title("1-тарау")
                                .audioUrl("https://example.com/ch1.mp3")
                                .duration("10:00")
                                .chapterOrder(1)
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(newId)))
                .andExpect(jsonPath("$.title", is("Жаңа кітап")))
                .andExpect(jsonPath("$.author", is("Жаңа автор")))
                .andExpect(jsonPath("$.category", is("Бизнес")))
                .andExpect(jsonPath("$.pages", is(250)));
    }

    @Test
    @DisplayName("POST /api/v1/books returns 400 BAD_REQUEST when validation fails")
    void testCreateBookValidationFailure() throws Exception {
        CreateBookRequestDto invalidRequest = CreateBookRequestDto.builder()
                .title("") // Blank title -> validation violation
                .author("Автор")
                .category("Классика")
                .pages(0) // Pages < 1 -> validation violation
                .build();

        mockMvc.perform(post("/api/v1/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("PUT /api/v1/books/{id} updates book and returns 200 OK")
    void testUpdateBookSuccess() throws Exception {
        String updateTargetId = "book-to-update-" + System.currentTimeMillis();
        Book book = Book.builder()
                .id(updateTargetId)
                .title("Бастапқы атауы")
                .author("Бастапқы автор")
                .category("Тарих")
                .pages(100)
                .hasAudio(false)
                .isFree(true)
                .isArchived(false)
                .createdAt(OffsetDateTime.now())
                .build();
        bookRepository.save(book);

        UpdateBookRequestDto updateRequest = UpdateBookRequestDto.builder()
                .title("Жаңартылған атауы")
                .author("Жаңартылған автор")
                .description("Жаңартылған сипаттама")
                .category("Тарих")
                .pages(120)
                .hasAudio(true)
                .audioNarrator("Жаңа диктор")
                .audioDuration("15 минут")
                .audioUrl("https://example.com/updated.mp3")
                .coverImage("https://example.com/updated.jpg")
                .isFree(false)
                .isArchived(false)
                .gradient("linear-gradient(135deg, #444, #555)")
                .audioChapters(List.of(
                        AudioChapterDto.builder()
                                .title("Кіріспе")
                                .audioUrl("https://example.com/intro.mp3")
                                .duration("05:00")
                                .chapterOrder(1)
                                .build()
                ))
                .build();

        mockMvc.perform(put("/api/v1/books/" + updateTargetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(updateTargetId)))
                .andExpect(jsonPath("$.title", is("Жаңартылған атауы")))
                .andExpect(jsonPath("$.author", is("Жаңартылған автор")))
                .andExpect(jsonPath("$.pages", is(120)))
                .andExpect(jsonPath("$.hasAudio", is(true)))
                .andExpect(jsonPath("$.isFree", is(false)));
    }

    @Test
    @DisplayName("DELETE /api/v1/books/{id} removes book and returns 204 NO_CONTENT")
    void testDeleteBookSuccess() throws Exception {
        String deleteTargetId = "book-to-delete-" + System.currentTimeMillis();
        Book book = Book.builder()
                .id(deleteTargetId)
                .title("Өшірілетін кітап")
                .author("Өшірілетін автор")
                .category("Психология")
                .pages(80)
                .hasAudio(false)
                .isFree(true)
                .isArchived(false)
                .createdAt(OffsetDateTime.now())
                .build();
        bookRepository.save(book);

        mockMvc.perform(delete("/api/v1/books/" + deleteTargetId))
                .andExpect(status().isNoContent());

        assertFalse(bookRepository.existsById(deleteTargetId));
    }
}
