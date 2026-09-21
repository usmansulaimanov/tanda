package com.tanda.unit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanda.config.DataInitializer;
import com.tanda.entity.User;
import com.tanda.repository.BookRepository;
import com.tanda.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DataInitializer — verifies admin seed behavior.
 */
@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private BookRepository bookRepository;

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private DataInitializer dataInitializer;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4);
        dataInitializer = new DataInitializer(bookRepository, userRepository, passwordEncoder, new ObjectMapper());
        dataInitializer.setAdminInitialPassword("admin123");
    }

    @Test
    @DisplayName("seedAdminUser() creates admin when none exists and password is provided")
    void seedAdminCreatesUserWhenAbsent() throws Exception {
        when(userRepository.findByEmail("admin@tanda.kz")).thenReturn(Optional.empty());
        when(bookRepository.count()).thenReturn(1L); // skip book seeding

        dataInitializer.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User savedAdmin = captor.getValue();
        assertEquals("admin@tanda.kz", savedAdmin.getEmail());
        assertEquals("admin", savedAdmin.getRole());
        assertTrue(savedAdmin.getIsActive());
        assertNotNull(savedAdmin.getPasswordHash());
        // Password should be BCrypt-encoded, not plain text
        assertTrue(savedAdmin.getPasswordHash().startsWith("$2a$") || savedAdmin.getPasswordHash().startsWith("$2b$"),
                "Password should be BCrypt hashed");
    }

    @Test
    @DisplayName("seedAdminUser() skips admin creation when ADMIN_INITIAL_PASSWORD is unset")
    void seedAdminSkipsWhenPasswordUnset() throws Exception {
        dataInitializer.setAdminInitialPassword(null);
        when(userRepository.findByEmail("admin@tanda.kz")).thenReturn(Optional.empty());
        when(bookRepository.count()).thenReturn(1L);

        dataInitializer.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("seedAdminUser() does NOT overwrite existing admin password on restart")
    void seedAdminDoesNotOverwriteExistingAdminPassword() throws Exception {
        String existingHash = passwordEncoder.encode("custom-admin-password-set-by-real-admin");
        User existingAdmin = User.builder()
                .id("admin-1")
                .email("admin@tanda.kz")
                .role("admin")
                .isActive(true)
                .passwordHash(existingHash)
                .build();

        when(userRepository.findByEmail("admin@tanda.kz")).thenReturn(Optional.of(existingAdmin));
        when(bookRepository.count()).thenReturn(1L); // skip book seeding

        dataInitializer.run();

        // Should NOT call save() since admin already exists
        verify(userRepository, never()).save(any());
        // Password should remain the same
        assertEquals(existingHash, existingAdmin.getPasswordHash());
    }
}
