package com.tanda.service;

import com.tanda.dto.shelf.UserBookRequestDto;
import com.tanda.dto.shelf.UserBookResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.UserBook;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.BookRepository;
import com.tanda.repository.UserBookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserBookService {

    private final UserBookRepository userBookRepository;
    private final BookRepository bookRepository;

    @Transactional(readOnly = true)
    public List<UserBookResponseDto> getUserShelf(String userId, String status) {
        List<UserBook> list;
        if (status != null && !status.isBlank()) {
            list = userBookRepository.findAllByUserIdAndStatusWithBook(userId, status.trim().toLowerCase());
        } else {
            list = userBookRepository.findAllByUserIdWithBook(userId);
        }
        return list.stream().map(this::toResponseDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserBookResponseDto getUserBook(String userId, String bookId) {
        UserBook ub = userBookRepository.findByUserIdAndBookIdWithBook(userId, bookId)
                .orElseThrow(() -> new ResourceNotFoundException("UserBook", "bookId", bookId));
        return toResponseDto(ub);
    }

    @Transactional
    public UserBookResponseDto addOrUpdateBook(String userId, String bookId, UserBookRequestDto dto) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", bookId));

        OffsetDateTime now = OffsetDateTime.now();
        UserBook ub = userBookRepository.findByUserIdAndBookId(userId, bookId)
                .orElseGet(() -> UserBook.builder()
                        .id("ub-" + UUID.randomUUID().toString().substring(0, 8))
                        .userId(userId)
                        .book(book)
                        .isReading(false)
                        .isCompleted(false)
                        .isWantToRead(false)
                        .addedAt(now)
                        .build());

        // Handle explicit boolean flags if provided
        if (dto != null) {
            if (Boolean.TRUE.equals(dto.getIsReading())) {
                ub.setIsReading(true);
                ub.setIsCompleted(false);
                ub.setIsWantToRead(false);
                ub.setStatus("reading");
            } else if (Boolean.TRUE.equals(dto.getIsCompleted())) {
                ub.setIsCompleted(true);
                ub.setIsReading(false);
                ub.setIsWantToRead(false);
                ub.setStatus("completed");
            } else if (Boolean.TRUE.equals(dto.getIsWantToRead())) {
                ub.setIsWantToRead(true);
                ub.setIsReading(false);
                ub.setIsCompleted(false);
                ub.setStatus("want_to_read");
            } else if (dto.getIsReading() != null || dto.getIsCompleted() != null || dto.getIsWantToRead() != null) {
                if (dto.getIsReading() != null) ub.setIsReading(dto.getIsReading());
                if (dto.getIsCompleted() != null) ub.setIsCompleted(dto.getIsCompleted());
                if (dto.getIsWantToRead() != null) ub.setIsWantToRead(dto.getIsWantToRead());
            }
        }

        // Handle status string (e.g. 'reading', 'completed', 'want_to_read')
        if (dto != null && dto.getStatus() != null && !dto.getStatus().isBlank()) {
            String targetStatus = dto.getStatus().trim().toLowerCase();
            if ("reading".equals(targetStatus)) {
                ub.setIsReading(true);
                ub.setIsCompleted(false);
                ub.setIsWantToRead(false);
            } else if ("completed".equals(targetStatus)) {
                ub.setIsCompleted(true);
                ub.setIsReading(false);
                ub.setIsWantToRead(false);
            } else if ("want_to_read".equals(targetStatus)) {
                ub.setIsWantToRead(true);
                ub.setIsReading(false);
                ub.setIsCompleted(false);
            }
            ub.setStatus(targetStatus);
        } else if (ub.getStatus() == null) {
            ub.setStatus("want_to_read");
            ub.setIsWantToRead(true);
            ub.setIsReading(false);
            ub.setIsCompleted(false);
        }

        if (dto != null) {
            if (dto.getCurrentPage() != null) {
                ub.setCurrentPage(dto.getCurrentPage());
            }
            if (dto.getTotalPages() != null) {
                ub.setTotalPages(dto.getTotalPages());
            } else if (ub.getTotalPages() == null && book.getPages() != null) {
                ub.setTotalPages(book.getPages());
            }
            if (dto.getProgressPercent() != null) {
                ub.setProgressPercent(dto.getProgressPercent());
            }
        }

        // Calculate progress percent if pages available
        if (ub.getTotalPages() != null && ub.getTotalPages() > 0 && ub.getCurrentPage() != null) {
            double calculated = Math.min(100.0, Math.round(((double) ub.getCurrentPage() / ub.getTotalPages()) * 100.0 * 10.0) / 10.0);
            if (dto == null || dto.getProgressPercent() == null) {
                ub.setProgressPercent(calculated);
            }
        }

        // Auto-complete if >= 90% or explicitly completed
        if (Boolean.TRUE.equals(ub.getIsCompleted()) || (ub.getProgressPercent() != null && ub.getProgressPercent() >= 90.0)) {
            ub.setIsCompleted(true);
            ub.setIsReading(false);
            ub.setIsWantToRead(false);
            ub.setStatus("completed");
            if (ub.getCompletedAt() == null) {
                ub.setCompletedAt(now);
            }
        }
        if (Boolean.TRUE.equals(ub.getIsReading())) {
            ub.setLastReadAt(now);
        }

        // If all flags become false, delete record
        boolean hasAnyStatus = Boolean.TRUE.equals(ub.getIsReading()) ||
                               Boolean.TRUE.equals(ub.getIsCompleted()) ||
                               Boolean.TRUE.equals(ub.getIsWantToRead());
        if (!hasAnyStatus) {
            userBookRepository.delete(ub);
            log.info("Removed shelf record for user={}, book={} because all statuses are inactive", userId, bookId);
            return toResponseDto(ub);
        }

        ub.setUpdatedAt(now);
        UserBook saved = userBookRepository.save(ub);
        log.info("Updated shelf record for user={}, book={}, isReading={}, isCompleted={}, isWantToRead={}",
                userId, bookId, saved.getIsReading(), saved.getIsCompleted(), saved.getIsWantToRead());
        return toResponseDto(saved);
    }

    @Transactional
    public UserBookResponseDto updateProgress(String userId, String bookId, UserBookRequestDto dto) {
        return addOrUpdateBook(userId, bookId, dto);
    }

    @Transactional
    public void removeBookFromShelf(String userId, String bookId) {
        userBookRepository.deleteByUserIdAndBookId(userId, bookId);
        log.info("Removed book={} from shelf for user={}", bookId, userId);
    }

    public UserBookResponseDto toResponseDto(UserBook ub) {
        Book b = ub.getBook();
        return UserBookResponseDto.builder()
                .id(ub.getId())
                .bookId(b != null ? b.getId() : null)
                .status(ub.getStatus())
                .isReading(Boolean.TRUE.equals(ub.getIsReading()) || "reading".equalsIgnoreCase(ub.getStatus()))
                .isCompleted(Boolean.TRUE.equals(ub.getIsCompleted()) || "completed".equalsIgnoreCase(ub.getStatus()))
                .isWantToRead(Boolean.TRUE.equals(ub.getIsWantToRead()) || "want_to_read".equalsIgnoreCase(ub.getStatus()))
                .currentPage(ub.getCurrentPage())
                .totalPages(ub.getTotalPages())
                .progressPercent(ub.getProgressPercent())
                .addedAt(ub.getAddedAt())
                .lastReadAt(ub.getLastReadAt())
                .completedAt(ub.getCompletedAt())
                .updatedAt(ub.getUpdatedAt())
                .title(b != null ? b.getTitle() : null)
                .author(b != null ? b.getAuthor() : null)
                .coverImage(b != null ? b.getCoverImage() : null)
                .category(b != null ? b.getCategory() : null)
                .hasAudio(b != null ? b.getHasAudio() : false)
                .audioDuration(b != null ? b.getAudioDuration() : null)
                .isFree(b != null ? b.getIsFree() : true)
                .gradient(b != null ? b.getGradient() : null)
                .build();
    }
}
