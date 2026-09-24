package com.tanda.repository;

import com.tanda.entity.AudioSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AudioSessionRepository extends JpaRepository<AudioSession, String> {

    List<AudioSession> findByUserIdOrderByStartedAtDesc(String userId);

    Optional<AudioSession> findByIdAndUserId(String id, String userId);

    @Query("SELECT s.book.id, COUNT(s.id), COALESCE(SUM(s.validSeconds), 0), COUNT(DISTINCT s.userId) " +
           "FROM AudioSession s " +
           "WHERE s.startedAt >= :since " +
           "GROUP BY s.book.id " +
           "ORDER BY COUNT(s.id) DESC, COALESCE(SUM(s.validSeconds), 0) DESC")
    List<Object[]> findTopAudioSessionsSince(@Param("since") OffsetDateTime since, Pageable pageable);

    @Query("SELECT s.book.id, COUNT(s.id), COALESCE(SUM(s.validSeconds), 0), COUNT(DISTINCT s.userId) " +
           "FROM AudioSession s " +
           "WHERE s.startedAt >= :start AND s.startedAt < :end " +
           "GROUP BY s.book.id " +
           "ORDER BY COALESCE(SUM(s.validSeconds), 0) DESC, COUNT(s.id) DESC")
    List<Object[]> findTopAudioSessionsBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, Pageable pageable);

    @Query("SELECT COUNT(s.id) FROM AudioSession s WHERE s.book.id = :bookId AND s.startedAt >= :since")
    long countSessionsForBookSince(@Param("bookId") String bookId, @Param("since") OffsetDateTime since);

    @Query("SELECT COUNT(s.id), COALESCE(SUM(s.validSeconds), 0), COUNT(DISTINCT s.userId) FROM AudioSession s")
    List<Object[]> getGlobalAudioStats();

    @Query("SELECT s.book.id, COUNT(s.id), COALESCE(SUM(s.validSeconds), 0), COUNT(DISTINCT s.userId) " +
           "FROM AudioSession s " +
           "GROUP BY s.book.id " +
           "ORDER BY COUNT(s.id) DESC, COALESCE(SUM(s.validSeconds), 0) DESC")
    List<Object[]> getAudioStatsPerBook(Pageable pageable);
}
