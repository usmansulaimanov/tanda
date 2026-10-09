package com.tanda.repository;

import com.tanda.entity.ReadingGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingGroupMemberRepository extends JpaRepository<ReadingGroupMember, String> {

    Optional<ReadingGroupMember> findByGroupIdAndUserId(String groupId, String userId);

    List<ReadingGroupMember> findByGroupIdAndStatusOrderByMonthlyReadingSecondsDesc(String groupId, String status);

    List<ReadingGroupMember> findByGroupIdAndStatusOrderByTotalReadingSecondsDesc(String groupId, String status);

    List<ReadingGroupMember> findByUserIdAndStatusOrderByJoinedAtDesc(String userId, String status);

    long countByGroupIdAndStatus(String groupId, String status);

    boolean existsByGroupIdAndUserIdAndStatus(String groupId, String userId, String status);

    @Modifying
    @Query("UPDATE ReadingGroupMember m SET m.monthlyReadingSeconds = 0")
    void resetAllMonthlyReadingSeconds();
}
