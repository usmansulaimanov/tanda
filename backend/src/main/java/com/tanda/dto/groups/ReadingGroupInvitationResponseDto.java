package com.tanda.dto.groups;

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
public class ReadingGroupInvitationResponseDto {

    private String id;
    private String groupId;
    private String groupName;
    private String groupDescription;
    private String groupCoverImageUrl;
    private String inviterId;
    private String inviterName;
    private String inviterAvatarUrl;
    private String inviteeEmail;
    private String token;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;
}
