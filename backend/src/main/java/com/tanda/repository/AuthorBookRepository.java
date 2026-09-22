package com.tanda.repository;

import com.tanda.entity.AuthorBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuthorBookRepository extends JpaRepository<AuthorBook, Long> {
    List<AuthorBook> findByAuthorId(String authorId);
    List<AuthorBook> findByAuthorIdIn(List<String> authorIds);
    List<AuthorBook> findByBookId(String bookId);
    void deleteByAuthorId(String authorId);
}
