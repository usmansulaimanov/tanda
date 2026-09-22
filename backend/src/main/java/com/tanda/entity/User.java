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
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "id_number", length = 50, unique = true)
    private String idNumber;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", length = 255, nullable = true)
    private String passwordHash;

    @Column(name = "google_id", length = 255, unique = true)
    private String googleId;

    @Column(name = "auth_provider", length = 32, nullable = false)
    @Builder.Default
    private String authProvider = "LOCAL"; // "LOCAL" | "GOOGLE"

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "role", length = 10, nullable = false)
    @Builder.Default
    private String role = "client"; // "admin" | "client" | "author"

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "username", length = 100, unique = true)
    private String username;

    @Column(name = "birth_date", length = 50)
    private String birthDate;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "duty", length = 255)
    private String duty;

    @Column(name = "personal_message", columnDefinition = "TEXT")
    private String personalMessage;

    @Column(name = "personal_message_days")
    private Integer personalMessageDays;

    @Column(name = "personal_message_active")
    private Boolean personalMessageActive;

    @Column(name = "is_blocked", nullable = false)
    @Builder.Default
    private Boolean isBlocked = false;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (role == null) {
            role = "client";
        }
        if (isActive == null) {
            isActive = true;
        }
        if (isBlocked == null) {
            isBlocked = false;
        }
        if (authProvider == null) {
            authProvider = "LOCAL";
        }
    }
}
