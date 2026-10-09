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
public class ReadingGroupResponseDto {

    private String id;
    private String name;
    private String description;
    private String coverImageUrl;
    private Boolean isPublic;
    private String creatorId;
    private String creatorName;
    private String creatorAvatarUrl;
    private Integer maxMembers;
    private Long memberCount;
    private Boolean isMember;
    private String myRole;
    private Long myTodaySeconds;
    private Long myMonthlySeconds;
    private Long myTotalSeconds;
    private OffsetDateTime createdAt;
}
