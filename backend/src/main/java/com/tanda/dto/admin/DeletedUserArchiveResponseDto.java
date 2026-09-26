package com.tanda.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeletedUserArchiveResponseDto {

    private String id;
    private String userId;
    private String idNumber;
    private String originalName;
    private String originalEmail;
    private String originalPhone;
    private String originalUsername;
    private String originalRole;
    private String authProvider;
    private OffsetDateTime registeredAt;
    private OffsetDateTime deletedAt;
    private Long totalListenSeconds;
    private Long totalListenMinutes;
    private Integer booksListenedCount;
    private String ipAddress;
    private String deleteReason;
}
