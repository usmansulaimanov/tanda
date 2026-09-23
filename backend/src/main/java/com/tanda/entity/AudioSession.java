package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "audio_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AudioSession {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "chapter_id", length = 64)
    private String chapterId;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "last_heartbeat_at", nullable = false)
    private OffsetDateTime lastHeartbeatAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "valid_seconds")
    @Builder.Default
    private Integer validSeconds = 0;

    @Column(name = "credited_seconds")
    @Builder.Default
    private Integer creditedSeconds = 0;

    @PrePersist
    public void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.startedAt == null) {
            this.startedAt = now;
        }
        if (this.lastHeartbeatAt == null) {
            this.lastHeartbeatAt = now;
        }
        if (this.validSeconds == null) {
            this.validSeconds = 0;
        }
        if (this.creditedSeconds == null) {
            this.creditedSeconds = 0;
        }
    }
}
