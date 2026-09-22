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
import java.util.UUID;

@Entity
@Table(name = "promo_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromoBatch {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "reward_type", length = 64, nullable = false)
    @Builder.Default
    private String rewardType = "subscription_1m";

    @Column(name = "reward_title", length = 255, nullable = false)
    private String rewardTitle;

    @Column(name = "duration_days", nullable = false)
    @Builder.Default
    private Integer durationDays = 30;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "prefix", length = 64, nullable = false)
    @Builder.Default
    private String prefix = "TANDA";

    @Column(name = "total_codes", nullable = false)
    @Builder.Default
    private Integer totalCodes = 0;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = "batch-" + UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (rewardType == null) {
            rewardType = "subscription_1m";
        }
        if (durationDays == null) {
            durationDays = 30;
        }
        if (prefix == null) {
            prefix = "TANDA";
        }
        if (totalCodes == null) {
            totalCodes = 0;
        }
    }
}
