package com.tanda.service;

import com.tanda.dto.user.CreateUserRequestDto;
import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.dto.user.UserListResponseDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.entity.ManagerPermission;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.ManagerPermissionRepository;
import com.tanda.repository.SavedBookRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SavedBookRepository savedBookRepository;
    private final ManagerPermissionRepository managerPermissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final ReservedUsernameService reservedUsernameService;

    @Transactional(readOnly = true)
    public List<UserListResponseDto> getAllUsers(String role, String search) {
        List<User> users;
        if ((role != null && !role.isBlank()) || (search != null && !search.isBlank())) {
            users = userRepository.searchUsers(
                    (role != null && !role.isBlank() && !role.equalsIgnoreCase("all")) ? role : null,
                    (search != null && !search.isBlank()) ? search.trim() : null
            );
        } else {
            users = userRepository.findAll();
        }

        // Single batch query instead of N+1 per user
        List<String> userIds = users.stream().map(User::getId).collect(Collectors.toList());
        Map<String, Long> savedCountMap = buildSavedCountMap(userIds);

        return users.stream()
                .map(u -> toUserListDto(u, savedCountMap.getOrDefault(u.getId(), 0L).intValue()))
                .collect(Collectors.toList());
    }

    private Map<String, Long> buildSavedCountMap(List<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return savedBookRepository.countSavedBooksByUserIds(userIds)
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
    }

    @Transactional(readOnly = true)
    public UserResponseDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + id));
        List<String> permissions = managerPermissionRepository.findByUserId(id).stream()
                .map(ManagerPermission::getPermission)
                .collect(Collectors.toList());
        return toUserDto(user, permissions);
    }

    @Transactional
    public UserResponseDto createUser(CreateUserRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Бұл email жүйеде тіркеліп қойған");
        }

        // Username validation
        String username = null;
        if (dto.getUsername() != null && !dto.getUsername().isBlank()) {
            username = dto.getUsername().trim().toLowerCase().replaceAll("^@", "");
            if (reservedUsernameService.isReserved(username)) {
                throw new BadRequestException("Бұл юзернейм жүйе тарапынан резервтелген");
            }
            if (userRepository.existsByUsernameIgnoreCase(username)) {
                throw new BadRequestException("Бұл юзернейм бос емес");
            }
        }

        // ID number generation or validation
        String idNumber = dto.getIdNumber() != null ? dto.getIdNumber().trim() : null;
        if (idNumber != null && !idNumber.isBlank()) {
            if (userRepository.existsByIdNumber(idNumber)) {
                throw new BadRequestException("Бұл ID нөмірі бос емес");
            }
        } else {
            long clientCount = userRepository.countByRole("client");
            idNumber = formatIdNumber(1001 + clientCount);
        }

        String rawRole = dto.getRole() != null ? dto.getRole().trim().toLowerCase() : "client";
        if (!rawRole.equals("admin") && !rawRole.equals("client") && !rawRole.equals("author")) {
            throw new BadRequestException("Role must be 'admin', 'client', or 'author'");
        }

        String password = dto.getPassword();
        if (password == null || password.isBlank()) {
            password = "reader123";
        }

        User user = User.builder()
                .id("user-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber(idNumber)
                .name(dto.getName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(password.trim()))
                .authProvider("LOCAL")
                .role(rawRole)
                .phone(dto.getPhone() != null ? dto.getPhone().trim() : null)
                .username(username)
                .birthDate(dto.getBirthDate() != null ? dto.getBirthDate().trim() : null)
                .gender(dto.getGender() != null ? dto.getGender().trim() : null)
                .duty(dto.getDuty() != null ? dto.getDuty().trim() : null)
                .avatarUrl(dto.getAvatarUrl())
                .personalMessage(dto.getPersonalMessage())
                .personalMessageDays(dto.getPersonalMessageDays())
                .personalMessageActive(dto.getPersonalMessageActive())
                .isActive(true)
                .isBlocked(false)
                .build();

        user = userRepository.save(user);
        log.info("Admin created user: id={}, email={}, role={}", user.getId(), user.getEmail(), user.getRole());
        return toUserDto(user, Collections.emptyList());
    }

    @Transactional
    public UserResponseDto updateUser(String id, UpdateUserRequestDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + id));

        boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());
        boolean willDemote = dto.getRole() != null && !dto.getRole().trim().equalsIgnoreCase("admin");
        boolean willDeactivate = dto.getIsActive() != null && Boolean.FALSE.equals(dto.getIsActive());
        boolean willBlock = dto.getIsBlocked() != null && Boolean.TRUE.equals(dto.getIsBlocked());

        if (isAdmin && Boolean.TRUE.equals(user.getIsActive()) && (willDemote || willDeactivate || willBlock)) {
            long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                    .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()) && !Boolean.TRUE.equals(u.getIsBlocked()))
                    .count();
            if (otherActiveAdminCount < 1) {
                log.warn("Last-admin guard triggered: attempt to deactivate/demote/block last active admin id={}", id);
                throw new BadRequestException("Cannot deactivate or demote the last remaining admin");
            }
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            String newEmail = dto.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Бұл электронды поштамен басқа пайдаланушы тіркелген");
            }
            user.setEmail(newEmail);
        }
        if (dto.getRole() != null && !dto.getRole().isBlank()) {
            String newRole = dto.getRole().trim().toLowerCase();
            if (!newRole.equals("admin") && !newRole.equals("client") && !newRole.equals("author")) {
                throw new BadRequestException("Role must be 'admin' or 'client'");
            }
            log.info("User role changed: id={}, oldRole={}, newRole={}", id, user.getRole(), newRole);
            user.setRole(newRole);
        }
        if (dto.getUsername() != null) {
            String newUsername = dto.getUsername().trim().toLowerCase().replaceAll("^@", "");
            if (!newUsername.isBlank() && !newUsername.equalsIgnoreCase(user.getUsername())) {
                if (reservedUsernameService.isReserved(newUsername)) {
                    throw new BadRequestException("Бұл юзернейм жүйе тарапынан резервтелген");
                }
                if (userRepository.existsByUsernameIgnoreCase(newUsername)) {
                    throw new BadRequestException("Бұл юзернейм бос емес");
                }
                user.setUsername(newUsername);
            } else if (newUsername.isBlank()) {
                user.setUsername(null);
            }
        }
        if (dto.getIdNumber() != null && !dto.getIdNumber().isBlank()) {
            String newIdNumber = dto.getIdNumber().trim();
            if (!newIdNumber.equalsIgnoreCase(user.getIdNumber()) && userRepository.existsByIdNumber(newIdNumber)) {
                throw new BadRequestException("Бұл ID нөмірі бос емес");
            }
            user.setIdNumber(newIdNumber);
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone().trim());
        }
        if (dto.getBirthDate() != null) {
            user.setBirthDate(dto.getBirthDate().trim());
        }
        if (dto.getGender() != null) {
            user.setGender(dto.getGender().trim());
        }
        if (dto.getDuty() != null) {
            user.setDuty(dto.getDuty().trim());
        }
        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl().isBlank() ? null : dto.getAvatarUrl().trim());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(dto.getPassword().trim()));
        }
        if (dto.getPersonalMessage() != null) {
            user.setPersonalMessage(dto.getPersonalMessage());
        }
        if (dto.getPersonalMessageDays() != null) {
            user.setPersonalMessageDays(dto.getPersonalMessageDays());
        }
        if (dto.getPersonalMessageActive() != null) {
            user.setPersonalMessageActive(dto.getPersonalMessageActive());
        }
        if (dto.getIsActive() != null) {
            user.setIsActive(dto.getIsActive());
        }
        if (dto.getIsBlocked() != null) {
            user.setIsBlocked(dto.getIsBlocked());
            if (Boolean.TRUE.equals(dto.getIsBlocked())) {
                user.setIsActive(false);
            }
        }

        user = userRepository.save(user);
        List<String> permissions = managerPermissionRepository.findByUserId(id).stream()
                .map(ManagerPermission::getPermission)
                .collect(Collectors.toList());
        return toUserDto(user, permissions);
    }

    @Transactional
    public UserResponseDto toggleBlockUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + id));

        boolean newBlocked = !Boolean.TRUE.equals(user.getIsBlocked());
        if (newBlocked && "admin".equalsIgnoreCase(user.getRole())) {
            long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                    .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()) && !Boolean.TRUE.equals(u.getIsBlocked()))
                    .count();
            if (otherActiveAdminCount < 1) {
                throw new BadRequestException("Cannot block the last remaining admin");
            }
        }

        user.setIsBlocked(newBlocked);
        user.setIsActive(!newBlocked);
        user = userRepository.save(user);
        log.info("User block toggled: id={}, isBlocked={}", id, newBlocked);

        List<String> permissions = managerPermissionRepository.findByUserId(id).stream()
                .map(ManagerPermission::getPermission)
                .collect(Collectors.toList());
        return toUserDto(user, permissions);
    }

    @Transactional
    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + id));

        if ("admin".equalsIgnoreCase(user.getRole())) {
            long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                    .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()))
                    .count();
            if (otherActiveAdminCount < 1) {
                log.warn("Last-admin guard triggered: attempt to delete last active admin id={}", id);
                throw new BadRequestException("Cannot delete the last remaining admin");
            }
        }

        log.info("User deleted: id={}, email={}", id, user.getEmail());
        managerPermissionRepository.deleteByUserId(id);
        userRepository.deleteById(id);
    }

    public UserResponseDto toUserDto(User user, List<String> permissions) {
        return UserResponseDto.builder()
                .id(user.getId())
                .idNumber(user.getIdNumber())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .avatarUrl(user.getAvatarUrl())
                .authProvider(user.getAuthProvider() != null ? user.getAuthProvider() : (user.getGoogleId() != null ? "GOOGLE" : "LOCAL"))
                .hasPassword(user.getPasswordHash() != null)
                .phone(user.getPhone())
                .username(user.getUsername())
                .birthDate(user.getBirthDate())
                .gender(user.getGender())
                .duty(user.getDuty())
                .personalMessage(user.getPersonalMessage())
                .personalMessageDays(user.getPersonalMessageDays())
                .personalMessageActive(user.getPersonalMessageActive())
                .isBlocked(user.getIsBlocked())
                .permissions(permissions)
                .build();
    }

    private UserListResponseDto toUserListDto(User user, int savedBooksCount) {
        return UserListResponseDto.builder()
                .id(user.getId())
                .idNumber(user.getIdNumber())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .savedBooksCount(savedBooksCount)
                .phone(user.getPhone())
                .username(user.getUsername())
                .isBlocked(user.getIsBlocked())
                .avatarUrl(user.getAvatarUrl())
                .duty(user.getDuty())
                .authProvider(user.getAuthProvider())
                .build();
    }

    private String formatIdNumber(long num) {
        String str = String.format("%08d", num);
        return str.substring(0, 4) + " " + str.substring(4);
    }
}
