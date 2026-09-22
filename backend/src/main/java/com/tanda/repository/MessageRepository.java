package com.tanda.repository;

import com.tanda.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {

    @Query("SELECT m FROM Message m WHERE m.targetType = 'all' OR m.recipientId = :userId OR m.targetUserIds LIKE %:userId% ORDER BY m.createdAt DESC")
    List<Message> findMessagesForUser(@Param("userId") String userId);

    List<Message> findAllByOrderByCreatedAtDesc();
}
