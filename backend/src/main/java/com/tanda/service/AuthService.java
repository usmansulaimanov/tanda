package com.tanda.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.tanda.dto.auth.AuthResponseDto;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.exception.UnauthorizedException;
import com.tanda.repository.UserRepository;
import com.tanda.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final EmailVerificationService emailVerificationService;
    private final ReservedUsernameService reservedUsernameService;
    private final MessageService messageService;
    private final com.tanda.repository.ManagerPermissionRepository managerPermissionRepository;

    public record AuthResult(AuthResponseDto responseDto, String rawRefreshToken) {}

    @Transactional
    public AuthResult loginWithGoogle(String credential, String userAgent, String ipAddress) {
        // Step 1: Verify Google ID token signature, audience, expiry
        GoogleIdToken.Payload payload = googleTokenVerifier.verify(credential);

        // Step 2: Validate that Google has verified this email address
        Boolean emailVerified = payload.getEmailVerified();
        if (emailVerified != null && !emailVerified) {
            throw new BadCredentialsException("Google email расталмаған");
        }

        String googleId = payload.getSubject();
        String email = payload.getEmail() != null ? payload.getEmail().trim().toLowerCase() : null;
        if (email == null || email.isBlank()) {
            throw new BadCredentialsException("Google профилінде email табылмады");
        }

        String name = (String) payload.get("name");
        if (name == null || name.isBlank()) {
            name = email.split("@")[0];
        }
        String picture = (String) payload.get("picture");

        // Step 3: Find existing user by googleId first, then by email
        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElse(null);

        boolean isNewGoogleUser = (user == null);
        if (user == null) {
            // Auto-register new Google user with strictly 'client' role
            long clientCount = userRepository.countByRole("client");
            String idNumber = formatIdNumber(1001 + clientCount);
            user = User.builder()
                    .id("user-" + UUID.randomUUID().toString().substring(0, 8))
                    .idNumber(idNumber)
                    .name(name.trim())
                    .email(email)
                    .passwordHash(null)
                    .googleId(googleId)
                    .authProvider("GOOGLE")
                    .avatarUrl(picture)
                    .role("client")
                    .isActive(true)
                    .build();
            log.info("Google арқылы жаңа пайдаланушы тіркелді: {}", email);
        } else {
            // Check account active status
            if (Boolean.FALSE.equals(user.getIsActive()) || Boolean.TRUE.equals(user.getIsBlocked())) {
                throw new BadCredentialsException("Аккаунт бұғатталған");
            }

            // Link googleId and sync avatar if available
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
            }
            if (picture != null && !picture.isBlank()) {
                user.setAvatarUrl(picture);
            }
            if (user.getAuthProvider() == null) {
                user.setAuthProvider("GOOGLE");
            }
            log.info("Google арқылы кіру: {}", email);
        }

        user = userRepository.save(user);
        if (isNewGoogleUser) {
            messageService.createWelcomeMessage(user.getId(), user.getName());
        }
        String token = jwtTokenProvider.generateToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user, userAgent, ipAddress);

        AuthResponseDto dto = AuthResponseDto.builder()
                .token(token)
                .user(toUserDto(user))
                .build();
        return new AuthResult(dto, rawRefreshToken);
    }

    @Transactional
    public AuthResult login(LoginRequestDto dto, String userAgent, String ipAddress) {
        String email = dto.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Пайдаланушы табылмады немесе құпия сөз қате"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(dto.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Пайдаланушы табылмады немесе құпия сөз қате");
        }

        if (Boolean.FALSE.equals(user.getIsActive()) || Boolean.TRUE.equals(user.getIsBlocked())) {
            throw new BadCredentialsException("Аккаунт бұғатталған");
        }

        String token = jwtTokenProvider.generateToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user, userAgent, ipAddress);

        AuthResponseDto responseDto = AuthResponseDto.builder()
                .token(token)
                .user(toUserDto(user))
                .build();
        return new AuthResult(responseDto, rawRefreshToken);
    }

    public void sendVerificationCode(com.tanda.dto.auth.SendVerificationCodeRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if ("REGISTER".equalsIgnoreCase(dto.getType()) && userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Бұл email бойынша пайдаланушы тіркеліп қойған");
        }
        emailVerificationService.sendVerificationCode(email, dto.getType());
    }

    @Transactional
    public AuthResult register(RegisterRequestDto dto, String userAgent, String ipAddress) {
        String email = dto.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Бұл email жүйеде тіркелген");
        }

        if (dto.getCode() != null && !dto.getCode().isBlank()) {
            emailVerificationService.verifyCode(email, dto.getCode());
        }

        long clientCount = userRepository.countByRole("client");
        String idNumber = formatIdNumber(1001 + clientCount);

        User user = User.builder()
                .id("user-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber(idNumber)
                .name(dto.getName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .authProvider("LOCAL")
                .role("client")
                .isActive(true)
                .build();

        user = userRepository.save(user);
        messageService.createWelcomeMessage(user.getId(), user.getName());

        String token = jwtTokenProvider.generateToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user, userAgent, ipAddress);

        AuthResponseDto responseDto = AuthResponseDto.builder()
                .token(token)
                .user(toUserDto(user))
                .build();
        return new AuthResult(responseDto, rawRefreshToken);
    }

    @Transactional
    public AuthResponseDto loginWithGoogle(String credential) {
        return loginWithGoogle(credential, null, null).responseDto();
    }

    @Transactional
    public AuthResponseDto login(LoginRequestDto dto) {
        return login(dto, null, null).responseDto();
    }

    @Transactional
    public AuthResponseDto register(RegisterRequestDto dto) {
        return register(dto, null, null).responseDto();
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public AuthResult refreshToken(String rawRefreshToken, String userAgent, String ipAddress) {
        RefreshTokenService.TokenRotationResult result = refreshTokenService.rotateRefreshToken(rawRefreshToken, userAgent, ipAddress);
        AuthResponseDto responseDto = AuthResponseDto.builder()
                .token(result.newAccessToken())
                .user(toUserDto(result.user()))
                .build();
        return new AuthResult(responseDto, result.newRawRefreshToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revokeToken(rawRefreshToken);
    }

    @Transactional(readOnly = true)
    public UserResponseDto getMe(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады"));
        return toUserDto(user);
    }

    public UserResponseDto toUserDto(User user) {
        List<String> permissions = managerPermissionRepository.findByUserId(user.getId()).stream()
                .map(com.tanda.entity.ManagerPermission::getPermission)
                .collect(java.util.stream.Collectors.toList());

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

    @Transactional
    public UserResponseDto updateProfile(String email, com.tanda.dto.auth.UpdateProfileRequestDto request) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады"));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().isBlank() ? null : request.getAvatarUrl().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getUsername() != null) {
            String newUsername = request.getUsername().trim().toLowerCase().replaceAll("^@", "");
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
        if (request.getBirthDate() != null) {
            user.setBirthDate(request.getBirthDate().trim());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender().trim());
        }
        user = userRepository.save(user);
        return toUserDto(user);
    }

    @Transactional
    public void changePassword(String email, com.tanda.dto.auth.ChangePasswordRequestDto request) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Қазіргі құпиясөз қате");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password successfully changed for user: {}", email);
    }

    private String formatIdNumber(long num) {
        String str = String.format("%06d", num);
        return str.substring(0, 3) + " " + str.substring(3);
    }
}
