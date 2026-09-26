package com.tanda.repository;

import com.tanda.entity.UserDailyAudioLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface UserDailyAudioLimitRepository extends JpaRepository<UserDailyAudioLimit, String> {
    Optional<UserDailyAudioLimit> findByUserIdAndStatDate(String userId, LocalDate statDate);

    void deleteByUserId(String userId);
}
