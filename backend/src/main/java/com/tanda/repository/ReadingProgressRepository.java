package com.tanda.repository;

import com.tanda.entity.ReadingProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, String> {

    Optional<ReadingProgress> findByUserIdAndBookId(String userId, String bookId);
}
