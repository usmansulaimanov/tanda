package com.tanda.service;

import com.tanda.dto.auth.AuthResponseDto;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional(readOnly = true)
    public AuthResponseDto login(LoginRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Пайдаланушы табылмады немесе құпия сөз қате"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Пайдаланушы табылмады немесе құпия сөз қате");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new BadCredentialsException("Аккаунт бұғатталған");
        }

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponseDto.builder()
                .token(token)
                .user(toUserDto(user))
                .build();
    }

    @Transactional
    public AuthResponseDto register(RegisterRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Бұл email жүйеде тіркелген");
        }

        long clientCount = userRepository.countByRole("client");
        String idNumber = formatIdNumber(1001 + clientCount);

        User user = User.builder()
                .id("user-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber(idNumber)
                .name(dto.getName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .role("client")
                .isActive(true)
                .build();

        user = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user);
        return AuthResponseDto.builder()
                .token(token)
                .user(toUserDto(user))
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponseDto getMe(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады"));
        return toUserDto(user);
    }

    public UserResponseDto toUserDto(User user) {
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

    private String formatIdNumber(long num) {
        String str = String.format("%06d", num);
        return str.substring(0, 3) + " " + str.substring(3);
    }
}
