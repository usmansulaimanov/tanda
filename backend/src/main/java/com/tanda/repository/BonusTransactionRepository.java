package com.tanda.repository;

import com.tanda.entity.BonusTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BonusTransactionRepository extends JpaRepository<BonusTransaction, String> {

    Page<BonusTransaction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    List<BonusTransaction> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<BonusTransaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT bt FROM BonusTransaction bt WHERE (:type IS NULL OR bt.type = :type) ORDER BY bt.createdAt DESC")
    Page<BonusTransaction> findByTypeFiltered(@Param("type") String type, Pageable pageable);

    @Query("SELECT COALESCE(SUM(bt.amount), 0) FROM BonusTransaction bt WHERE bt.amount > 0")
    long sumTotalEarned();

    @Query("SELECT COALESCE(SUM(ABS(bt.amount)), 0) FROM BonusTransaction bt WHERE bt.amount < 0")
    long sumTotalSpent();

    long countByUserId(String userId);
}
