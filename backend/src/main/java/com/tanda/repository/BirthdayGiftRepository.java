package com.tanda.repository;

import com.tanda.entity.BirthdayGift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BirthdayGiftRepository extends JpaRepository<BirthdayGift, String> {
    boolean existsByUserIdAndGiftYearAndGiftType(String userId, Integer giftYear, String giftType);

    Optional<BirthdayGift> findTopByUserIdOrderByGiftYearDesc(String userId);

    List<BirthdayGift> findByUserId(String userId);
}
