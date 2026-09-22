package com.tanda.service;

import com.tanda.dto.AudioChapterDto;
import com.tanda.dto.BookDetailResponseDto;
import com.tanda.dto.BookResponseDto;
import com.tanda.dto.CreateBookRequestDto;
import com.tanda.dto.UpdateBookRequestDto;
import com.tanda.entity.AudioChapter;
import com.tanda.entity.Book;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;

    private boolean isSecurityContextAdmin() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities() != null &&
                auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    @Transactional(readOnly = true)
    public Page<BookResponseDto> getBooks(String category, String search, boolean includeArchived, boolean isAdmin, Pageable pageable) {
        String cat = (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("Барлығы"))
                ? category.trim()
                : null;
        String q = (search != null && !search.trim().isEmpty())
                ? search.trim()
                : null;

        boolean effectiveIncludeArchived = includeArchived && isAdmin;
        Page<Book> books = bookRepository.searchBooks(cat, q, effectiveIncludeArchived, pageable);
        return books.map(this::toResponseDto);
    }

    @Transactional(readOnly = true)
    public Page<BookResponseDto> getBooks(String category, String search, boolean includeArchived, Pageable pageable) {
        return getBooks(category, search, includeArchived, isSecurityContextAdmin(), pageable);
    }

    @Transactional(readOnly = true)
    public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived, boolean isAdmin) {
        String cat = (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("Барлығы"))
                ? category.trim()
                : null;
        String q = (search != null && !search.trim().isEmpty())
                ? search.trim()
                : null;

        boolean effectiveIncludeArchived = includeArchived && isAdmin;
        List<Book> books = bookRepository.searchBooks(cat, q, effectiveIncludeArchived);
        return books.stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived) {
        return getBooks(category, search, includeArchived, isSecurityContextAdmin());
    }

    @Transactional(readOnly = true)
    public BookDetailResponseDto getBookById(String id, boolean isAdmin) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));

        if (Boolean.TRUE.equals(book.getIsArchived()) && !isAdmin) {
            throw new ResourceNotFoundException("Book", "id", id);
        }

        return toDetailResponseDto(book);
    }

    @Transactional(readOnly = true)
    public BookDetailResponseDto getBookById(String id) {
        return getBookById(id, isSecurityContextAdmin());
    }

    @Transactional
    public BookResponseDto createBook(CreateBookRequestDto dto) {
        String bookId = (dto.getId() != null && !dto.getId().trim().isEmpty())
                ? dto.getId().trim()
                : "book-" + UUID.randomUUID().toString().substring(0, 8);

        if (bookRepository.existsById(bookId)) {
            throw new IllegalArgumentException("Book with id '" + bookId + "' already exists");
        }

        boolean hasAudio = Boolean.TRUE.equals(dto.getHasAudio())
                || (dto.getAudioUrl() != null && !dto.getAudioUrl().isBlank())
                || (dto.getAudioChapters() != null && !dto.getAudioChapters().isEmpty());

        String effectiveAudioUrl = (dto.getAudioUrl() != null && !dto.getAudioUrl().isBlank())
                ? dto.getAudioUrl().trim()
                : (dto.getAudioChapters() != null && !dto.getAudioChapters().isEmpty() && dto.getAudioChapters().get(0).getAudioUrl() != null
                    ? dto.getAudioChapters().get(0).getAudioUrl().trim()
                    : null);

        Book book = Book.builder()
                .id(bookId)
                .title(dto.getTitle().trim())
                .author(dto.getAuthor().trim())
                .description(dto.getDescription())
                .category(dto.getCategory().trim())
                .pages(dto.getPages())
                .hasAudio(hasAudio)
                .audioNarrator(hasAudio ? dto.getAudioNarrator() : null)
                .audioDuration(hasAudio ? dto.getAudioDuration() : null)
                .audioUrl(hasAudio ? effectiveAudioUrl : null)
                .coverImage(dto.getCoverImage())
                .isFree(dto.getIsFree() != null ? dto.getIsFree() : true)
                .isArchived(dto.getIsArchived() != null ? dto.getIsArchived() : false)
                .gradient(dto.getGradient())
                .createdAt(OffsetDateTime.now())
                .audioChapters(new ArrayList<>())
                .build();

        if (hasAudio) {
            if (dto.getAudioChapters() != null && !dto.getAudioChapters().isEmpty()) {
                mapAudioChapters(dto.getAudioChapters(), book);
            } else if (effectiveAudioUrl != null && !effectiveAudioUrl.isBlank()) {
                AudioChapter singleChapter = AudioChapter.builder()
                        .id("ch-" + UUID.randomUUID().toString().substring(0, 8))
                        .title("1-аудио")
                        .audioUrl(effectiveAudioUrl)
                        .duration(dto.getAudioDuration() != null ? dto.getAudioDuration() : "00:00")
                        .chapterOrder(1)
                        .build();
                book.addAudioChapter(singleChapter);
            }
        }

        Book saved = bookRepository.save(book);
        log.info("Book created: id={}, title='{}', hasAudio={}", saved.getId(), saved.getTitle(), saved.getHasAudio());
        return toResponseDto(saved);
    }

    @Transactional
    public BookResponseDto updateBook(String id, UpdateBookRequestDto dto) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));

        boolean hasAudio = Boolean.TRUE.equals(dto.getHasAudio())
                || (dto.getAudioUrl() != null && !dto.getAudioUrl().isBlank())
                || (dto.getAudioChapters() != null && !dto.getAudioChapters().isEmpty());

        String effectiveAudioUrl = (dto.getAudioUrl() != null && !dto.getAudioUrl().isBlank())
                ? dto.getAudioUrl().trim()
                : (dto.getAudioChapters() != null && !dto.getAudioChapters().isEmpty() && dto.getAudioChapters().get(0).getAudioUrl() != null
                    ? dto.getAudioChapters().get(0).getAudioUrl().trim()
                    : null);

        book.setTitle(dto.getTitle().trim());
        book.setAuthor(dto.getAuthor().trim());
        book.setDescription(dto.getDescription());
        book.setCategory(dto.getCategory().trim());
        book.setPages(dto.getPages());
        book.setHasAudio(hasAudio);
        book.setAudioNarrator(hasAudio ? dto.getAudioNarrator() : null);
        book.setAudioDuration(hasAudio ? dto.getAudioDuration() : null);
        book.setAudioUrl(hasAudio ? effectiveAudioUrl : null);
        book.setCoverImage(dto.getCoverImage());
        book.setIsFree(dto.getIsFree() != null ? dto.getIsFree() : true);
        book.setIsArchived(dto.getIsArchived() != null ? dto.getIsArchived() : false);
        book.setGradient(dto.getGradient());

        book.getAudioChapters().clear();
        if (hasAudio) {
            if (dto.getAudioChapters() != null && !dto.getAudioChapters().isEmpty()) {
                mapAudioChapters(dto.getAudioChapters(), book);
            } else if (effectiveAudioUrl != null && !effectiveAudioUrl.isBlank()) {
                AudioChapter singleChapter = AudioChapter.builder()
                        .id("ch-" + UUID.randomUUID().toString().substring(0, 8))
                        .title("1-аудио")
                        .audioUrl(effectiveAudioUrl)
                        .duration(dto.getAudioDuration() != null ? dto.getAudioDuration() : "00:00")
                        .chapterOrder(1)
                        .build();
                book.addAudioChapter(singleChapter);
            }
        }

        Book saved = bookRepository.save(book);
        log.info("Book updated: id={}, title='{}'", saved.getId(), saved.getTitle());
        return toResponseDto(saved);
    }

    @Transactional
    public BookResponseDto toggleArchive(String id, boolean isArchived) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
        book.setIsArchived(isArchived);
        Book saved = bookRepository.save(book);
        log.info("Book archive status changed: id={}, isArchived={}", id, isArchived);
        return toResponseDto(saved);
    }

    @Transactional
    public void deleteBook(String id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
        bookRepository.delete(book);
        log.info("Book deleted: id={}, title='{}'", id, book.getTitle());
    }

    /**
     * Maps a list of AudioChapterDto into AudioChapter entities and attaches them to the book.
     * Extracted to eliminate code duplication between createBook() and updateBook().
     */
    private void mapAudioChapters(List<AudioChapterDto> chapters, Book book) {
        if (chapters == null) {
            return;
        }
        int order = 1;
        for (AudioChapterDto chDto : chapters) {
            String chId = (chDto.getId() != null && !chDto.getId().trim().isEmpty())
                    ? chDto.getId().trim()
                    : "ch-" + UUID.randomUUID().toString().substring(0, 8);

            AudioChapter chapter = AudioChapter.builder()
                    .id(chId)
                    .title(chDto.getTitle())
                    .audioUrl(chDto.getAudioUrl() != null ? chDto.getAudioUrl() : "")
                    .duration(chDto.getDuration() != null ? chDto.getDuration() : "00:00")
                    .chapterOrder(chDto.getChapterOrder() != null ? chDto.getChapterOrder() : order++)
                    .build();
            book.addAudioChapter(chapter);
        }
    }

    public BookResponseDto toResponseDto(Book book) {
        List<AudioChapterDto> chapterDtos = (book.getAudioChapters() != null)
                ? book.getAudioChapters().stream()
                        .map(ch -> AudioChapterDto.builder()
                                .id(ch.getId())
                                .bookId(book.getId())
                                .title(ch.getTitle())
                                .audioUrl(ch.getAudioUrl())
                                .duration(ch.getDuration())
                                .chapterOrder(ch.getChapterOrder())
                                .build())
                        .collect(Collectors.toList())
                : new ArrayList<>();

        return BookResponseDto.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .description(book.getDescription())
                .category(book.getCategory())
                .pages(book.getPages())
                .hasAudio(book.getHasAudio())
                .audioNarrator(book.getAudioNarrator())
                .audioDuration(book.getAudioDuration())
                .audioUrl(book.getAudioUrl())
                .coverImage(book.getCoverImage())
                .isFree(book.getIsFree())
                .isArchived(book.getIsArchived())
                .gradient(book.getGradient())
                .createdAt(book.getCreatedAt())
                .audioChapters(chapterDtos)
                .build();
    }

    public BookDetailResponseDto toDetailResponseDto(Book book) {
        List<AudioChapterDto> chapterDtos = book.getAudioChapters().stream()
                .map(ch -> AudioChapterDto.builder()
                        .id(ch.getId())
                        .bookId(book.getId())
                        .title(ch.getTitle())
                        .audioUrl(ch.getAudioUrl())
                        .duration(ch.getDuration())
                        .chapterOrder(ch.getChapterOrder())
                        .build())
                .collect(Collectors.toList());

        return BookDetailResponseDto.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .description(book.getDescription())
                .category(book.getCategory())
                .pages(book.getPages())
                .hasAudio(book.getHasAudio())
                .audioNarrator(book.getAudioNarrator())
                .audioDuration(book.getAudioDuration())
                .audioUrl(book.getAudioUrl())
                .coverImage(book.getCoverImage())
                .isFree(book.getIsFree())
                .isArchived(book.getIsArchived())
                .gradient(book.getGradient())
                .createdAt(book.getCreatedAt())
                .audioChapters(chapterDtos)
                .build();
    }
}
