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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/certificates")
@RequiredArgsConstructor
@Tag(name = "Public Certificates", description = "Сертификаттардың түпнұсқалығын ашық тексеру API (QR код арқылы)")
public class PublicCertificateController {

    private final CertificateService certificateService;

    @GetMapping("/verify/{certificateNumber}")
    @Operation(summary = "Сертификатты нөмірі бойынша тексеру (Public / Ашық)")
    public ResponseEntity<CertificateResponseDto> verifyCertificate(
            @PathVariable("certificateNumber") String certificateNumber) {
        return ResponseEntity.ok(certificateService.getCertificateByNumber(certificateNumber));
    }
}
