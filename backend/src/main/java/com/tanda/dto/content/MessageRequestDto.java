package com.tanda.dto.content;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageRequestDto {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    private String targetType; // 'all', 'single', 'multiple'
    private List<String> targetUserIds;
    private List<String> targetUserNames;
    private String bookId;
    private String bookTitle;
    private String newsId;
    private String newsTitle;
    private String priority; // 'normal', 'news', 'important'
    private String senderName;
    private Boolean canReaderDelete;
    private Integer expiresInHours;
}
