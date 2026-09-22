package com.tanda.repository;

import com.tanda.entity.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PromoCodeRepository extends JpaRepository<PromoCode, String> {
    Optional<PromoCode> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<PromoCode> findAllByOrderByCreatedAtDesc();

    List<PromoCode> findByBatchIdOrderByCreatedAtDesc(String batchId);

    void deleteByBatchId(String batchId);
}
