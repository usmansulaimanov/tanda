package com.tanda.service;

import com.tanda.dto.AmbientSoundRequestDto;
import com.tanda.dto.AmbientSoundResponseDto;
import com.tanda.entity.AmbientSound;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AmbientSoundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AmbientSoundService {

    private final AmbientSoundRepository ambientSoundRepository;

    @Transactional(readOnly = true)
    public List<AmbientSoundResponseDto> getActiveSounds() {
        return ambientSoundRepository.findByIsActiveTrueOrderBySortOrderAscIdAsc()
                .stream()
                .map(AmbientSoundResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AmbientSoundResponseDto> getAllSoundsForAdmin() {
        return ambientSoundRepository.findAllByOrderBySortOrderAscIdAsc()
                .stream()
                .map(AmbientSoundResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AmbientSoundResponseDto getSoundById(Long id) {
        AmbientSound sound = ambientSoundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Атмосфералық дыбыс табылмады: " + id));
        return AmbientSoundResponseDto.fromEntity(sound);
    }

    @Transactional
    public AmbientSoundResponseDto createSound(AmbientSoundRequestDto request) {
        log.info("Creating new ambient sound: {}", request.getName());
        AmbientSound sound = AmbientSound.builder()
                .name(request.getName().trim())
                .audioUrl(request.getAudioUrl().trim())
                .icon(request.getIcon() != null && !request.getIcon().isBlank() ? request.getIcon().trim() : "Waves")
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        AmbientSound saved = ambientSoundRepository.save(sound);
        return AmbientSoundResponseDto.fromEntity(saved);
    }

    @Transactional
    public AmbientSoundResponseDto updateSound(Long id, AmbientSoundRequestDto request) {
        log.info("Updating ambient sound id: {}", id);
        AmbientSound sound = ambientSoundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Атмосфералық дыбыс табылмады: " + id));

        sound.setName(request.getName().trim());
        sound.setAudioUrl(request.getAudioUrl().trim());
        if (request.getIcon() != null) {
            sound.setIcon(request.getIcon().trim());
        }
        if (request.getSortOrder() != null) {
            sound.setSortOrder(request.getSortOrder());
        }
        if (request.getIsActive() != null) {
            sound.setIsActive(request.getIsActive());
        }

        AmbientSound updated = ambientSoundRepository.save(sound);
        return AmbientSoundResponseDto.fromEntity(updated);
    }

    @Transactional
    public AmbientSoundResponseDto toggleActive(Long id) {
        log.info("Toggling active status for ambient sound id: {}", id);
        AmbientSound sound = ambientSoundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Атмосфералық дыбыс табылмады: " + id));

        sound.setIsActive(!Boolean.TRUE.equals(sound.getIsActive()));
        AmbientSound updated = ambientSoundRepository.save(sound);
        return AmbientSoundResponseDto.fromEntity(updated);
    }

    @Transactional
    public void deleteSound(Long id) {
        log.info("Deleting ambient sound id: {}", id);
        if (!ambientSoundRepository.existsById(id)) {
            throw new ResourceNotFoundException("Атмосфералық дыбыс табылмады: " + id);
        }
        ambientSoundRepository.deleteById(id);
    }
}
