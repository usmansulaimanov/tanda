package com.tanda.service;

import com.tanda.dto.progress.ReadingProgressRequestDto;
import com.tanda.dto.progress.ReadingProgressResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.ReadingProgress;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.BookRepository;
import com.tanda.repository.ReadingProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReadingProgressService {

    private final ReadingProgressRepository progressRepository;
    private final BookRepository bookRepository;

    @Transactional(readOnly = true)
    public ReadingProgressResponseDto getProgress(String userId, String bookId) {
        ReadingProgress progress = progressRepository.findByUserIdAndBookId(userId, bookId)
                .orElse(null);

        if (progress == null) {
            return ReadingProgressResponseDto.builder()
                    .bookId(bookId)
                    .userId(userId)
                    .currentPage(1)
                    .currentAudioTime(0)
                    .build();
        }

        return toDto(progress);
    }

    @Transactional
    public ReadingProgressResponseDto updateProgress(String userId, String bookId, ReadingProgressRequestDto dto) {
        ReadingProgress progress = progressRepository.findByUserIdAndBookId(userId, bookId)
                .orElse(null);

        if (progress == null) {
            Book book = bookRepository.findById(bookId)
                    .orElseThrow(() -> new ResourceNotFoundException("Кітап табылмады id: " + bookId));

            progress = ReadingProgress.builder()
                    .id("rp-" + UUID.randomUUID().toString().substring(0, 8))
                    .book(book)
                    .userId(userId)
                    .currentPage(dto.getCurrentPage() != null ? dto.getCurrentPage() : 1)
                    .currentAudioChapterId(dto.getCurrentAudioChapterId())
                    .currentAudioTime(dto.getCurrentAudioTime() != null ? dto.getCurrentAudioTime() : 0)
                    .updatedAt(OffsetDateTime.now())
                    .build();
        } else {
            if (dto.getCurrentPage() != null) {
                progress.setCurrentPage(dto.getCurrentPage());
            }
            if (dto.getCurrentAudioChapterId() != null) {
                progress.setCurrentAudioChapterId(dto.getCurrentAudioChapterId());
            }
            if (dto.getCurrentAudioTime() != null) {
                progress.setCurrentAudioTime(dto.getCurrentAudioTime());
            }
            progress.setUpdatedAt(OffsetDateTime.now());
        }

        progress = progressRepository.save(progress);
        return toDto(progress);
    }

    private ReadingProgressResponseDto toDto(ReadingProgress progress) {
        return ReadingProgressResponseDto.builder()
                .id(progress.getId())
                .bookId(progress.getBook() != null ? progress.getBook().getId() : null)
                .userId(progress.getUserId())
                .currentPage(progress.getCurrentPage())
                .currentAudioChapterId(progress.getCurrentAudioChapterId())
                .currentAudioTime(progress.getCurrentAudioTime())
                .updatedAt(progress.getUpdatedAt())
                .build();
    }
}
