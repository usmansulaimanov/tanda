package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "user_books", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_books_user_book", columnNames = {"user_id", "book_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBook {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "status", length = 32, nullable = false)
    private String status; // 'reading', 'completed', 'want_to_read'

    @Column(name = "current_page")
    @Builder.Default
    private Integer currentPage = 1;

    @Column(name = "total_pages")
    private Integer totalPages;

    @Column(name = "progress_percent")
    @Builder.Default
    private Double progressPercent = 0.0;

    @Column(name = "added_at", nullable = false)
    private OffsetDateTime addedAt;

    @Column(name = "last_read_at")
    private OffsetDateTime lastReadAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.addedAt == null) {
            this.addedAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status != null) {
            this.status = this.status.trim().toLowerCase();
        }
        if (this.currentPage == null) {
            this.currentPage = 1;
        }
        if (this.progressPercent == null) {
            this.progressPercent = 0.0;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = OffsetDateTime.now();
        if (this.status != null) {
            this.status = this.status.trim().toLowerCase();
        }
    }
}
