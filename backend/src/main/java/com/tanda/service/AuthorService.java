package com.tanda.service;

import com.tanda.dto.admin.AuthorRequestDto;
import com.tanda.dto.admin.AuthorResponseDto;
import com.tanda.entity.Author;
import com.tanda.entity.AuthorBook;
import com.tanda.entity.Book;
import com.tanda.entity.User;
import com.tanda.exception.BadRequestException;
import com.tanda.exception.ResourceNotFoundException;
import com.tanda.repository.AuthorBookRepository;
import com.tanda.repository.AuthorRepository;
import com.tanda.repository.BookRepository;
import com.tanda.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthorService {

    private final AuthorRepository authorRepository;
    private final AuthorBookRepository authorBookRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AuthorResponseDto> getAllAuthors() {
        List<Author> authors = authorRepository.findAll();
        List<String> authorIds = authors.stream().map(Author::getId).collect(Collectors.toList());

        List<AuthorBook> allAuthorBooks = authorBookRepository.findByAuthorIdIn(authorIds);
        Map<String, List<String>> authorBookIdsMap = allAuthorBooks.stream()
                .collect(Collectors.groupingBy(
                        AuthorBook::getAuthorId,
                        Collectors.mapping(AuthorBook::getBookId, Collectors.toList())
                ));

        List<String> userIds = authors.stream()
                .map(Author::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        // Get all books for reading stats computation
        Map<String, Book> bookMap = bookRepository.findAll().stream()
                .collect(Collectors.toMap(Book::getId, b -> b));

        return authors.stream()
                .map(a -> {
                    User u = a.getUserId() != null ? userMap.get(a.getUserId()) : null;
                    List<String> assignedBookIds = authorBookIdsMap.getOrDefault(a.getId(), Collections.emptyList());

                    // Calculate stats from books
                    String matchName = a.getDisplayName().toLowerCase().trim();
                    List<Book> matchedBooks = bookMap.values().stream()
                            .filter(b -> (b.getAuthor() != null && b.getAuthor().toLowerCase().trim().equals(matchName))
                                    || assignedBookIds.contains(b.getId()))
                            .collect(Collectors.toList());

                    long totalReads = 0L;
                    long totalViews = 0L;
                    long totalAudios = matchedBooks.stream().filter(b -> b.getAudioUrl() != null && !b.getAudioUrl().isBlank()).count();

                    return toDto(a, u, assignedBookIds, matchedBooks.size(), totalReads, totalViews, totalAudios);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AuthorResponseDto getAuthorById(String id) {
        Author author = authorRepository.findById(id)
                .or(() -> authorRepository.findByUserId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Автор табылмады id: " + id));

        User user = author.getUserId() != null ? userRepository.findById(author.getUserId()).orElse(null) : null;
        List<String> assignedBookIds = authorBookRepository.findByAuthorId(id).stream()
                .map(AuthorBook::getBookId)
                .collect(Collectors.toList());

        String matchName = author.getDisplayName().toLowerCase().trim();
        List<Book> matchedBooks = bookRepository.findAll().stream()
                .filter(b -> (b.getAuthor() != null && b.getAuthor().toLowerCase().trim().equals(matchName))
                        || assignedBookIds.contains(b.getId()))
                .collect(Collectors.toList());

        long totalReads = 0L;
        long totalViews = 0L;
        long totalAudios = matchedBooks.stream().filter(b -> b.getAudioUrl() != null && !b.getAudioUrl().isBlank()).count();

        return toDto(author, user, assignedBookIds, matchedBooks.size(), totalReads, totalViews, totalAudios);
    }

    @Transactional
    public AuthorResponseDto createAuthor(AuthorRequestDto dto) {
        String email = dto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Бұл электронды поштамен пайдаланушы тіркелген");
        }

        String displayName = (dto.getAssignedAuthorName() != null && !dto.getAssignedAuthorName().isBlank())
                ? dto.getAssignedAuthorName().trim()
                : dto.getName().trim();

        String idNum = dto.getIdNumber() != null ? dto.getIdNumber().trim() : null;
        if (idNum != null && !idNum.isBlank()) {
            if (userRepository.existsByIdNumber(idNum)) {
                throw new BadRequestException("Бұл ID нөмірі бос емес");
            }
        } else {
            long authorCount = authorRepository.count() + 1;
            idNum = String.format("0000 %04d", authorCount);
        }

        String password = dto.getPassword();
        if (password == null || password.isBlank()) {
            password = "author" + UUID.randomUUID().toString().substring(0, 6);
        }

        String username = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9_]", "");
        if (username.isBlank()) {
            username = "author" + UUID.randomUUID().toString().substring(0, 4);
        }

        // 1. Create linked User with role 'author'
        User user = User.builder()
                .id("author-user-" + UUID.randomUUID().toString().substring(0, 8))
                .idNumber(idNum)
                .name(dto.getName().trim())
                .email(email)
                .phone(dto.getPhone() != null ? dto.getPhone().trim() : null)
                .passwordHash(passwordEncoder.encode(password.trim()))
                .authProvider(email.contains("@gmail.com") ? "GOOGLE" : "LOCAL")
                .role("author")
                .duty("Автор")
                .avatarUrl(dto.getAvatarUrl() != null ? dto.getAvatarUrl().trim() : null)
                .username(username)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .isBlocked(false)
                .build();
        user = userRepository.save(user);

        // 2. Create Author entity
        Author author = Author.builder()
                .id("author-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getId())
                .displayName(displayName)
                .bio(dto.getBio() != null ? dto.getBio().trim() : null)
                .phone(user.getPhone())
                .idNumber(user.getIdNumber())
                .isActive(user.getIsActive())
                .build();
        author = authorRepository.save(author);

        // 3. Link assigned books
        List<String> assignedBookIds = dto.getAssignedBookIds() != null ? dto.getAssignedBookIds() : Collections.emptyList();
        for (String bookId : assignedBookIds) {
            authorBookRepository.save(AuthorBook.builder()
                    .authorId(author.getId())
                    .bookId(bookId.trim())
                    .build());
        }

        log.info("Author created: id={}, displayName={}, userId={}", author.getId(), author.getDisplayName(), user.getId());
        return toDto(author, user, assignedBookIds, assignedBookIds.size(), 0L, 0L, 0L);
    }

    @Transactional
    public AuthorResponseDto updateAuthor(String id, AuthorRequestDto dto) {
        Author author = authorRepository.findById(id)
                .or(() -> authorRepository.findByUserId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Автор табылмады id: " + id));

        User user = author.getUserId() != null ? userRepository.findById(author.getUserId()).orElse(null) : null;

        String displayName = (dto.getAssignedAuthorName() != null && !dto.getAssignedAuthorName().isBlank())
                ? dto.getAssignedAuthorName().trim()
                : (dto.getName() != null && !dto.getName().isBlank() ? dto.getName().trim() : author.getDisplayName());

        author.setDisplayName(displayName);
        if (dto.getBio() != null) {
            author.setBio(dto.getBio().trim());
        }
        if (dto.getPhone() != null) {
            author.setPhone(dto.getPhone().trim());
        }
        if (dto.getIsActive() != null) {
            author.setIsActive(dto.getIsActive());
        }
        author = authorRepository.save(author);

        if (user != null) {
            if (dto.getName() != null && !dto.getName().isBlank()) {
                user.setName(dto.getName().trim());
            }
            if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
                String newEmail = dto.getEmail().trim().toLowerCase();
                if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                    throw new BadRequestException("Бұл электронды поштамен басқа пайдаланушы тіркелген");
                }
                user.setEmail(newEmail);
            }
            if (dto.getPhone() != null) {
                user.setPhone(dto.getPhone().trim());
            }
            if (dto.getIdNumber() != null && !dto.getIdNumber().isBlank()) {
                String newIdNumber = dto.getIdNumber().trim();
                if (!newIdNumber.equalsIgnoreCase(user.getIdNumber()) && userRepository.existsByIdNumber(newIdNumber)) {
                    throw new BadRequestException("Бұл ID нөмірі бос емес");
                }
                user.setIdNumber(newIdNumber);
                author.setIdNumber(newIdNumber);
            }
            if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                user.setPasswordHash(passwordEncoder.encode(dto.getPassword().trim()));
            }
            if (dto.getAvatarUrl() != null) {
                user.setAvatarUrl(dto.getAvatarUrl().trim());
            }
            if (dto.getIsActive() != null) {
                user.setIsActive(dto.getIsActive());
            }
            userRepository.save(user);
        }

        if (dto.getAssignedBookIds() != null) {
            authorBookRepository.deleteByAuthorId(author.getId());
            for (String bookId : dto.getAssignedBookIds()) {
                authorBookRepository.save(AuthorBook.builder()
                        .authorId(author.getId())
                        .bookId(bookId.trim())
                        .build());
            }
        }

        List<String> assignedBookIds = authorBookRepository.findByAuthorId(author.getId()).stream()
                .map(AuthorBook::getBookId)
                .collect(Collectors.toList());

        log.info("Author updated: id={}, displayName={}", author.getId(), author.getDisplayName());
        return toDto(author, user, assignedBookIds, assignedBookIds.size(), 0L, 0L, 0L);
    }

    @Transactional
    public void deleteAuthor(String id) {
        Author author = authorRepository.findById(id)
                .or(() -> authorRepository.findByUserId(id))
                .orElseThrow(() -> new ResourceNotFoundException("Автор табылмады id: " + id));

        authorBookRepository.deleteByAuthorId(author.getId());
        String userId = author.getUserId();
        authorRepository.deleteById(author.getId());

        if (userId != null) {
            userRepository.deleteById(userId);
        }
        log.info("Author deleted: id={}, userId={}", author.getId(), userId);
    }

    private AuthorResponseDto toDto(
            Author author,
            User user,
            List<String> assignedBookIds,
            int booksCount,
            long totalReads,
            long totalViews,
            long totalAudios
    ) {
        return AuthorResponseDto.builder()
                .id(author.getId())
                .userId(author.getUserId())
                .name(user != null ? user.getName() : author.getDisplayName())
                .displayName(author.getDisplayName())
                .email(user != null ? user.getEmail() : null)
                .phone(author.getPhone())
                .idNumber(author.getIdNumber())
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .bio(author.getBio())
                .assignedAuthorName(author.getDisplayName())
                .assignedBookIds(assignedBookIds)
                .isActive(author.getIsActive())
                .createdAt(author.getCreatedAt())
                .booksCount(booksCount)
                .totalReads(totalReads)
                .totalViews(totalViews)
                .totalAudios(totalAudios)
                .build();
    }
}
