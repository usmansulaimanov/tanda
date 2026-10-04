package com.tanda.repository;

import com.tanda.entity.BookReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookReviewRepository extends JpaRepository<BookReview, Long> {

    Optional<BookReview> findByBookIdAndUserId(String bookId, String userId);

    boolean existsByBookIdAndUserId(String bookId, String userId);

    @Query(
        value = "SELECT r FROM BookReview r JOIN FETCH r.user WHERE r.book.id = :bookId",
        countQuery = "SELECT COUNT(r) FROM BookReview r WHERE r.book.id = :bookId"
    )
    Page<BookReview> findByBookIdWithUser(@Param("bookId") String bookId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM BookReview r WHERE r.book.id = :bookId")
    Double getAverageRatingByBookId(@Param("bookId") String bookId);

    @Query("SELECT COUNT(r) FROM BookReview r WHERE r.book.id = :bookId")
    Long countByBookId(@Param("bookId") String bookId);

    @Query("SELECT r.rating, COUNT(r) FROM BookReview r WHERE r.book.id = :bookId GROUP BY r.rating")
    List<Object[]> countRatingsGroupedByRating(@Param("bookId") String bookId);
}
