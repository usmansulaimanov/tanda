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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities() != null &&
                auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    @Transactional(readOnly = true)
    public List<BookResponseDto> getBooks(String category, String search, boolean includeArchived) {
        String cat = (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("Барлығы")) 
                ? category.trim() 
                : null;
        String q = (search != null && !search.trim().isEmpty()) 
                ? search.trim() 
                : null;

        boolean effectiveIncludeArchived = includeArchived && isAdmin();
        List<Book> books = bookRepository.searchBooks(cat, q, effectiveIncludeArchived);
        return books.stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BookDetailResponseDto getBookById(String id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));

        if (Boolean.TRUE.equals(book.getIsArchived()) && !isAdmin()) {
            throw new ResourceNotFoundException("Book", "id", id);
        }

        return toDetailResponseDto(book);
    }

    @Transactional
    public BookResponseDto createBook(CreateBookRequestDto dto) {
        String bookId = (dto.getId() != null && !dto.getId().trim().isEmpty())
                ? dto.getId().trim()
                : "book-" + UUID.randomUUID().toString().substring(0, 8);

        if (bookRepository.existsById(bookId)) {
            throw new IllegalArgumentException("Book with id '" + bookId + "' already exists");
        }

        Book book = Book.builder()
                .id(bookId)
                .title(dto.getTitle().trim())
                .author(dto.getAuthor().trim())
                .description(dto.getDescription())
                .category(dto.getCategory().trim())
                .pages(dto.getPages())
                .hasAudio(dto.getHasAudio() != null ? dto.getHasAudio() : false)
                .audioNarrator(dto.getAudioNarrator())
                .audioDuration(dto.getAudioDuration())
                .audioUrl(dto.getAudioUrl())
                .coverImage(dto.getCoverImage())
                .isFree(dto.getIsFree() != null ? dto.getIsFree() : true)
                .isArchived(dto.getIsArchived() != null ? dto.getIsArchived() : false)
                .gradient(dto.getGradient())
                .createdAt(OffsetDateTime.now())
                .audioChapters(new ArrayList<>())
                .build();

        if (dto.getAudioChapters() != null) {
            int order = 1;
            for (AudioChapterDto chDto : dto.getAudioChapters()) {
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

        Book saved = bookRepository.save(book);
        return toResponseDto(saved);
    }

    @Transactional
    public BookResponseDto updateBook(String id, UpdateBookRequestDto dto) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));

        book.setTitle(dto.getTitle().trim());
        book.setAuthor(dto.getAuthor().trim());
        book.setDescription(dto.getDescription());
        book.setCategory(dto.getCategory().trim());
        book.setPages(dto.getPages());
        book.setHasAudio(dto.getHasAudio() != null ? dto.getHasAudio() : false);
        book.setAudioNarrator(dto.getAudioNarrator());
        book.setAudioDuration(dto.getAudioDuration());
        book.setAudioUrl(dto.getAudioUrl());
        book.setCoverImage(dto.getCoverImage());
        book.setIsFree(dto.getIsFree() != null ? dto.getIsFree() : true);
        book.setIsArchived(dto.getIsArchived() != null ? dto.getIsArchived() : false);
        book.setGradient(dto.getGradient());

        if (dto.getAudioChapters() != null) {
            book.getAudioChapters().clear();
            int order = 1;
            for (AudioChapterDto chDto : dto.getAudioChapters()) {
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

        Book saved = bookRepository.save(book);
        return toResponseDto(saved);
    }

    @Transactional
    public BookResponseDto toggleArchive(String id, boolean isArchived) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
        book.setIsArchived(isArchived);
        Book saved = bookRepository.save(book);
        return toResponseDto(saved);
    }

    @Transactional
    public void deleteBook(String id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
        bookRepository.delete(book);
    }

    public BookResponseDto toBookResponseDto(Book book) {
        return toResponseDto(book);
    }

    public BookResponseDto toResponseDto(Book book) {
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
