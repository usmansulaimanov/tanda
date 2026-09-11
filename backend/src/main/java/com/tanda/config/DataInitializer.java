package com.tanda.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.entity.AudioChapter;
import com.tanda.entity.Book;
import com.tanda.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final BookRepository bookRepository;
    private final com.tanda.repository.UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminUser();

        if (bookRepository.count() > 0) {
            log.info("Books repository already contains data. Skipping initial seeding.");
            return;
        }

        log.info("Seeding initial books data...");
        try {
            ClassPathResource resource = new ClassPathResource("data/books.json");
            if (!resource.exists()) {
                log.warn("Initial data file data/books.json not found on classpath.");
                seedFallbackBooks();
                return;
            }

            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                if (root.isArray()) {
                    List<Book> books = new ArrayList<>();
                    for (JsonNode node : root) {
                        String id = node.path("id").asText();
                        String title = node.path("title").asText();
                        String author = node.path("author").asText();
                        String category = node.path("category").asText("Классика");
                        int pages = node.path("pages").isInt() ? node.path("pages").asInt() : 100;
                        boolean hasAudio = node.path("hasAudio").asBoolean(false);
                        String audioNarrator = node.hasNonNull("audioNarrator") ? node.path("audioNarrator").asText() : null;
                        String audioDuration = node.hasNonNull("audioDuration") ? node.path("audioDuration").asText() : null;
                        String audioUrl = node.hasNonNull("audioUrl") ? node.path("audioUrl").asText() : "";
                        String coverImage = node.hasNonNull("coverImage") ? node.path("coverImage").asText() : "";
                        boolean isFree = node.path("isFree").asBoolean(true);
                        boolean isArchived = node.path("isArchived").asBoolean(false);
                        String gradient = node.hasNonNull("gradient") ? node.path("gradient").asText() : null;
                        String description = node.hasNonNull("description") ? node.path("description").asText() : "";

                        Book book = Book.builder()
                                .id(id)
                                .title(title)
                                .author(author)
                                .category(category)
                                .pages(pages)
                                .hasAudio(hasAudio)
                                .audioNarrator(audioNarrator)
                                .audioDuration(audioDuration)
                                .audioUrl(audioUrl)
                                .coverImage(coverImage)
                                .isFree(isFree)
                                .isArchived(isArchived)
                                .gradient(gradient)
                                .description(description)
                                .createdAt(OffsetDateTime.now())
                                .audioChapters(new ArrayList<>())
                                .build();

                        JsonNode chaptersNode = node.path("audioChapters");
                        if (chaptersNode.isArray()) {
                            int order = 1;
                            for (JsonNode chNode : chaptersNode) {
                                String chId = chNode.path("id").asText("ch-" + order);
                                String chTitle = chNode.path("title").asText("Тарау " + order);
                                String chDuration = chNode.path("duration").asText("03:00");
                                String chAudioUrl = chNode.hasNonNull("audioUrl") ? chNode.path("audioUrl").asText() : "";

                                AudioChapter chapter = AudioChapter.builder()
                                        .id(chId)
                                        .title(chTitle)
                                        .duration(chDuration)
                                        .audioUrl(chAudioUrl)
                                        .chapterOrder(order++)
                                        .build();
                                book.addAudioChapter(chapter);
                            }
                        }

                        books.add(book);
                    }
                    bookRepository.saveAll(books);
                    log.info("Successfully seeded {} books from data/books.json", books.size());
                }
            }
        } catch (Exception e) {
            log.error("Failed to seed books from json: {}", e.getMessage(), e);
            seedFallbackBooks();
        }
    }

    private void seedFallbackBooks() {
        if (bookRepository.count() > 0) return;
        Book karaSozder = Book.builder()
                .id("kara-sozder")
                .title("Қара сөздер")
                .author("Абай Құнанбайұлы")
                .category("Классика")
                .pages(140)
                .hasAudio(true)
                .audioNarrator("Берік Айтжанов")
                .audioDuration("2 сағат 15 минут")
                .audioUrl("")
                .coverImage("")
                .isFree(true)
                .isArchived(false)
                .gradient("linear-gradient(135deg, #3F3F46, #18181B)")
                .description("Абайдың философиялық және адамгершілік ой-толғаулары жинақталған классикалық туынды.")
                .createdAt(OffsetDateTime.now())
                .audioChapters(new ArrayList<>())
                .build();

        karaSozder.addAudioChapter(AudioChapter.builder()
                .id("ch-1")
                .title("1-сөз")
                .duration("03:45")
                .audioUrl("")
                .chapterOrder(1)
                .build());

        bookRepository.save(karaSozder);
        log.info("Seeded fallback book 'kara-sozder'");
    }

    private void seedAdminUser() {
        com.tanda.entity.User admin = userRepository.findByEmail("admin@tanda.kz").orElse(null);
        if (admin == null) {
            admin = com.tanda.entity.User.builder()
                    .id("admin-1")
                    .idNumber("000 001")
                    .name("Администратор")
                    .email("admin@tanda.kz")
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
        }
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        userRepository.save(admin);
        log.info("Seeded/updated default admin user: admin@tanda.kz (password: admin123)");
    }
}
