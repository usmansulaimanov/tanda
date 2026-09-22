package com.tanda.repository;

import com.tanda.entity.AudioDailyStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AudioDailyStatsRepository extends JpaRepository<AudioDailyStats, String> {

    Optional<AudioDailyStats> findByBookIdAndStatDate(String bookId, LocalDate statDate);
}
