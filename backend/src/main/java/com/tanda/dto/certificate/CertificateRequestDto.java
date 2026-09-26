package com.tanda.dto.certificate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificateRequestDto {

    @NotBlank(message = "Сертификат нөмірі міндетті")
    @jakarta.validation.constraints.Pattern(
            regexp = "^TND-\\d{4}-\\d{6}$",
            message = "Сертификат нөмірі TND-ЖЖЖЖ-000001 форматында (соңында дәл 6 сан) болуы қажет"
    )
    private String certificateNumber;

    @NotBlank(message = "Алушының аты-жөні міндетті")
    private String recipientName;

    private String recipientUserId;

    private String recipientIdNumber;

    @NotBlank(message = "Сертификат атауы міндетті")
    private String title;

    private String description;

    private String category;

    @NotNull(message = "Берілген күні міндетті")
    private LocalDate issuedAt;

    private String issuerName;

    private String pdfUrl;

    private String imageUrl;

    private String status;
}
