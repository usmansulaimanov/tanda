package com.tanda.service;

import com.tanda.dto.certificate.CertificateRequestDto;
import com.tanda.dto.certificate.CertificateResponseDto;
import com.tanda.entity.Certificate;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ConflictException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.CertificateRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CertificateResponseDto> getAllCertificates(String query) {
        List<Certificate> certs;
        if (query != null && !query.trim().isBlank()) {
            certs = certificateRepository.searchCertificates(query.trim());
        } else {
            certs = certificateRepository.findAllByOrderByIssuedAtDescCreatedAtDesc();
        }
        return certs.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CertificateResponseDto getCertificateById(String id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Сертификат табылмады id: " + id));
        return toDto(cert);
    }

    @Transactional(readOnly = true)
    public CertificateResponseDto getCertificateByNumber(String certNumber) {
        if (certNumber == null || certNumber.trim().isBlank()) {
            throw new BadRequestException("Сертификат нөмірі көрсетілмеген");
        }
        String cleanNumber = certNumber.trim();
        Certificate cert = certificateRepository.findByCertificateNumber(cleanNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Сертификат табылмады немесе жарамсыз: " + cleanNumber));
        return toDto(cert);
    }

    @Transactional(readOnly = true)
    public CertificateResponseDto verifyCertificate(String certNumber, String key) {
        if (certNumber == null || certNumber.trim().isBlank()) {
            throw new BadRequestException("Сертификат нөмірі көрсетілмеген");
        }
        String cleanNumber = certNumber.trim();
        Certificate cert = certificateRepository.findByCertificateNumber(cleanNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Сертификат табылмады немесе нөмірі қате: " + cleanNumber));

        if (key == null || key.trim().isBlank() || !key.trim().equalsIgnoreCase(cert.getVerificationToken())) {
            throw new ResourceNotFoundException("Сертификат табылмады немесе тексеру кілті қате");
        }
        return toDto(cert);
    }

    @Transactional(readOnly = true)
    public List<CertificateResponseDto> getUserCertificates(String userId) {
        return certificateRepository.findByRecipientUserIdOrderByIssuedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private static final java.util.regex.Pattern CERT_NUMBER_PATTERN = java.util.regex.Pattern.compile("^TND-\\d{4}-\\d{6}$");

    @Transactional(readOnly = true)
    public Map<String, Object> checkNumberAvailable(String certNumber, String excludeId) {
        if (certNumber == null || certNumber.trim().isBlank()) {
            return Map.of("available", false, "message", "Сертификат нөмірі бос болмауы тиіс");
        }
        String cleanNumber = certNumber.trim().toUpperCase();
        if (!CERT_NUMBER_PATTERN.matcher(cleanNumber).matches()) {
            return Map.of("available", false, "message", "Қате формат! Нөмір міндетті түрде 6 санды болуы керек (мысалы: TND-2026-000001)");
        }
        var existing = certificateRepository.findByCertificateNumber(cleanNumber);
        if (existing.isPresent()) {
            if (excludeId != null && existing.get().getId().equals(excludeId)) {
                return Map.of("available", true, "message", "✓ Бұл осы сертификаттың өз нөмірі");
            }
            return Map.of("available", false, "message", "⚠️ Бұл сертификат нөмірі бұрыннан тіркелген!");
        }
        return Map.of("available", true, "message", "✓ Нөмір бос, қолдануға болады");
    }

    @Transactional(readOnly = true)
    public Map<String, String> getNextAvailableNumber() {
        int currentYear = LocalDate.now().getYear();
        String prefix = "TND-" + currentYear + "-";
        
        long count = certificateRepository.count();
        long nextIndex = count + 1;
        String candidate = String.format("%s%06d", prefix, nextIndex);

        while (certificateRepository.existsByCertificateNumber(candidate)) {
            nextIndex++;
            candidate = String.format("%s%06d", prefix, nextIndex);
        }

        return Map.of("nextNumber", candidate);
    }

    @Transactional
    public CertificateResponseDto createCertificate(CertificateRequestDto dto) {
        String cleanNumber = dto.getCertificateNumber().trim().toUpperCase();

        if (!CERT_NUMBER_PATTERN.matcher(cleanNumber).matches()) {
            throw new BadRequestException("Қате формат! Нөмір міндетті түрде 6 санды болуы керек (мысалы: TND-2026-000001)");
        }

        if (certificateRepository.existsByCertificateNumber(cleanNumber)) {
            throw new ConflictException("⚠️ Бұл сертификат нөмірі бұрыннан тіркелген: " + cleanNumber);
        }

        if (dto.getIssuedAt() == null || dto.getIssuedAt().getYear() < 2020 || dto.getIssuedAt().getYear() > 2099) {
            throw new BadRequestException("Берілген күні қате: жыл 2020 мен 2099 аралығында болуы керек (мысалы: 12.09.2026)");
        }

        String recipientIdNumber = dto.getRecipientIdNumber();
        if (dto.getRecipientUserId() != null && !dto.getRecipientUserId().isBlank()) {
            User user = userRepository.findById(dto.getRecipientUserId()).orElse(null);
            if (user != null && (recipientIdNumber == null || recipientIdNumber.isBlank())) {
                recipientIdNumber = user.getIdNumber();
            }
        }

        Certificate cert = Certificate.builder()
                .id("cert-" + UUID.randomUUID().toString().substring(0, 12))
                .certificateNumber(cleanNumber)
                .verificationToken(UUID.randomUUID().toString().replace("-", ""))
                .recipientName(dto.getRecipientName().trim())
                .recipientUserId(dto.getRecipientUserId())
                .recipientIdNumber(recipientIdNumber)
                .title(dto.getTitle().trim())
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .category(dto.getCategory() != null && !dto.getCategory().isBlank() ? dto.getCategory().trim() : "READER_TOP_10")
                .issuedAt(dto.getIssuedAt())
                .issuerName(dto.getIssuerName() != null && !dto.getIssuerName().isBlank() ? dto.getIssuerName().trim() : "Tanda Platform")
                .pdfUrl(dto.getPdfUrl())
                .imageUrl(dto.getImageUrl())
                .status(dto.getStatus() != null && !dto.getStatus().isBlank() ? dto.getStatus().trim() : "ACTIVE")
                .build();

        cert = certificateRepository.save(cert);
        log.info("Certificate created: id={}, number={}, recipient={}", cert.getId(), cert.getCertificateNumber(), cert.getRecipientName());
        return toDto(cert);
    }

    @Transactional
    public CertificateResponseDto updateCertificate(String id, CertificateRequestDto dto) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Сертификат табылмады id: " + id));

        String cleanNumber = dto.getCertificateNumber().trim().toUpperCase();
        if (!CERT_NUMBER_PATTERN.matcher(cleanNumber).matches()) {
            throw new BadRequestException("Қате формат! Нөмір міндетті түрде 6 санды болуы керек (мысалы: TND-2026-000001)");
        }
        if (!cleanNumber.equalsIgnoreCase(cert.getCertificateNumber())) {
            var existing = certificateRepository.findByCertificateNumber(cleanNumber);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                throw new ConflictException("⚠️ Бұл сертификат нөмірі басқа құжатқа тіркелген: " + cleanNumber);
            }
            cert.setCertificateNumber(cleanNumber);
        }

        if (dto.getIssuedAt() != null) {
            if (dto.getIssuedAt().getYear() < 2020 || dto.getIssuedAt().getYear() > 2099) {
                throw new BadRequestException("Берілген күні қате: жыл 2020 мен 2099 аралығында болуы керек (мысалы: 12.09.2026)");
            }
            cert.setIssuedAt(dto.getIssuedAt());
        }

        cert.setRecipientName(dto.getRecipientName().trim());
        cert.setRecipientUserId(dto.getRecipientUserId());
        cert.setRecipientIdNumber(dto.getRecipientIdNumber());
        cert.setTitle(dto.getTitle().trim());
        cert.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : null);
        cert.setCategory(dto.getCategory() != null && !dto.getCategory().isBlank() ? dto.getCategory().trim() : cert.getCategory());
        cert.setIssuedAt(dto.getIssuedAt() != null ? dto.getIssuedAt() : cert.getIssuedAt());
        cert.setIssuerName(dto.getIssuerName() != null && !dto.getIssuerName().isBlank() ? dto.getIssuerName().trim() : cert.getIssuerName());
        cert.setPdfUrl(dto.getPdfUrl());
        cert.setImageUrl(dto.getImageUrl());
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            cert.setStatus(dto.getStatus().trim());
        }

        cert = certificateRepository.save(cert);
        log.info("Certificate updated: id={}, number={}", cert.getId(), cert.getCertificateNumber());
        return toDto(cert);
    }

    @Transactional
    public void deleteCertificate(String id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Сертификат табылмады id: " + id));
        certificateRepository.delete(cert);
        log.info("Certificate deleted: id={}, number={}", cert.getId(), cert.getCertificateNumber());
    }

    private CertificateResponseDto toDto(Certificate c) {
        String tokenSuffix = (c.getVerificationToken() != null && !c.getVerificationToken().isBlank())
                ? "?key=" + c.getVerificationToken()
                : "";
        String verificationUrl = "https://tanda-xi.vercel.app/verify/cert/" + c.getCertificateNumber() + tokenSuffix;
        return CertificateResponseDto.builder()
                .id(c.getId())
                .certificateNumber(c.getCertificateNumber())
                .recipientName(c.getRecipientName())
                .recipientUserId(c.getRecipientUserId())
                .recipientIdNumber(c.getRecipientIdNumber())
                .title(c.getTitle())
                .description(c.getDescription())
                .category(c.getCategory())
                .issuedAt(c.getIssuedAt())
                .issuerName(c.getIssuerName())
                .pdfUrl(c.getPdfUrl())
                .imageUrl(c.getImageUrl())
                .status(c.getStatus())
                .verificationToken(c.getVerificationToken())
                .verificationUrl(verificationUrl)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
