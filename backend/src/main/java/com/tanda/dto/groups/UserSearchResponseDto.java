package com.tanda.dto.groups;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSearchResponseDto {

    private String id;
    private String name;
    private String username;
    private String email;
    private String avatarUrl;
    private Boolean allowGroupInvites;
}
