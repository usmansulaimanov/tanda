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
                        .addedAt(now)
                        .build());

        String targetStatus = (dto != null && dto.getStatus() != null && !dto.getStatus().isBlank())
                ? dto.getStatus().trim().toLowerCase()
                : (ub.getStatus() != null ? ub.getStatus() : "want_to_read");

        ub.setStatus(targetStatus);

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

        if ("completed".equalsIgnoreCase(ub.getStatus()) || (ub.getProgressPercent() != null && ub.getProgressPercent() >= 100.0)) {
            ub.setStatus("completed");
            ub.setProgressPercent(100.0);
            if (ub.getCompletedAt() == null) {
                ub.setCompletedAt(now);
            }
        } else if ("reading".equalsIgnoreCase(ub.getStatus())) {
            ub.setLastReadAt(now);
        }

        ub.setUpdatedAt(now);
        UserBook saved = userBookRepository.save(ub);
        log.info("Updated shelf record for user={}, book={}, status={}", userId, bookId, saved.getStatus());
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
