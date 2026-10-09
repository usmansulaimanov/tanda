package com.tanda.repository;

import com.tanda.entity.ReadingGroupInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingGroupInvitationRepository extends JpaRepository<ReadingGroupInvitation, String> {

    Optional<ReadingGroupInvitation> findByToken(String token);

    Optional<ReadingGroupInvitation> findByGroupIdAndInviteeEmailAndStatus(String groupId, String inviteeEmail, String status);

    List<ReadingGroupInvitation> findByInviteeIdAndStatusOrderByCreatedAtDesc(String inviteeId, String status);

    List<ReadingGroupInvitation> findByInviteeEmailAndStatusOrderByCreatedAtDesc(String inviteeEmail, String status);

    List<ReadingGroupInvitation> findByGroupIdOrderByCreatedAtDesc(String groupId);

    @Query("SELECT i FROM ReadingGroupInvitation i WHERE i.groupId = :groupId AND i.inviteeEmail = :email AND i.status = 'REJECTED' AND i.rejectedAt >= :after")
    List<ReadingGroupInvitation> findRecentRejections(@Param("groupId") String groupId, @Param("email") String email, @Param("after") OffsetDateTime after);
}
