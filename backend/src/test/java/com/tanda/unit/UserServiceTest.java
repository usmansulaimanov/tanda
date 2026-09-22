package com.tanda.unit;

import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.SavedBookRepository;
import com.tanda.repository.UserRepository;
import com.tanda.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService — Mockito only, no Spring context.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SavedBookRepository savedBookRepository;

    @Mock
    private com.tanda.repository.ManagerPermissionRepository managerPermissionRepository;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private com.tanda.service.ReservedUsernameService reservedUsernameService;

    @Mock
    private com.tanda.repository.PremiumEntitlementRepository premiumEntitlementRepository;

    @Mock
    private com.tanda.repository.BirthdayGiftRepository birthdayGiftRepository;

    @InjectMocks
    private UserService userService;

    private User adminUser;
    private User clientUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id("admin-1")
                .email("admin@tanda.kz")
                .role("admin")
                .isActive(true)
                .idNumber("000 001")
                .name("Admin")
                .build();

        clientUser = User.builder()
                .id("user-001")
                .email("alice@tanda.kz")
                .role("client")
                .isActive(true)
                .idNumber("001 001")
                .name("Alice")
                .build();
    }

    @Test
    @DisplayName("deleteUser() throws BadRequestException when deleting the last active admin")
    void deleteUserThrowsWhenLastActiveAdmin() {
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser)); // only one admin

        assertThrows(BadRequestException.class, () -> userService.deleteUser("admin-1"));

        verify(userRepository, never()).deleteById(anyString());
    }

    @Test
    @DisplayName("deleteUser() succeeds when there is another active admin")
    void deleteUserSucceedsWhenAnotherAdminExists() {
        User secondAdmin = User.builder()
                .id("admin-2")
                .email("admin2@tanda.kz")
                .role("admin")
                .isActive(true)
                .build();

        when(userRepository.findById("admin-1")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser, secondAdmin));

        assertDoesNotThrow(() -> userService.deleteUser("admin-1"));
        verify(userRepository).deleteById("admin-1");
    }

    @Test
    @DisplayName("deleteUser() throws ResourceNotFoundException for non-existent user")
    void deleteUserThrowsForNonExistentUser() {
        when(userRepository.findById("ghost-id")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.deleteUser("ghost-id"));
    }

    @Test
    @DisplayName("updateUser() blocks demotion of last active admin")
    void updateUserBlocksDemotionOfLastAdmin() {
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByRole("admin")).thenReturn(List.of(adminUser));

        UpdateUserRequestDto dto = UpdateUserRequestDto.builder()
                .role("client") // attempt to demote
                .build();

        assertThrows(BadRequestException.class, () -> userService.updateUser("admin-1", dto));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUser() throws BadRequestException for invalid role value")
    void updateUserThrowsForInvalidRole() {
        when(userRepository.findById("user-001")).thenReturn(Optional.of(clientUser));

        UpdateUserRequestDto dto = UpdateUserRequestDto.builder()
                .role("superuser") // invalid role
                .build();

        assertThrows(BadRequestException.class, () -> userService.updateUser("user-001", dto));
    }

    @Test
    @DisplayName("getAllUsers() uses batch count query — savedBookRepository called once per batch, not per user")
    void getAllUsersUsesBatchCountQuery() {
        when(userRepository.findAll()).thenReturn(List.of(adminUser, clientUser));
        when(savedBookRepository.countSavedBooksByUserIds(anyList())).thenReturn(List.of());

        userService.getAllUsers(null, null);

        // Verify countSavedBooksByUserIds was called exactly once (batch), not twice (N+1)
        verify(savedBookRepository, times(1)).countSavedBooksByUserIds(anyList());
        verify(savedBookRepository, never()).findBookIdsByUserId(anyString());
    }
}
