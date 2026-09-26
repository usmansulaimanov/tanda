package com.tanda.repository;

import com.tanda.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, String> {

    List<Book> findByCategory(String category);

    List<Book> findByIsArchivedFalse();

    List<Book> findByIsDeletedFalseAndIsArchivedFalse();

    @Query("SELECT b FROM Book b WHERE " +
           "(:includeDeleted = true OR b.isDeleted = false) AND " +
           "(:includeArchived = true OR b.isArchived = false) AND " +
           "(:category IS NULL OR :category = '' OR :category = 'Барлығы' OR LOWER(b.category) = LOWER(:category)) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(b.author) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY b.createdAt DESC")
    List<Book> searchBooks(@Param("category") String category,
                           @Param("search") String search,
                           @Param("includeArchived") boolean includeArchived,
                           @Param("includeDeleted") boolean includeDeleted);

    default List<Book> searchBooks(String category, String search, boolean includeArchived) {
        return searchBooks(category, search, includeArchived, false);
    }

    @Query("SELECT b FROM Book b WHERE " +
           "(:includeDeleted = true OR b.isDeleted = false) AND " +
           "(:includeArchived = true OR b.isArchived = false) AND " +
           "(:category IS NULL OR :category = '' OR :category = 'Барлығы' OR LOWER(b.category) = LOWER(:category)) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(b.author) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Book> searchBooks(@Param("category") String category,
                           @Param("search") String search,
                           @Param("includeArchived") boolean includeArchived,
                           @Param("includeDeleted") boolean includeDeleted,
                           Pageable pageable);

    default Page<Book> searchBooks(String category, String search, boolean includeArchived, Pageable pageable) {
        return searchBooks(category, search, includeArchived, false, pageable);
    }
}
