package com.tanda.repository;

import com.tanda.entity.SavedBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedBookRepository extends JpaRepository<SavedBook, String> {

    List<SavedBook> findByUserIdOrderBySavedAtDesc(String userId);

    Optional<SavedBook> findByUserIdAndBookId(String userId, String bookId);

    boolean existsByUserIdAndBookId(String userId, String bookId);

    void deleteByUserIdAndBookId(String userId, String bookId);

    @Query("SELECT s.book.id FROM SavedBook s WHERE s.user.id = :userId")
    List<String> findBookIdsByUserId(@Param("userId") String userId);
}
