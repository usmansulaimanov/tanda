package com.tanda.repository;

import com.tanda.entity.AuthorDailyBookStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuthorDailyBookStatsRepository extends JpaRepository<AuthorDailyBookStats, String> {
    Optional<AuthorDailyBookStats> findByAuthorIdAndBookIdAndStatDate(String authorId, String bookId, LocalDate statDate);
    List<AuthorDailyBookStats> findByAuthorIdAndStatDateBetween(String authorId, LocalDate startDate, LocalDate endDate);
    List<AuthorDailyBookStats> findByStatDateBetween(LocalDate startDate, LocalDate endDate);
    List<AuthorDailyBookStats> findByAuthorId(String authorId);
}
