package com.tanda.repository;

import com.tanda.entity.ReadingGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReadingGroupRepository extends JpaRepository<ReadingGroup, String> {

    Page<ReadingGroup> findByIsPublicTrueAndStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("SELECT g FROM ReadingGroup g WHERE g.isPublic = true AND g.status = 'APPROVED' AND (LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) OR (g.username IS NOT NULL AND LOWER(g.username) LIKE LOWER(CONCAT('%', :query, '%')))) ORDER BY g.createdAt DESC")
    Page<ReadingGroup> searchPublicApprovedGroups(@Param("query") String query, Pageable pageable);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, String id);

    java.util.Optional<ReadingGroup> findByUsernameIgnoreCase(String username);

    long countByCreatorId(String creatorId);

    List<ReadingGroup> findByCreatorIdOrderByCreatedAtDesc(String creatorId);

    Page<ReadingGroup> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<ReadingGroup> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(String status);
}
