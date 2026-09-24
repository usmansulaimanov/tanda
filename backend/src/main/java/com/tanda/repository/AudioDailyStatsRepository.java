package com.tanda.repository;

import com.tanda.entity.AudioDailyStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AudioDailyStatsRepository extends JpaRepository<AudioDailyStats, String> {

    Optional<AudioDailyStats> findByBookIdAndStatDate(String bookId, LocalDate statDate);

    List<AudioDailyStats> findByStatDateOrderByTotalSecondsDesc(LocalDate statDate);

    List<AudioDailyStats> findByStatDateBetween(LocalDate startDate, LocalDate endDate);

    List<AudioDailyStats> findByBookIdInAndStatDateBetween(List<String> bookIds, LocalDate startDate, LocalDate endDate);

    List<AudioDailyStats> findByBookIdAndStatDateBetween(String bookId, LocalDate startDate, LocalDate endDate);
}
