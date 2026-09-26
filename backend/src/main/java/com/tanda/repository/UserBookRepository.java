package com.tanda.repository;

import com.tanda.entity.UserBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBookRepository extends JpaRepository<UserBook, String> {

    @Query("SELECT ub FROM UserBook ub JOIN FETCH ub.book WHERE ub.userId = :userId ORDER BY ub.updatedAt DESC")
    List<UserBook> findAllByUserIdWithBook(@Param("userId") String userId);

    @Query("SELECT ub FROM UserBook ub JOIN FETCH ub.book WHERE ub.userId = :userId AND ub.status = :status ORDER BY ub.updatedAt DESC")
    List<UserBook> findAllByUserIdAndStatusWithBook(@Param("userId") String userId, @Param("status") String status);

    @Query("SELECT ub FROM UserBook ub JOIN FETCH ub.book WHERE ub.userId = :userId AND ub.book.id = :bookId")
    Optional<UserBook> findByUserIdAndBookIdWithBook(@Param("userId") String userId, @Param("bookId") String bookId);

    Optional<UserBook> findByUserIdAndBookId(String userId, String bookId);

    boolean existsByUserIdAndBookId(String userId, String bookId);

    void deleteByUserIdAndBookId(String userId, String bookId);

    void deleteByUserId(String userId);
}
