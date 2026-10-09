package com.tanda.repository;

import com.tanda.entity.ReadingGroupMonthlyArchive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingGroupMonthlyArchiveRepository extends JpaRepository<ReadingGroupMonthlyArchive, String> {

    List<ReadingGroupMonthlyArchive> findByGroupIdOrderByYearMonthDesc(String groupId);

    Optional<ReadingGroupMonthlyArchive> findByGroupIdAndYearMonth(String groupId, String yearMonth);
}
