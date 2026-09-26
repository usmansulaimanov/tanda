package com.tanda.dto.certificate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificateResponseDto {
    private String id;
    private String certificateNumber;
    private String recipientName;
    private String recipientUserId;
    private String recipientIdNumber;
    private String title;
    private String description;
    private String category;
    private LocalDate issuedAt;
    private String issuerName;
    private String pdfUrl;
    private String imageUrl;
    private String status;
    private String verificationToken;
    private String verificationUrl;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
