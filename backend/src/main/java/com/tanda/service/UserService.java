package com.tanda.service;

import com.tanda.dto.user.UpdateUserRequestDto;
import com.tanda.dto.user.UserListResponseDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.SavedBookRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SavedBookRepository savedBookRepository;

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

        return users.stream()
                .map(this::toUserListDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponseDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + id));
        return toUserDto(user);
    }

    @Transactional
    public UserResponseDto updateUser(String id, UpdateUserRequestDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + id));

        boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());
        boolean willDemote = dto.getRole() != null && !dto.getRole().trim().equalsIgnoreCase("admin");
        boolean willDeactivate = dto.getIsActive() != null && Boolean.FALSE.equals(dto.getIsActive());

        if (isAdmin && Boolean.TRUE.equals(user.getIsActive()) && (willDemote || willDeactivate)) {
            long otherActiveAdminCount = userRepository.findByRole("admin").stream()
                    .filter(u -> !u.getId().equals(id) && Boolean.TRUE.equals(u.getIsActive()))
                    .count();
            if (otherActiveAdminCount < 1) {
                throw new BadRequestException("Cannot deactivate or demote the last remaining admin");
            }
        }

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getRole() != null && !dto.getRole().isBlank()) {
            String newRole = dto.getRole().trim().toLowerCase();
            if (!newRole.equals("admin") && !newRole.equals("client")) {
                throw new BadRequestException("Role must be 'admin' or 'client'");
            }
            user.setRole(newRole);
        }
        if (dto.getIsActive() != null) {
            user.setIsActive(dto.getIsActive());
        }

        user = userRepository.save(user);
        return toUserDto(user);
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
                throw new BadRequestException("Cannot delete the last remaining admin");
            }
        }

        userRepository.deleteById(id);
    }

    private UserResponseDto toUserDto(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .idNumber(user.getIdNumber())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private UserListResponseDto toUserListDto(User user) {
        int savedCount = savedBookRepository.findBookIdsByUserId(user.getId()).size();
        return UserListResponseDto.builder()
                .id(user.getId())
                .idNumber(user.getIdNumber())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .savedBooksCount(savedCount)
                .build();
    }
}
