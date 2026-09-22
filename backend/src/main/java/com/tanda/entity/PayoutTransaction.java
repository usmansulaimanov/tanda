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
@Table(name = "payout_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutTransaction {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "payout_request_id", length = 64, nullable = false)
    private String payoutRequestId;

    @Column(name = "reference", length = 255)
    private String reference;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;

    @PrePersist
    public void onPrePersist() {
        if (this.processedAt == null) {
            this.processedAt = OffsetDateTime.now();
        }
    }
}
