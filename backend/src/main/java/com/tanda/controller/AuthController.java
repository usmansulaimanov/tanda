package com.tanda.controller;

import com.tanda.dto.auth.AuthResponseDto;
import com.tanda.dto.auth.GoogleAuthRequestDto;
import com.tanda.dto.auth.LoginRequestDto;
import com.tanda.dto.auth.RegisterRequestDto;
import com.tanda.dto.user.UserResponseDto;
import com.tanda.security.UserPrincipal;
import com.tanda.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    public static final String REFRESH_COOKIE_NAME = "refreshToken";
    public static final long REFRESH_COOKIE_MAX_AGE = 30L * 24 * 60 * 60; // 30 days

    @PostMapping("/google")
    public ResponseEntity<AuthResponseDto> googleLogin(@Valid @RequestBody GoogleAuthRequestDto request,
                                                       HttpServletRequest httpRequest) {
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = getClientIp(httpRequest);
        AuthService.AuthResult result = authService.loginWithGoogle(request.getCredential(), userAgent, ipAddress);

        ResponseCookie cookie = createRefreshTokenCookie(result.rawRefreshToken(), REFRESH_COOKIE_MAX_AGE);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.responseDto());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto request,
                                                 HttpServletRequest httpRequest) {
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = getClientIp(httpRequest);
        AuthService.AuthResult result = authService.login(request, userAgent, ipAddress);

        ResponseCookie cookie = createRefreshTokenCookie(result.rawRefreshToken(), REFRESH_COOKIE_MAX_AGE);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.responseDto());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterRequestDto request,
                                                    HttpServletRequest httpRequest) {
        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = getClientIp(httpRequest);
        AuthService.AuthResult result = authService.register(request, userAgent, ipAddress);

        ResponseCookie cookie = createRefreshTokenCookie(result.rawRefreshToken(), REFRESH_COOKIE_MAX_AGE);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.responseDto());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDto> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieToken,
            @RequestBody(required = false) Map<String, String> bodyToken,
            HttpServletRequest httpRequest) {

        String rawToken = cookieToken;
        if ((rawToken == null || rawToken.isBlank()) && bodyToken != null) {
            rawToken = bodyToken.get("refreshToken");
        }

        String userAgent = httpRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = getClientIp(httpRequest);

        AuthService.AuthResult result = authService.refreshToken(rawToken, userAgent, ipAddress);
        ResponseCookie cookie = createRefreshTokenCookie(result.rawRefreshToken(), REFRESH_COOKIE_MAX_AGE);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.responseDto());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieToken,
            @RequestBody(required = false) Map<String, String> bodyToken) {

        String rawToken = cookieToken;
        if ((rawToken == null || rawToken.isBlank()) && bodyToken != null) {
            rawToken = bodyToken.get("refreshToken");
        }

        if (rawToken != null) {
            authService.logout(rawToken);
        }

        ResponseCookie clearCookie = createRefreshTokenCookie("", 0);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(Map.of("message", "Сәтті шықтыңыз"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getMe(principal.getEmail()));
    }

    private ResponseCookie createRefreshTokenCookie(String token, long maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank()) {
            return cfIp.trim();
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
