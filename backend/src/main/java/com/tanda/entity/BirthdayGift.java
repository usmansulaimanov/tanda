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
@Table(name = "birthday_gifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BirthdayGift {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "gift_year", nullable = false)
    private Integer giftYear;

    @Column(name = "gift_type", length = 64, nullable = false)
    @Builder.Default
    private String giftType = "PREMIUM_30";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = "bgift-" + UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (giftType == null) {
            giftType = "PREMIUM_30";
        }
    }
}
