package com.tanda.repository;

import com.tanda.entity.PromoUse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PromoUseRepository extends JpaRepository<PromoUse, String> {
    boolean existsByPromoCodeIdAndUserId(String promoCodeId, String userId);

    List<PromoUse> findByPromoCodeIdOrderByUsedAtDesc(String promoCodeId);

    List<PromoUse> findByUserIdOrderByUsedAtDesc(String userId);

    void deleteByPromoCodeId(String promoCodeId);
}
