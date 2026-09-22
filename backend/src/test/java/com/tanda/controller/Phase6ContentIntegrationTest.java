package com.tanda.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.dto.content.MessageRequestDto;
import com.tanda.dto.content.NewsRequestDto;
import com.tanda.dto.content.QuoteRequestDto;
import com.tanda.entity.User;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Phase6ContentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User adminUser;
    private User readerUser;
    private String adminToken;
    private String readerToken;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .id("admin-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Admin User")
                .email("admin-" + UUID.randomUUID().toString().substring(0, 6) + "@tanda.kz")
                .role("admin")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        readerUser = userRepository.save(User.builder()
                .id("reader-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Reader Test")
                .email("reader-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz")
                .role("client")
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build());

        adminToken = jwtTokenProvider.generateToken(adminUser);
        readerToken = jwtTokenProvider.generateToken(readerUser);
    }

    // --- 1. NEWS LIFECYCLE ---

    @Test
    @DisplayName("Phase 6: Admin creates news, public reads, views increment, admin deletes")
    void testNewsLifecycle() throws Exception {
        NewsRequestDto createDto = NewsRequestDto.builder()
                .title("Жаңа кітаптар қосылды")
                .content("Кітапханамызға 10 жаңа классикалық кітап қосылды.")
                .summary("10 жаңа классикалық кітап")
                .authorName("Редакция Tanda")
                .isPublished(true)
                .build();

        String res = mockMvc.perform(post("/api/v1/admin/news")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Жаңа кітаптар қосылды")))
                .andReturn().getResponse().getContentAsString();

        String newsId = objectMapper.readTree(res).get("id").asText();

        // Public GET news list
        mockMvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        // Public GET news detail
        mockMvc.perform(get("/api/v1/news/" + newsId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Жаңа кітаптар қосылды")));

        // Increment views
        mockMvc.perform(post("/api/v1/news/" + newsId + "/views"))
                .andExpect(status().isOk());

        // Admin updates news
        NewsRequestDto updateDto = NewsRequestDto.builder()
                .title("Жаңа кітаптар қосылды (Жаңартылған)")
                .content("Кітапханамызға 20 жаңа классикалық кітап қосылды.")
                .build();

        mockMvc.perform(patch("/api/v1/admin/news/" + newsId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Жаңа кітаптар қосылды (Жаңартылған)")));

        // Non-admin attempt to delete -> 403 Forbidden
        mockMvc.perform(delete("/api/v1/admin/news/" + newsId)
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isForbidden());

        // Admin deletes news
        mockMvc.perform(delete("/api/v1/admin/news/" + newsId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    // --- 2. MESSAGES LIFECYCLE & WELCOME MESSAGE ---

    @Test
    @DisplayName("Phase 6: Welcome message created on registration and reader reads it")
    void testWelcomeMessageOnRegister() throws Exception {
        String testEmail = "newuser-" + UUID.randomUUID().toString().substring(0, 6) + "@test.kz";
        RegisterRequestDto regDto = RegisterRequestDto.builder()
                .name("Жаңа Пайдаланушы")
                .email(testEmail)
                .password("Password123!")
                .build();

        String res = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regDto)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(res).get("token").asText();

        // Get personal messages: must have welcome message
        String msgRes = mockMvc.perform(get("/api/v1/me/messages")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].title", is("Tanda платформасына қош келдіңіз!")))
                .andExpect(jsonPath("$[0].isRead", is(false)))
                .andReturn().getResponse().getContentAsString();

        String msgId = objectMapper.readTree(msgRes).get(0).get("id").asText();

        // Mark as read
        mockMvc.perform(patch("/api/v1/me/messages/" + msgId + "/read")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Verify marked as read
        mockMvc.perform(get("/api/v1/me/messages")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].isRead", is(true)));
    }

    @Test
    @DisplayName("Phase 6: Admin broadcasts message and deletes it")
    void testAdminBroadcastMessage() throws Exception {
        MessageRequestDto msgDto = MessageRequestDto.builder()
                .title("Жүйелік жаңарту")
                .content("Құрметті пайдаланушылар, сайтта техникалық жұмыстар жүргізілуде.")
                .targetType("all")
                .priority("important")
                .canReaderDelete(false)
                .build();

        String res = mockMvc.perform(post("/api/v1/admin/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        String msgId = objectMapper.readTree(res).get("id").asText();

        // Reader receives broadcast message
        mockMvc.perform(get("/api/v1/me/messages")
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + msgId + "')].title", hasSize(1)));

        // Admin deletes message
        mockMvc.perform(delete("/api/v1/admin/messages/" + msgId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    // --- 3. QUOTES LIFECYCLE ---

    @Test
    @DisplayName("Phase 6: Admin manages quotes, public gets active and random quote")
    void testQuotesLifecycle() throws Exception {
        QuoteRequestDto quoteDto = QuoteRequestDto.builder()
                .text("Оқусыз білім жоқ, білімсіз күнің жоқ.")
                .author("Халық мақалы")
                .isActive(true)
                .build();

        String res = mockMvc.perform(post("/api/v1/admin/quotes")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(quoteDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.text", is("Оқусыз білім жоқ, білімсіз күнің жоқ.")))
                .andReturn().getResponse().getContentAsString();

        String quoteId = objectMapper.readTree(res).get("id").asText();

        // Public GET active quotes
        mockMvc.perform(get("/api/v1/quotes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        // Public GET random quote
        mockMvc.perform(get("/api/v1/quotes/random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text", notNullValue()));

        // Admin updates quote
        QuoteRequestDto updateDto = QuoteRequestDto.builder()
                .text("Оқу – білім азығы, білім – ырыс қазығы.")
                .author("Абай Құнанбайұлы")
                .isActive(true)
                .build();

        mockMvc.perform(patch("/api/v1/admin/quotes/" + quoteId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.author", is("Абай Құнанбайұлы")));

        // Admin deletes quote
        mockMvc.perform(delete("/api/v1/admin/quotes/" + quoteId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }
}
