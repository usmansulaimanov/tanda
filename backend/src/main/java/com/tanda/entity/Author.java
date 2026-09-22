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

@Entity
@Table(name = "authors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Author {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64, unique = true)
    private String userId;

    @Column(name = "display_name", length = 255, nullable = false)
    private String displayName;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "id_number", length = 50)
    private String idNumber;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "balance", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private java.math.BigDecimal balance = java.math.BigDecimal.ZERO;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
        if (balance == null) {
            balance = java.math.BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
