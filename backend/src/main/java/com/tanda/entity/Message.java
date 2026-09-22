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
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "sender_id", length = 64)
    private String senderId;

    @Column(name = "sender_name", length = 255, nullable = false)
    @Builder.Default
    private String senderName = "Tanda";

    @Column(name = "sender_role", length = 64, nullable = false)
    @Builder.Default
    private String senderRole = "admin";

    @Column(name = "recipient_id", length = 64)
    private String recipientId;

    @Column(name = "target_type", length = 32, nullable = false)
    @Builder.Default
    private String targetType = "all"; // 'all', 'single', 'multiple'

    @Column(name = "target_user_ids", columnDefinition = "TEXT")
    private String targetUserIds;

    @Column(name = "target_user_names", columnDefinition = "TEXT")
    private String targetUserNames;

    @Column(name = "title", length = 500, nullable = false)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "priority", length = 32)
    @Builder.Default
    private String priority = "normal"; // 'normal', 'news', 'important'

    @Column(name = "book_id", length = 64)
    private String bookId;

    @Column(name = "book_title", length = 255)
    private String bookTitle;

    @Column(name = "news_id", length = 64)
    private String newsId;

    @Column(name = "news_title", length = 255)
    private String newsTitle;

    @Column(name = "can_reader_delete")
    @Builder.Default
    private Boolean canReaderDelete = false;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @Column(name = "read_by_user_ids", columnDefinition = "TEXT")
    @Builder.Default
    private String readByUserIds = "";

    @Column(name = "deleted_by_user_ids", columnDefinition = "TEXT")
    @Builder.Default
    private String deletedByUserIds = "";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.senderName == null) this.senderName = "Tanda";
        if (this.senderRole == null) this.senderRole = "admin";
        if (this.targetType == null) this.targetType = "all";
        if (this.priority == null) this.priority = "normal";
        if (this.canReaderDelete == null) this.canReaderDelete = false;
        if (this.readByUserIds == null) this.readByUserIds = "";
        if (this.deletedByUserIds == null) this.deletedByUserIds = "";
    }
}
