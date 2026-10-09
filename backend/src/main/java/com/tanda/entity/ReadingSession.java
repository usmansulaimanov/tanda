package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "reading_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingSession {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "group_id", length = 64)
    private String groupId;

    @Column(name = "book_id")
    private Long bookId;

    @Column(name = "book_title", length = 255)
    private String bookTitle;

    @Column(name = "session_type", length = 20, nullable = false)
    @Builder.Default
    private String sessionType = "STOPWATCH"; // "STOPWATCH", "TIMER"

    @Column(name = "duration_seconds", nullable = false)
    private Long durationSeconds;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at", nullable = false)
    private OffsetDateTime endedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (sessionType == null) {
            sessionType = "STOPWATCH";
        }
    }
}
