package com.tanda.repository;

import com.tanda.entity.AudioSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioSessionRepository extends JpaRepository<AudioSession, String> {

    List<AudioSession> findByUserIdOrderByStartedAtDesc(String userId);

    Optional<AudioSession> findByIdAndUserId(String id, String userId);
}
