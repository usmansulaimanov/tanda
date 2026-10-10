package com.tanda.dto;

import com.tanda.entity.AmbientSound;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmbientSoundResponseDto {
    private Long id;
    private String name;
    private String audioUrl;
    private String icon;
    private Integer sortOrder;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static AmbientSoundResponseDto fromEntity(AmbientSound sound) {
        if (sound == null) return null;
        return AmbientSoundResponseDto.builder()
                .id(sound.getId())
                .name(sound.getName())
                .audioUrl(sound.getAudioUrl())
                .icon(sound.getIcon())
                .sortOrder(sound.getSortOrder())
                .isActive(sound.getIsActive())
                .createdAt(sound.getCreatedAt())
                .updatedAt(sound.getUpdatedAt())
                .build();
    }
}
