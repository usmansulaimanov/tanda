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
@Table(name = "deleted_user_archives")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeletedUserArchive {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "id_number", length = 50)
    private String idNumber;

    @Column(name = "original_name", length = 255)
    private String originalName;

    @Column(name = "original_email", length = 255)
    private String originalEmail;

    @Column(name = "original_phone", length = 50)
    private String originalPhone;

    @Column(name = "original_username", length = 100)
    private String originalUsername;

    @Column(name = "original_role", length = 20, nullable = false)
    @Builder.Default
    private String originalRole = "client";

    @Column(name = "auth_provider", length = 32)
    private String authProvider;

    @Column(name = "registered_at")
    private OffsetDateTime registeredAt;

    @Column(name = "deleted_at", nullable = false)
    private OffsetDateTime deletedAt;

    @Column(name = "total_listen_seconds")
    @Builder.Default
    private Long totalListenSeconds = 0L;

    @Column(name = "books_listened_count")
    @Builder.Default
    private Integer booksListenedCount = 0;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "delete_reason", columnDefinition = "TEXT")
    private String deleteReason;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (deletedAt == null) {
            deletedAt = OffsetDateTime.now();
        }
        if (totalListenSeconds == null) {
            totalListenSeconds = 0L;
        }
        if (booksListenedCount == null) {
            booksListenedCount = 0;
        }
    }
}
