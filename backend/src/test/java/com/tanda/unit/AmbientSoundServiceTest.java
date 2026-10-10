package com.tanda.unit;

import com.tanda.dto.AmbientSoundRequestDto;
import com.tanda.dto.AmbientSoundResponseDto;
import com.tanda.entity.AmbientSound;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AmbientSoundRepository;
import com.tanda.service.AmbientSoundService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AmbientSoundServiceTest {

    @Mock
    private AmbientSoundRepository ambientSoundRepository;

    @InjectMocks
    private AmbientSoundService ambientSoundService;

    private AmbientSound sound;

    @BeforeEach
    void setUp() {
        sound = AmbientSound.builder()
                .id(1L)
                .name("Теңіз толқыны")
                .audioUrl("https://example.com/sea.mp3")
                .icon("Waves")
                .sortOrder(1)
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getActiveSounds should return only active ambient sounds")
    void getActiveSounds_ReturnsActiveList() {
        when(ambientSoundRepository.findByIsActiveTrueOrderBySortOrderAscIdAsc())
                .thenReturn(List.of(sound));

        List<AmbientSoundResponseDto> result = ambientSoundService.getActiveSounds();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Теңіз толқыны");
    }

    @Test
    @DisplayName("createSound should save and return created sound")
    void createSound_SavesSuccessfully() {
        AmbientSoundRequestDto request = AmbientSoundRequestDto.builder()
                .name("Жаңбыр")
                .audioUrl("https://example.com/rain.mp3")
                .icon("CloudRain")
                .sortOrder(2)
                .isActive(true)
                .build();

        when(ambientSoundRepository.save(any(AmbientSound.class))).thenAnswer(invocation -> {
            AmbientSound s = invocation.getArgument(0);
            s.setId(2L);
            return s;
        });

        AmbientSoundResponseDto created = ambientSoundService.createSound(request);

        assertThat(created).isNotNull();
        assertThat(created.getName()).isEqualTo("Жаңбыр");
        verify(ambientSoundRepository, times(1)).save(any(AmbientSound.class));
    }

    @Test
    @DisplayName("toggleActive should invert sound status")
    void toggleActive_InvertsStatus() {
        when(ambientSoundRepository.findById(1L)).thenReturn(Optional.of(sound));
        when(ambientSoundRepository.save(any(AmbientSound.class))).thenReturn(sound);

        AmbientSoundResponseDto updated = ambientSoundService.toggleActive(1L);

        assertThat(updated.getIsActive()).isFalse();
        verify(ambientSoundRepository).save(sound);
    }

    @Test
    @DisplayName("deleteSound should throw ResourceNotFoundException when sound not found")
    void deleteSound_NotFound_ThrowsException() {
        when(ambientSoundRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> ambientSoundService.deleteSound(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
