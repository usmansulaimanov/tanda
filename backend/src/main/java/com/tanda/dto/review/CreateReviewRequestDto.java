package com.tanda.dto.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReviewRequestDto {

    @NotNull(message = "Баға міндетті түрде қойылуы керек")
    @Min(value = 1, message = "Ең төменгі баға — 1")
    @Max(value = 5, message = "Ең жоғарғы баға — 5")
    private Integer rating;

    @Size(max = 2000, message = "Пікір мәтіні 2000 таңбадан аспауы қажет")
    private String reviewText;

    @Builder.Default
    private Boolean isSpoiler = false;
}
