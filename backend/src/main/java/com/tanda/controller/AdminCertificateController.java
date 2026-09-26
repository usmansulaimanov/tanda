package com.tanda.controller;

import com.tanda.dto.certificate.CertificateRequestDto;
import com.tanda.dto.certificate.CertificateResponseDto;
import com.tanda.service.CertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/certificates")
@RequiredArgsConstructor
@Tag(name = "Admin Certificates", description = "Сертификаттарды басқару API (тек Админге)")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCertificateController {

    private final CertificateService certificateService;

    @GetMapping
    @Operation(summary = "Барлық сертификаттар тізімін алу немесе іздеу")
    public ResponseEntity<List<CertificateResponseDto>> getAllCertificates(
            @RequestParam(value = "q", required = false) String query) {
        return ResponseEntity.ok(certificateService.getAllCertificates(query));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Сертификатты ID бойынша алу")
    public ResponseEntity<CertificateResponseDto> getCertificateById(@PathVariable("id") String id) {
        return ResponseEntity.ok(certificateService.getCertificateById(id));
    }

    @GetMapping("/check-number")
    @Operation(summary = "Сертификат нөмірінің бос екенін тексеру")
    public ResponseEntity<Map<String, Object>> checkNumberAvailable(
            @RequestParam("number") String number,
            @RequestParam(value = "excludeId", required = false) String excludeId) {
        return ResponseEntity.ok(certificateService.checkNumberAvailable(number, excludeId));
    }

    @GetMapping("/next-number")
    @Operation(summary = "Келесі қолжетімді автогенерацияланған сертификат нөмірін алу")
    public ResponseEntity<Map<String, String>> getNextNumber() {
        return ResponseEntity.ok(certificateService.getNextAvailableNumber());
    }

    @PostMapping
    @Operation(summary = "Жаңа сертификат жасау")
    public ResponseEntity<CertificateResponseDto> createCertificate(
            @Valid @RequestBody CertificateRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(certificateService.createCertificate(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Сертификатты жаңарту")
    public ResponseEntity<CertificateResponseDto> updateCertificate(
            @PathVariable("id") String id,
            @Valid @RequestBody CertificateRequestDto request) {
        return ResponseEntity.ok(certificateService.updateCertificate(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Сертификатты өшіру")
    public ResponseEntity<Void> deleteCertificate(@PathVariable("id") String id) {
        certificateService.deleteCertificate(id);
        return ResponseEntity.noContent().build();
    }
}
