package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
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
@Table(name = "promo_uses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromoUse {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "promo_code_id", length = 64, nullable = false)
    private String promoCodeId;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "user_name", length = 255)
    private String userName;

    @Column(name = "user_email", length = 255)
    private String userEmail;

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = "use-" + UUID.randomUUID().toString();
        }
        if (usedAt == null) {
            usedAt = OffsetDateTime.now();
        }
    }
}
