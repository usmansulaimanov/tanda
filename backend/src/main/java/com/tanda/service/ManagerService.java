package com.tanda.service;

import com.tanda.dto.admin.ManagerRequestDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.entity.ManagerPermission;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.ManagerPermissionRepository;
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
public class ManagerService {

    private final UserRepository userRepository;
    private final ManagerPermissionRepository managerPermissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;
    private final IdNumberService idNumberService;

    @Transactional(readOnly = true)
    public List<UserResponseDto> getAllManagers() {
        List<User> managers = userRepository.findByRole("admin");
        List<String> managerIds = managers.stream().map(User::getId).collect(Collectors.toList());

        List<ManagerPermission> allPerms = managerPermissionRepository.findByUserIdIn(managerIds);
        Map<String, List<String>> permsMap = allPerms.stream()
                .collect(Collectors.groupingBy(
                        ManagerPermission::getUserId,
                        Collectors.mapping(ManagerPermission::getPermission, Collectors.toList())
                ));

        return managers.stream()
                .map(m -> userService.toUserDto(m, permsMap.getOrDefault(m.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponseDto createManager(ManagerRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Бұл электронды поштамен пайдаланушы тіркелген");
        }

        String idNum = dto.getIdNumber() != null ? dto.getIdNumber().trim() : null;
        if (idNum != null && !idNum.isBlank()) {
            if (userRepository.existsByIdNumber(idNum)) {
                throw new BadRequestException("Бұл ID нөмірі бос емес");
            }
        } else {
            idNum = idNumberService.generateUniqueReaderId();
        }

        String username = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9_]", "");
        if (username.isBlank()) {
            username = "admin" + UUID.randomUUID().toString().substring(0, 4);
        }

        String password = dto.getPassword();
        if (password == null || password.isBlank()) {
            password = "admin" + UUID.randomUUID().toString().substring(0, 6);
        }

        User manager = User.builder()
                .id("manager-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber(idNum)
                .name(dto.getName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(password.trim()))
                .authProvider(email.contains("@gmail.com") ? "GOOGLE" : "LOCAL")
                .role("admin")
                .duty(dto.getDuty() != null ? dto.getDuty().trim() : "Көмекші")
                .avatarUrl(dto.getAvatarUrl() != null ? dto.getAvatarUrl().trim() : null)
                .username(username)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .isBlocked(false)
                .build();

        manager = userRepository.save(manager);

        List<String> perms = dto.getPermissions() != null ? dto.getPermissions() : Collections.emptyList();
        for (String perm : perms) {
            managerPermissionRepository.save(ManagerPermission.builder()
                    .userId(manager.getId())
                    .permission(perm.trim())
                    .build());
        }

        log.info("Manager created: id={}, email={}", manager.getId(), manager.getEmail());
        return userService.toUserDto(manager, perms);
    }

    @Transactional
    public UserResponseDto updateManager(String id, ManagerRequestDto dto) {
        User manager = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Көмекші табылмады id: " + id));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            manager.setName(dto.getName().trim());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            String newEmail = dto.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(manager.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Бұл электронды поштамен басқа пайдаланушы тіркелген");
            }
            manager.setEmail(newEmail);
        }
        if (dto.getDuty() != null) {
            manager.setDuty(dto.getDuty().trim());
        }
        if (dto.getAvatarUrl() != null) {
            manager.setAvatarUrl(dto.getAvatarUrl().trim());
        }
        if (dto.getIdNumber() != null && !dto.getIdNumber().isBlank()) {
            String newIdNumber = dto.getIdNumber().trim();
            if (!newIdNumber.equalsIgnoreCase(manager.getIdNumber()) && userRepository.existsByIdNumber(newIdNumber)) {
                throw new BadRequestException("Бұл ID нөмірі бос емес");
            }
            manager.setIdNumber(newIdNumber);
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            manager.setPasswordHash(passwordEncoder.encode(dto.getPassword().trim()));
        }
        if (dto.getIsActive() != null) {
            if (Boolean.FALSE.equals(dto.getIsActive()) && Boolean.TRUE.equals(manager.getIsActive())) {
                long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                        .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()) && !Boolean.TRUE.equals(u.getIsBlocked()))
                        .count();
                if (otherActiveAdminCount < 1) {
                    throw new BadRequestException("Cannot deactivate the last remaining admin");
                }
            }
            manager.setIsActive(dto.getIsActive());
        }

        manager = userRepository.save(manager);

        if (dto.getPermissions() != null) {
            managerPermissionRepository.deleteByUserId(id);
            for (String perm : dto.getPermissions()) {
                managerPermissionRepository.save(ManagerPermission.builder()
                        .userId(manager.getId())
                        .permission(perm.trim())
                        .build());
            }
        }

        List<String> perms = managerPermissionRepository.findByUserId(id).stream()
                .map(ManagerPermission::getPermission)
                .collect(Collectors.toList());

        log.info("Manager updated: id={}, email={}", manager.getId(), manager.getEmail());
        return userService.toUserDto(manager, perms);
    }

    @Transactional
    public void deleteManager(String id) {
        User manager = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Көмекші табылмады id: " + id));

        long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()) && !Boolean.TRUE.equals(u.getIsBlocked()))
                .count();
        if (otherActiveAdminCount < 1) {
            throw new BadRequestException("Cannot delete the last remaining admin");
        }

        managerPermissionRepository.deleteByUserId(id);
        userRepository.deleteById(id);
        log.info("Manager deleted: id={}, email={}", id, manager.getEmail());
    }
}
