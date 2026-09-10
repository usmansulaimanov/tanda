package com.tanda.repository;

import com.tanda.entity.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, String> {

    List<Book> findByCategory(String category);

    List<Book> findByIsArchivedFalse();

    @Query("SELECT b FROM Book b WHERE " +
           "(:includeArchived = true OR b.isArchived = false) AND " +
           "(:category IS NULL OR :category = '' OR :category = 'Барлығы' OR LOWER(b.category) = LOWER(:category)) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(b.author) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY b.createdAt DESC")
    List<Book> searchBooks(@Param("category") String category,
                           @Param("search") String search,
                           @Param("includeArchived") boolean includeArchived);
}
