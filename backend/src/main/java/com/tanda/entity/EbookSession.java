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
@Table(name = "ebook_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EbookSession {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "last_heartbeat_at", nullable = false)
    private OffsetDateTime lastHeartbeatAt;

    @Column(name = "last_activity_at", nullable = false)
    private OffsetDateTime lastActivityAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "valid_seconds", nullable = false)
    @Builder.Default
    private Integer validSeconds = 0;

    @Column(name = "credited_seconds", nullable = false)
    @Builder.Default
    private Integer creditedSeconds = 0;

    @Column(name = "current_page", nullable = false)
    @Builder.Default
    private Integer currentPage = 0;

    @Column(name = "total_pages", nullable = false)
    @Builder.Default
    private Integer totalPages = 0;

    @Column(name = "last_cfi", length = 512)
    private String lastCfi;

    @Column(name = "interaction_count", nullable = false)
    @Builder.Default
    private Integer interactionCount = 0;

    @PrePersist
    public void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.startedAt == null) {
            this.startedAt = now;
        }
        if (this.lastHeartbeatAt == null) {
            this.lastHeartbeatAt = now;
        }
        if (this.lastActivityAt == null) {
            this.lastActivityAt = now;
        }
        if (this.validSeconds == null) {
            this.validSeconds = 0;
        }
        if (this.creditedSeconds == null) {
            this.creditedSeconds = 0;
        }
        if (this.currentPage == null) {
            this.currentPage = 0;
        }
        if (this.totalPages == null) {
            this.totalPages = 0;
        }
        if (this.interactionCount == null) {
            this.interactionCount = 0;
        }
    }
}
