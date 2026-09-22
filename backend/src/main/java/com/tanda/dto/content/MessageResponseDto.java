package com.tanda.dto.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponseDto {

    private String id;
    private String senderId;
    private String senderName;
    private String senderRole;
    private String recipientId;
    private String targetType;
    private List<String> targetUserIds;
    private List<String> targetUserNames;
    private String title;
    private String content;
    private String priority;
    private String bookId;
    private String bookTitle;
    private String newsId;
    private String newsTitle;
    private Boolean canReaderDelete;
    private OffsetDateTime expiresAt;
    private OffsetDateTime createdAt;
    private Boolean isRead;
    private List<String> readByUserIds;
    private List<String> deletedByUserIds;
}
