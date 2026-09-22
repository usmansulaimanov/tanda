package com.tanda.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.entity.AudioChapter;
import com.tanda.entity.Book;
import com.tanda.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Setter
    @Value("${app.admin.initial-password:admin123}")
    private String adminInitialPassword;

    @Override
    public void run(String... args) {
        try {
            seedAdminUser();
        } catch (Exception e) {
            log.error("Failed to seed admin user: {}", e.getMessage(), e);
        }
        try {
            seedBooks();
        } catch (Exception e) {
            log.error("Failed to seed books: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void seedAdminUser() {
        String adminPwd = (adminInitialPassword != null && !adminInitialPassword.isBlank() && !adminInitialPassword.contains("null")) ? adminInitialPassword.trim() : "admin123";
        String encodedPassword = passwordEncoder.encode(adminPwd);

        com.tanda.entity.User admin = userRepository.findByEmail("admin@tanda.kz").orElse(null);
        if (admin == null) {
            admin = com.tanda.entity.User.builder()
                    .id("admin-1")
                    .idNumber("000 001")
                    .name("Әкімші")
                    .email("admin@tanda.kz")
                    .passwordHash(encodedPassword)
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created: admin@tanda.kz");
        } else {
            admin.setRole("admin");
            admin.setIsActive(true);
            admin.setPasswordHash(encodedPassword);
            userRepository.save(admin);
            log.info("Admin user ensured: admin@tanda.kz");
        }
    }

    @Transactional
    public void seedBooks() {
        // Delete legacy mock test books
        List<String> legacyMockIds = List.of(
            "book-fyfy", "book-ccc", "rich-dad", "atomic-habits", "kalyng-mal",
            "shakarim", "koshpendiler", "aldar-kose", "abai-joly", "kara-sozder",
            "book-aaaa", "book-men"
        );
        for (String mockId : legacyMockIds) {
            try {
                if (bookRepository.existsById(mockId)) {
                    bookRepository.deleteById(mockId);
                    log.info("Removed legacy test book: {}", mockId);
                }
            } catch (Exception e) {
                log.warn("Could not delete legacy mock book {}: {}", mockId, e.getMessage());
            }
        }

        if (bookRepository.count() == 0) {
            List<AudioChapter> chapters = new ArrayList<>();
            chapters.add(AudioChapter.builder()
                    .id("un-1")
                    .title("1-бөлім: Ұнатамын")
                    .duration("25:30")
                    .audioUrl("")
                    .chapterOrder(1)
                    .build());
            chapters.add(AudioChapter.builder()
                    .id("un-2")
                    .title("2-бөлім: Сезім сыры")
                    .duration("34:40")
                    .audioUrl("")
                    .chapterOrder(2)
                    .build());
            chapters.add(AudioChapter.builder()
                    .id("un-3")
                    .title("3-бөлім: Жүрек үні")
                    .duration("35:10")
                    .audioUrl("")
                    .chapterOrder(3)
                    .build());

            Book unatamyn = Book.builder()
                    .id("book-unatamyn")
                    .title("Ұнатамын")
                    .author("Садраддин")
                    .category("Романтика")
                    .description("Садраддиннің оқырмандар мен тыңдармандарға арналған жаңа туындысы.")
                    .pages(120)
                    .hasAudio(true)
                    .audioNarrator("Садраддин")
                    .audioDuration("1 сағат 35 минут")
                    .audioUrl("")
                    .coverImage("/covers/unatamyn.jpg")
                    .isFree(true)
                    .isArchived(false)
                    .gradient("linear-gradient(135deg, #0057A8, #003d7a)")
                    .createdAt(OffsetDateTime.now())
                    .audioChapters(chapters)
                    .build();

            for (AudioChapter chapter : chapters) {
                chapter.setBook(unatamyn);
            }

            bookRepository.save(unatamyn);
            log.info("Seeded initial book: Ұнатамын (Садраддин)");
        }
    }
}
