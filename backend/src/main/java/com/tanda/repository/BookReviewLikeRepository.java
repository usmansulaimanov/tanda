package com.tanda.repository;

import com.tanda.entity.BookReviewLike;
import com.tanda.entity.BookReviewLikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookReviewLikeRepository extends JpaRepository<BookReviewLike, BookReviewLikeId> {

    boolean existsByIdReviewIdAndIdUserId(Long reviewId, String userId);

    Optional<BookReviewLike> findByIdReviewIdAndIdUserId(Long reviewId, String userId);

    List<BookReviewLike> findByIdUserIdAndIdReviewIdIn(String userId, List<Long> reviewIds);
}
