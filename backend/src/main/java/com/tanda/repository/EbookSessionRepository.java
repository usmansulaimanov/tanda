package com.tanda.repository;

import com.tanda.entity.EbookSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EbookSessionRepository extends JpaRepository<EbookSession, String> {

    Optional<EbookSession> findByIdAndUserId(String id, String userId);

    @Query("SELECT s.book.id, COUNT(s.id), COALESCE(SUM(s.creditedSeconds), 0), COUNT(DISTINCT s.userId) " +
           "FROM EbookSession s " +
           "WHERE s.startedAt >= :start AND s.startedAt < :end " +
           "GROUP BY s.book.id " +
           "ORDER BY COALESCE(SUM(s.creditedSeconds), 0) DESC, COUNT(s.id) DESC")
    List<Object[]> findTopEbookSessionsBetween(@Param("start") OffsetDateTime start,
                                               @Param("end") OffsetDateTime end,
                                               Pageable pageable);

    @Query("SELECT s FROM EbookSession s WHERE s.book.id IN :bookIds AND s.startedAt >= :start AND s.startedAt < :end")
    List<EbookSession> findSessionsForBooksBetween(@Param("bookIds") List<String> bookIds,
                                                   @Param("start") OffsetDateTime start,
                                                   @Param("end") OffsetDateTime end);

    @Query("SELECT s.startedAt, s.creditedSeconds FROM EbookSession s WHERE s.startedAt >= :start AND s.startedAt < :end ORDER BY s.startedAt ASC")
    List<Object[]> findSessionTimesBetween(@Param("start") OffsetDateTime start,
                                           @Param("end") OffsetDateTime end);

    @Query("SELECT s.userId, COALESCE(SUM(s.creditedSeconds), 0) " +
           "FROM EbookSession s " +
           "WHERE s.book.id = :bookId AND s.startedAt >= :start AND s.startedAt < :end " +
           "GROUP BY s.userId")
    List<Object[]> getUserReadingSumsForBookBetween(@Param("bookId") String bookId,
                                                    @Param("start") OffsetDateTime start,
                                                    @Param("end") OffsetDateTime end);

    @Query("SELECT s.userId, COALESCE(SUM(s.creditedSeconds), 0) " +
           "FROM EbookSession s " +
           "WHERE s.book.id = :bookId " +
           "GROUP BY s.userId")
    List<Object[]> getUserReadingSumsForBookAllTime(@Param("bookId") String bookId);
}
