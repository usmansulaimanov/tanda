package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "reading_group_monthly_archives", uniqueConstraints = {
        @UniqueConstraint(name = "uk_group_monthly_archive", columnNames = {"group_id", "year_month"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingGroupMonthlyArchive {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "group_id", length = 64, nullable = false)
    private String groupId;

    @Column(name = "year_month", length = 7, nullable = false) // e.g. "2026-09"
    private String yearMonth;

    @Column(name = "winner_user_id", length = 64)
    private String winnerUserId;

    @Column(name = "winner_name", length = 255)
    private String winnerName;

    @Column(name = "winner_reading_seconds", nullable = false)
    @Builder.Default
    private Long winnerReadingSeconds = 0L;

    @Column(name = "total_group_reading_seconds", nullable = false)
    @Builder.Default
    private Long totalGroupReadingSeconds = 0L;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
