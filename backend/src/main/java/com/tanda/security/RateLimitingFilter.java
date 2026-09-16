package com.tanda.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    private Bucket createAuthBucket() {
        // 20 requests per minute for auth endpoints
        Bandwidth limit = Bandwidth.classic(20, Refill.greedy(20, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createGeneralBucket() {
        // 300 requests per minute for general API endpoints
        Bandwidth limit = Bandwidth.classic(300, Refill.greedy(300, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        
        // Skip rate limiting for static assets, test endpoints or OPTIONS
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) ||
            uri.startsWith("/uploads/") ||
            uri.startsWith("/swagger-ui") ||
            uri.startsWith("/v3/api-docs") ||
            uri.startsWith("/actuator/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        boolean isAuthEndpoint = uri.contains("/auth/login") || uri.contains("/auth/register") || uri.contains("/auth/refresh");

        Bucket bucket = isAuthEndpoint
                ? authBuckets.computeIfAbsent(clientIp, k -> createAuthBucket())
                : generalBuckets.computeIfAbsent(clientIp, k -> createGeneralBucket());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for IP: {} on URI: {}", clientIp, uri);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("""
                {
                    "status": 429,
                    "error": "Too Many Requests",
                    "message": "Тым көп сұраныс жасалды. Біраз уақыттан соң қайталап көріңіз."
                }
                """);
        }
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
