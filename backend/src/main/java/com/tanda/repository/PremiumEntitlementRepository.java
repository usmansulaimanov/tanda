package com.tanda.repository;

import com.tanda.entity.PremiumEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PremiumEntitlementRepository extends JpaRepository<PremiumEntitlement, String> {
    List<PremiumEntitlement> findByUserIdAndIsActiveTrueOrderByExpiresAtDesc(String userId);

    Optional<PremiumEntitlement> findTopByUserIdAndIsActiveTrueAndExpiresAtAfterOrderByExpiresAtDesc(String userId, OffsetDateTime now);

    List<PremiumEntitlement> findByIsActiveTrueAndExpiresAtAfter(OffsetDateTime now);

    void deleteByUserId(String userId);
}
