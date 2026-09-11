package com.tanda.service;

import com.tanda.dto.BookResponseDto;
import com.tanda.dto.saved.SavedBookResponseDto;
import com.tanda.entity.Book;
import com.tanda.entity.SavedBook;
import com.tanda.entity.User;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.BookRepository;
import com.tanda.repository.SavedBookRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SavedBookService {

    private final SavedBookRepository savedBookRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final BookService bookService;

    @Transactional(readOnly = true)
    public SavedBookResponseDto getSavedBooks(String userId) {
        List<SavedBook> savedList = savedBookRepository.findByUserIdOrderBySavedAtDesc(userId);
        List<String> bookIds = savedList.stream()
                .map(s -> s.getBook().getId())
                .collect(Collectors.toList());

        List<BookResponseDto> books = savedList.stream()
                .map(s -> bookService.toBookResponseDto(s.getBook()))
                .collect(Collectors.toList());

        return SavedBookResponseDto.builder()
                .bookIds(bookIds)
                .books(books)
                .build();
    }

    @Transactional
    public void saveBook(String userId, String bookId) {
        if (savedBookRepository.existsByUserIdAndBookId(userId, bookId)) {
            return; // Already saved
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Пайдаланушы табылмады id: " + userId));

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Кітап табылмады id: " + bookId));

        SavedBook savedBook = SavedBook.builder()
                .id("sb-" + UUID.randomUUID().toString().substring(0, 8))
                .user(user)
                .book(book)
                .build();

        savedBookRepository.save(savedBook);
    }

    @Transactional
    public void removeSavedBook(String userId, String bookId) {
        savedBookRepository.deleteByUserIdAndBookId(userId, bookId);
    }

    @Transactional(readOnly = true)
    public boolean isBookSaved(String userId, String bookId) {
        return savedBookRepository.existsByUserIdAndBookId(userId, bookId);
    }
}
