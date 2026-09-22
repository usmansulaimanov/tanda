package com.tanda.repository;

import com.tanda.entity.RoyaltyEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoyaltyEarningRepository extends JpaRepository<RoyaltyEarning, String> {

    List<RoyaltyEarning> findByPeriodId(String periodId);

    List<RoyaltyEarning> findByAuthorId(String authorId);

    List<RoyaltyEarning> findByAuthorIdOrderByCreatedAtDesc(String authorId);

    List<RoyaltyEarning> findByPeriodIdAndAuthorId(String periodId, String authorId);

    void deleteByPeriodId(String periodId);
}
