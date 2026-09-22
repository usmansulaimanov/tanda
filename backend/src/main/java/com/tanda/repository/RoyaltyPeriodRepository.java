package com.tanda.repository;

import com.tanda.entity.RoyaltyPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoyaltyPeriodRepository extends JpaRepository<RoyaltyPeriod, String> {

    Optional<RoyaltyPeriod> findByMonth(String month);

    List<RoyaltyPeriod> findAllByOrderByMonthDesc();
}
