package com.tanda.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    @Value("${spring.mail.username:tandamenapp@gmail.com}")
    private String fromEmail;

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${resend.from-email:onboarding@resend.dev}")
    private String resendFromEmail;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.from-email:tandamenapp@gmail.com}")
    private String brevoFromEmail;

    @Value("${brevo.from-name:Tanda}")
    private String brevoFromName;

    private static final int CODE_EXPIRATION_SECONDS = 600; // 10 minutes
    private static final int COOLDOWN_SECONDS = 60; // 1 minute between sends

    private static class VerificationEntry {
        final String code;
        final Instant expiresAt;
        final Instant lastSentAt;

        VerificationEntry(String code, Instant expiresAt, Instant lastSentAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.lastSentAt = lastSentAt;
        }
    }

    private final Map<String, VerificationEntry> codeStore = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public void sendVerificationCode(String email, String type) {
        String normalizedEmail = email.trim().toLowerCase();
        Instant now = Instant.now();

        VerificationEntry existing = codeStore.get(normalizedEmail);
        if (existing != null && existing.lastSentAt.plusSeconds(COOLDOWN_SECONDS).isAfter(now)) {
            long remaining = existing.lastSentAt.plusSeconds(COOLDOWN_SECONDS).getEpochSecond() - now.getEpochSecond();
            throw new IllegalArgumentException("Жаңа кодты " + remaining + " секундтан кейін қайта сұрай аласыз");
        }

        String code = String.format("%06d", secureRandom.nextInt(1000000));
        Instant expiresAt = now.plusSeconds(CODE_EXPIRATION_SECONDS);
        codeStore.put(normalizedEmail, new VerificationEntry(code, expiresAt, now));

        log.info("Растау коды жасалды: [{}] -> {}", code, normalizedEmail);
        sendEmailHtml(normalizedEmail, code);
        log.info("Растау коды сәтті жіберілді: {} (түрі: {})", normalizedEmail, type);
    }

    public boolean verifyCode(String email, String inputCode) {
        if (email == null || inputCode == null) return false;
        String normalizedEmail = email.trim().toLowerCase();
        String trimmedCode = inputCode.trim();

        VerificationEntry entry = codeStore.get(normalizedEmail);
        if (entry == null) {
            log.warn("Код табылмады: {}", normalizedEmail);
            return false;
        }

        if (Instant.now().isAfter(entry.expiresAt)) {
            codeStore.remove(normalizedEmail);
            log.warn("Кодтың мерзімі өтіп кеткен: {}", normalizedEmail);
            return false;
        }

        if (entry.code.equals(trimmedCode)) {
            codeStore.remove(normalizedEmail); // One-time use
            return true;
        }

        return false;
    }

    private void sendEmailHtml(String toEmail, String code) {
        String subject = "Tanda — Тіркелуді растау коды: " + code;
        String htmlContent = "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'></head>"
                + "<body style='margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;'>"
                + "<div style='max-width:540px;margin:30px auto;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,84,148,0.08);border:1px solid #E2E8F0;'>"
                + "  <div style='background:linear-gradient(135deg, #004377 0%, #005FA8 100%);padding:36px 30px;text-align:center;color:#FFFFFF;'>"
                + "    <h1 style='margin:0 0 8px;font-size:28px;font-weight:900;letter-spacing:-0.5px;'>tanda<span style='color:#EF7E00;'>.</span></h1>"
                + "    <p style='margin:0;font-size:14px;color:rgba(255,255,255,0.85);'>Қазақша электронды және аудиокітаптар платформасы</p>"
                + "  </div>"
                + "  <div style='padding:36px 30px;text-align:center;'>"
                + "    <h2 style='margin:0 0 12px;font-size:20px;font-weight:800;color:#0F172A;'>Тіркелуді растау коды</h2>"
                + "    <p style='margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;'>"
                + "      Сайтқа тіркелуді аяқтау үшін төмендегі бір реттік 6 таңбалы кодты енгізіңіз:"
                + "    </p>"
                + "    <div style='display:inline-block;background:#F1F5F9;border:2px dashed #005494;border-radius:14px;padding:16px 32px;letter-spacing:8px;font-size:32px;font-weight:900;color:#005494;margin-bottom:24px;'>"
                +        code
                + "    </div>"
                + "    <p style='margin:0 0 8px;font-size:13px;color:#64748B;'>"
                + "      ⏳ Код <strong>10 минут</strong> бойы жарамды."
                + "    </p>"
                + "    <p style='margin:0;font-size:12px;color:#94A3B8;'>"
                + "      Егер бұл сұранысты сіз жасамаған болсаңыз, бұл хатты елемеуіңізге болады."
                + "    </p>"
                + "  </div>"
                + "  <div style='background:#F8FAFC;padding:16px 30px;text-align:center;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;'>"
                + "    © " + java.time.Year.now().getValue() + " Tanda. Барлық құқықтар қорғалған."
                + "  </div>"
                + "</div>"
                + "</body>"
                + "</html>";

        // 1. Try Resend HTTPS REST API first
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            try {
                sendViaResend(toEmail, subject, htmlContent);
                return;
            } catch (Exception e) {
                log.warn("Resend API арқылы жіберілмеді: {}", e.getMessage());
                // If Brevo is available, fallback to Brevo
                if (brevoApiKey != null && !brevoApiKey.isBlank()) {
                    try {
                        sendViaBrevo(toEmail, subject, htmlContent);
                        return;
                    } catch (Exception be) {
                        log.error("Brevo API арқылы да жіберілмеді: {}", be.getMessage());
                    }
                }
                throw new RuntimeException("Хат жіберу қатесі: " + e.getMessage());
            }
        }

        // 2. Try Brevo HTTPS REST API
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            try {
                sendViaBrevo(toEmail, subject, htmlContent);
                return;
            } catch (Exception e) {
                log.error("Brevo API қатесі: {}", e.getMessage());
                throw new RuntimeException("Хат жіберу қатесі: " + e.getMessage());
            }
        }

        // 3. Fallback to standard JavaMailSender
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("Tanda <" + fromEmail + ">");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("SMTP жіберу қатесі: {}", e.getMessage(), e);
            throw new RuntimeException("Хат жіберу кезінде қате орын алды. Қайталап көріңіз.");
        }
    }

    private void sendViaResend(String toEmail, String subject, String htmlContent) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        String sender = (resendFromEmail != null && !resendFromEmail.isBlank()) ? resendFromEmail : "onboarding@resend.dev";
        Map<String, Object> payload = Map.of(
                "from", "Tanda <" + sender + ">",
                "to", List.of(toEmail),
                "subject", subject,
                "html", htmlContent
        );

        String json = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendApiKey.trim())
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("Resend HTTPS API арқылы хат сәтті жіберілді: {}", toEmail);
        } else {
            log.error("Resend API қате жауап берді (код {}): {}", response.statusCode(), response.body());
            throw new RuntimeException("Resend API қатесі: " + response.body());
        }
    }

    private void sendViaBrevo(String toEmail, String subject, String htmlContent) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        Map<String, Object> payload = Map.of(
                "sender", Map.of("name", brevoFromName, "email", brevoFromEmail),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "htmlContent", htmlContent
        );

        String json = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", brevoApiKey.trim())
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("Brevo HTTPS API арқылы хат сәтті жіберілді: {}", toEmail);
        } else {
            log.error("Brevo API қате жауап берді (код {}): {}", response.statusCode(), response.body());
            throw new RuntimeException("Brevo API қатесі: " + response.body());
        }
    }
}
