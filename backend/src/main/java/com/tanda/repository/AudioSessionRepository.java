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

    @Query("SELECT COUNT(DISTINCT s.userId) FROM AudioSession s WHERE s.book.id = :bookId")
    long countUniqueListenersByBookId(@Param("bookId") String bookId);

    @Query("SELECT COUNT(DISTINCT s.userId) FROM AudioSession s WHERE s.book.id = :bookId AND s.startedAt >= :start AND s.startedAt < :end")
    long countUniqueListenersByBookIdBetween(@Param("bookId") String bookId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("SELECT s.userId, COALESCE(SUM(s.validSeconds), 0) " +
           "FROM AudioSession s " +
           "WHERE s.book.id = :bookId AND s.startedAt >= :start AND s.startedAt < :end " +
           "GROUP BY s.userId")
    List<Object[]> getUserListeningSumsForBookBetween(@Param("bookId") String bookId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("SELECT s.userId, COALESCE(SUM(s.validSeconds), 0) " +
           "FROM AudioSession s " +
           "WHERE s.book.id = :bookId " +
           "GROUP BY s.userId")
    List<Object[]> getUserListeningSumsForBookAllTime(@Param("bookId") String bookId);

    @Query("SELECT u, COALESCE(SUM(s.validSeconds), 0), MAX(s.lastHeartbeatAt) " +
           "FROM AudioSession s, User u " +
           "WHERE s.userId = u.id AND s.book.id = :bookId AND s.startedAt >= :start AND s.startedAt < :end " +
           "GROUP BY u " +
           "HAVING COALESCE(SUM(s.validSeconds), 0) >= :minSeconds " +
           "ORDER BY COALESCE(SUM(s.validSeconds), 0) DESC")
    List<Object[]> getAudienceForBookBetween(@Param("bookId") String bookId,
                                            @Param("start") OffsetDateTime start,
                                            @Param("end") OffsetDateTime end,
                                            @Param("minSeconds") int minSeconds);

    @Query("SELECT u, COALESCE(SUM(s.validSeconds), 0), MAX(s.lastHeartbeatAt) " +
           "FROM AudioSession s, User u " +
           "WHERE s.userId = u.id AND s.book.id = :bookId " +
           "GROUP BY u " +
           "HAVING COALESCE(SUM(s.validSeconds), 0) >= :minSeconds " +
           "ORDER BY COALESCE(SUM(s.validSeconds), 0) DESC")
    List<Object[]> getAudienceForBookAllTime(@Param("bookId") String bookId,
                                            @Param("minSeconds") int minSeconds);

    @Query("SELECT COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId = :userId AND s.startedAt >= :since")
    long getUserTotalListeningSince(@Param("userId") String userId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.book.id = :bookId AND s.userId = :userId AND s.startedAt >= :since")
    long getUserBookListeningSince(@Param("bookId") String bookId, @Param("userId") String userId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.book.id = :bookId AND s.userId = :userId")
    long getUserBookListeningAllTime(@Param("bookId") String bookId, @Param("userId") String userId);

    @Query("SELECT s FROM AudioSession s WHERE s.book.id = :bookId AND s.userId = :userId AND s.startedAt >= :start AND s.startedAt < :end")
    List<AudioSession> findUserSessionsForBookBetween(@Param("bookId") String bookId,
                                                     @Param("userId") String userId,
                                                     @Param("start") OffsetDateTime start,
                                                     @Param("end") OffsetDateTime end);

    @Query("SELECT s.userId, COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId IS NOT NULL AND s.startedAt >= :since GROUP BY s.userId")
    List<Object[]> sumValidSecondsByUserSince(@Param("since") OffsetDateTime since);

    @Query("SELECT s.userId, COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId IS NOT NULL AND s.startedAt >= :start AND s.startedAt < :end GROUP BY s.userId")
    List<Object[]> sumValidSecondsByUserBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("SELECT s.userId, COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId IS NOT NULL GROUP BY s.userId")
    List<Object[]> sumValidSecondsByUserAllTime();

    @Query("SELECT s FROM AudioSession s WHERE s.userId = :userId AND s.startedAt >= :start AND s.startedAt < :end")
    List<AudioSession> findUserSessionsBetween(@Param("userId") String userId,
                                               @Param("start") OffsetDateTime start,
                                               @Param("end") OffsetDateTime end);

    @Query("SELECT s.book.id, COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId = :userId AND s.startedAt >= :since GROUP BY s.book.id")
    List<Object[]> getUserListeningSumsPerBookSince(@Param("userId") String userId, @Param("since") OffsetDateTime since);

    @Query("SELECT s.book.id, COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId = :userId AND s.startedAt >= :start AND s.startedAt < :end GROUP BY s.book.id")
    List<Object[]> getUserListeningSumsPerBookBetween(@Param("userId") String userId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("SELECT s.book.id, COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId = :userId GROUP BY s.book.id")
    List<Object[]> getUserListeningSumsPerBookAllTime(@Param("userId") String userId);

    @Query("SELECT s FROM AudioSession s WHERE s.book.id IN :bookIds AND s.startedAt >= :start AND s.startedAt < :end")
    List<AudioSession> findSessionsForBooksBetween(@Param("bookIds") List<String> bookIds,
                                                  @Param("start") OffsetDateTime start,
                                                  @Param("end") OffsetDateTime end);

    @Query("SELECT u.id, u.name, u.email, u.avatarUrl, COALESCE(SUM(s.validSeconds), 0), MAX(s.lastHeartbeatAt) " +
           "FROM AudioSession s JOIN User u ON s.userId = u.id " +
           "WHERE s.startedAt >= :start AND s.startedAt < :end " +
           "GROUP BY u.id, u.name, u.email, u.avatarUrl " +
           "ORDER BY COALESCE(SUM(s.validSeconds), 0) DESC, MAX(s.lastHeartbeatAt) ASC")
    List<Object[]> findTopUsersBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT s.userId) FROM AudioSession s WHERE s.startedAt >= :start AND s.startedAt < :end")
    long countParticipantsBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("SELECT COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId = :userId AND s.startedAt >= :start AND s.startedAt < :end")
    long getUserSecondsBetween(@Param("userId") String userId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query(value = "SELECT COUNT(*) FROM (" +
                   "  SELECT s.user_id " +
                   "  FROM audio_sessions s " +
                   "  WHERE s.started_at >= :start AND s.started_at < :end " +
                   "  GROUP BY s.user_id " +
                   "  HAVING COALESCE(SUM(s.valid_seconds), 0) > :seconds" +
                   ") sub", nativeQuery = true)
    long countUsersWithMoreSecondsBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("seconds") long seconds);

    @Query("SELECT s.userId, COALESCE(SUM(s.validSeconds), 0) " +
           "FROM AudioSession s " +
           "WHERE s.userId IN :userIds " +
           "GROUP BY s.userId")
    List<Object[]> findTotalSecondsByUserIds(@Param("userIds") List<String> userIds);

    @Query("SELECT COALESCE(SUM(s.validSeconds), 0) FROM AudioSession s WHERE s.userId = :userId")
    long getUserTotalSecondsAllTime(@Param("userId") String userId);

    @Query("SELECT s.startedAt, s.validSeconds FROM AudioSession s WHERE s.userId = :userId AND s.startedAt >= :since ORDER BY s.startedAt ASC")
    List<Object[]> getUserSessionTimesSince(@Param("userId") String userId, @Param("since") OffsetDateTime since);
}



