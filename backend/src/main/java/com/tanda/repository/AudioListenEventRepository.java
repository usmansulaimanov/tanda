package com.tanda.repository;

import com.tanda.entity.AudioListenEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioListenEventRepository extends JpaRepository<AudioListenEvent, String> {

    List<AudioListenEvent> findBySessionIdOrderByRecordedAtAsc(String sessionId);

    Optional<AudioListenEvent> findTopBySessionIdOrderByRecordedAtDesc(String sessionId);
}
