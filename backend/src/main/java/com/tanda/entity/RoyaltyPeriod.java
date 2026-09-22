package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "royalty_periods")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoyaltyPeriod {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id; // e.g. "2026-09"

    @Column(name = "period_month", length = 7, nullable = false, unique = true)
    private String month; // "YYYY-MM"

    @Column(name = "status", length = 32, nullable = false)
    @Builder.Default
    private String status = "DRAFT"; // "DRAFT", "CALCULATED", "FINALIZED"

    @Column(name = "total_revenue", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "admin_expense", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal adminExpense = BigDecimal.ZERO;

    @Column(name = "net_pool", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal netPool = BigDecimal.ZERO;

    @Column(name = "company_share", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal companyShare = BigDecimal.ZERO;

    @Column(name = "royalty_pool", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal royaltyPool = BigDecimal.ZERO;

    @Column(name = "total_minutes", nullable = false)
    @Builder.Default
    private Long totalMinutes = 0L;

    @Column(name = "rate_per_minute", precision = 10, scale = 4, nullable = false)
    @Builder.Default
    private BigDecimal ratePerMinute = BigDecimal.ZERO;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "calculated_at")
    private OffsetDateTime calculatedAt;

    @Column(name = "finalized_at")
    private OffsetDateTime finalizedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status == null) {
            this.status = "DRAFT";
        }
        if (this.totalRevenue == null) this.totalRevenue = BigDecimal.ZERO;
        if (this.adminExpense == null) this.adminExpense = BigDecimal.ZERO;
        if (this.netPool == null) this.netPool = BigDecimal.ZERO;
        if (this.companyShare == null) this.companyShare = BigDecimal.ZERO;
        if (this.royaltyPool == null) this.royaltyPool = BigDecimal.ZERO;
        if (this.totalMinutes == null) this.totalMinutes = 0L;
        if (this.ratePerMinute == null) this.ratePerMinute = BigDecimal.ZERO;
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
