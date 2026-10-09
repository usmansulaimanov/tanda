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
@Table(name = "reading_group_invitations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingGroupInvitation {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "group_id", length = 64, nullable = false)
    private String groupId;

    @Column(name = "inviter_id", length = 64, nullable = false)
    private String inviterId;

    @Column(name = "invitee_id", length = 64)
    private String inviteeId;

    @Column(name = "invitee_email", length = 255, nullable = false)
    private String inviteeEmail;

    @Column(name = "token", length = 64, nullable = false, unique = true)
    private String token;

    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private String status = "PENDING"; // "PENDING", "ACCEPTED", "REJECTED", "EXPIRED"

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "rejected_at")
    private OffsetDateTime rejectedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (expiresAt == null) {
            expiresAt = createdAt.plusDays(7);
        }
        if (status == null) {
            status = "PENDING";
        }
    }
}
