package com.tanda.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "reading_group_members", uniqueConstraints = {
        @UniqueConstraint(name = "uk_group_member", columnNames = {"group_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingGroupMember {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "group_id", length = 64, nullable = false)
    private String groupId;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "role", length = 20, nullable = false)
    @Builder.Default
    private String role = "MEMBER"; // "CREATOR", "ADMIN", "MEMBER"

    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private String status = "ACTIVE"; // "ACTIVE", "BANNED"

    @Column(name = "monthly_reading_seconds", nullable = false)
    @Builder.Default
    private Long monthlyReadingSeconds = 0L;

    @Column(name = "total_reading_seconds", nullable = false)
    @Builder.Default
    private Long totalReadingSeconds = 0L;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @PrePersist
    public void prePersist() {
        if (joinedAt == null) {
            joinedAt = OffsetDateTime.now();
        }
        if (role == null) {
            role = "MEMBER";
        }
        if (status == null) {
            status = "ACTIVE";
        }
        if (monthlyReadingSeconds == null) {
            monthlyReadingSeconds = 0L;
        }
        if (totalReadingSeconds == null) {
            totalReadingSeconds = 0L;
        }
    }
}
