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
    @Value("${app.admin.initial-password:#{null}}")
    private String adminInitialPassword;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminUser();
    }

    private void seedAdminUser() {
        com.tanda.entity.User admin = userRepository.findByEmail("admin@tanda.kz").orElse(null);
        if (admin == null) {
            if (adminInitialPassword == null || adminInitialPassword.isBlank()) {
                log.info("ADMIN_INITIAL_PASSWORD is not configured. Skipping default admin user creation.");
                return;
            }
            String encodedPassword = passwordEncoder.encode(adminInitialPassword);
            admin = com.tanda.entity.User.builder()
                    .id("admin-1")
                    .idNumber("000 001")
                    .name("Администратор")
                    .email("admin@tanda.kz")
                    .passwordHash(encodedPassword)
                    .role("admin")
                    .isActive(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created: admin@tanda.kz with password from ADMIN_INITIAL_PASSWORD.");
        } else {
            log.debug("Admin user already exists, skipping seed.");
        }
    }
}
