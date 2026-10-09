package com.tanda.repository;

import com.tanda.entity.ReadingSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface ReadingSessionRepository extends JpaRepository<ReadingSession, String> {

    Page<ReadingSession> findByUserIdOrderByStartedAtDesc(String userId, Pageable pageable);

    List<ReadingSession> findByUserIdAndStartedAtBetweenOrderByStartedAtAsc(String userId, OffsetDateTime start, OffsetDateTime end);

    @Query("SELECT COALESCE(SUM(rs.durationSeconds), 0) FROM ReadingSession rs WHERE rs.userId = :userId")
    Long sumDurationSecondsByUserId(@Param("userId") String userId);

    @Query("SELECT COALESCE(SUM(rs.durationSeconds), 0) FROM ReadingSession rs WHERE rs.userId = :userId AND rs.startedAt >= :since")
    Long sumDurationSecondsByUserIdSince(@Param("userId") String userId, @Param("since") OffsetDateTime since);

    @Query("SELECT COALESCE(SUM(rs.durationSeconds), 0) FROM ReadingSession rs WHERE rs.userId = :userId AND rs.groupId = :groupId AND rs.startedAt >= :since")
    Long sumDurationSecondsByUserIdAndGroupIdSince(@Param("userId") String userId, @Param("groupId") String groupId, @Param("since") OffsetDateTime since);

    @Query("SELECT rs.userId, COALESCE(SUM(rs.durationSeconds), 0) FROM ReadingSession rs WHERE rs.groupId = :groupId AND rs.startedAt >= :since GROUP BY rs.userId")
    List<Object[]> sumDurationSecondsByGroupIdGroupedByUser(@Param("groupId") String groupId, @Param("since") OffsetDateTime since);
}
