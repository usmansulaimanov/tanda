package com.tanda.controller;

import com.tanda.dto.certificate.CertificateResponseDto;
import com.tanda.service.CertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tanda.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/v1/certificates")
@RequiredArgsConstructor
@Tag(name = "Public Certificates", description = "Сертификаттардың түпнұсқалығын ашық тексеру API (QR код арқылы)")
public class PublicCertificateController {

    private final CertificateService certificateService;

    @GetMapping("/my")
    @Operation(summary = "Пайдаланушының өз сертификаттарын алу")
    public ResponseEntity<java.util.List<CertificateResponseDto>> getMyCertificates(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(certificateService.getUserCertificates(principal.getId()));
    }

    @GetMapping("/verify/{certificateNumber}")
    @Operation(summary = "Сертификатты нөмірі және құпия кілті бойынша тексеру (Public / Ашық)")
    public ResponseEntity<CertificateResponseDto> verifyCertificate(
            @PathVariable("certificateNumber") String certificateNumber,
            @RequestParam(value = "key", required = false) String key) {
        return ResponseEntity.ok(certificateService.verifyCertificate(certificateNumber, key));
    }
}
