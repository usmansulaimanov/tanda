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

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "promo_codes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromoCode {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "batch_id", length = 64)
    private String batchId;

    @Column(name = "batch_name", length = 255)
    private String batchName;

    @Column(name = "code", length = 64, nullable = false, unique = true)
    private String code;

    @Column(name = "reward_type", length = 64, nullable = false)
    @Builder.Default
    private String rewardType = "subscription_1m";

    @Column(name = "reward_title", length = 255, nullable = false)
    private String rewardTitle;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration_days", nullable = false)
    @Builder.Default
    private Integer durationDays = 30;

    @Column(name = "discount_percent")
    @Builder.Default
    private Integer discountPercent = 0;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "max_uses", nullable = false)
    @Builder.Default
    private Integer maxUses = 1;

    @Column(name = "used_count", nullable = false)
    @Builder.Default
    private Integer usedCount = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_issued", nullable = false)
    @Builder.Default
    private Boolean isIssued = false;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = "promo-" + UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
        if (rewardType == null) {
            rewardType = "subscription_1m";
        }
        if (durationDays == null) {
            durationDays = 30;
        }
        if (discountPercent == null) {
            discountPercent = 0;
        }
        if (maxUses == null) {
            maxUses = 1;
        }
        if (usedCount == null) {
            usedCount = 0;
        }
        if (isActive == null) {
            isActive = true;
        }
        if (isIssued == null) {
            isIssued = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
