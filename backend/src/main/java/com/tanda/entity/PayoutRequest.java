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
@Table(name = "payout_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutRequest {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id; // e.g. "PO-1727040000000"

    @Column(name = "author_id", length = 64, nullable = false)
    private String authorId;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "method", length = 100)
    private String method;

    @Column(name = "card_or_account", length = 255)
    private String cardOrAccount;

    @Column(name = "status", length = 32, nullable = false)
    @Builder.Default
    private String status = "REQUESTED"; // "REQUESTED", "PROCESSING", "COMPLETED", "REJECTED"

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    @PrePersist
    public void onPrePersist() {
        if (this.requestedAt == null) {
            this.requestedAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = "REQUESTED";
        }
    }
}
