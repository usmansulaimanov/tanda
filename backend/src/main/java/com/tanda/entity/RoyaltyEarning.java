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

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "royalty_earnings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoyaltyEarning {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "period_id", length = 64, nullable = false)
    private String periodId;

    @Column(name = "author_id", length = 64, nullable = false)
    private String authorId;

    @Column(name = "book_id", length = 64)
    private String bookId;

    @Column(name = "minutes_listened", nullable = false)
    @Builder.Default
    private Long minutesListened = 0L;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "status", length = 32, nullable = false)
    @Builder.Default
    private String status = "CALCULATED"; // "CALCULATED", "PAID"

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = "CALCULATED";
        }
        if (this.minutesListened == null) {
            this.minutesListened = 0L;
        }
        if (this.amount == null) {
            this.amount = BigDecimal.ZERO;
        }
    }
}
