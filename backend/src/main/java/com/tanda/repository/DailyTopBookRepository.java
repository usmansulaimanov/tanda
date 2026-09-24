package com.tanda.repository;

import com.tanda.entity.DailyTopBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyTopBookRepository extends JpaRepository<DailyTopBook, String> {

    List<DailyTopBook> findBySnapshotDateOrderByRankAsc(LocalDate snapshotDate);

    @Query("SELECT MAX(d.snapshotDate) FROM DailyTopBook d")
    LocalDate findLatestSnapshotDate();

    @Modifying
    @Query("DELETE FROM DailyTopBook d WHERE d.snapshotDate = :snapshotDate")
    void deleteBySnapshotDate(LocalDate snapshotDate);
}
