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

    Page<ReadingGroup> findByIsPublicTrueOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT g FROM ReadingGroup g WHERE g.isPublic = true AND LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY g.createdAt DESC")
    Page<ReadingGroup> searchPublicGroups(@Param("query") String query, Pageable pageable);

    long countByCreatorId(String creatorId);

    List<ReadingGroup> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
}
