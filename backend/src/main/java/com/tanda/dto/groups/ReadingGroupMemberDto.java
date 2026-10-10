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
public class ReadingGroupMemberDto {

    private String id;
    private String userId;
    private String name;
    private String username;
    private String email;
    private String avatarUrl;
    private String role;
    private Long todayReadingSeconds;
    private Long monthlyReadingSeconds;
    private Long totalReadingSeconds;
    private Integer rank;
    private OffsetDateTime joinedAt;
}
