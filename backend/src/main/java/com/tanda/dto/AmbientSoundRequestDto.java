package com.tanda.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmbientSoundRequestDto {

    @NotBlank(message = "Атауы міндетті түрде толтырылуы тиіс")
    @Size(max = 100, message = "Атауы 100 таңбадан аспауы тиіс")
    private String name;

    @NotBlank(message = "Аудио сілтемесі міндетті түрде толтырылуы тиіс")
    @Size(max = 500, message = "Аудио сілтемесі 500 таңбадан аспауы тиіс")
    private String audioUrl;

    @Size(max = 50, message = "Иконка атауы 50 таңбадан аспауы тиіс")
    private String icon;

    private Integer sortOrder;

    private Boolean isActive;
}
