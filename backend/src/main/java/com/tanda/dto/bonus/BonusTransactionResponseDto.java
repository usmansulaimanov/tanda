package com.tanda.dto.bonus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BonusTransactionResponseDto {
    private String id;
    private String userId;
    private String userName;
    private String userEmail;
    private String userUsername;
    private String userIdNumber;
    private Integer amount;
    private String type;
    private String description;
    private OffsetDateTime createdAt;
}
