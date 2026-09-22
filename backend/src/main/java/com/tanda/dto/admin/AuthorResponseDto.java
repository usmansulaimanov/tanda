package com.tanda.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorResponseDto {

    private String id;
    private String userId;
    private String name;
    private String displayName;
    private String email;
    private String phone;
    private String idNumber;
    private String avatarUrl;
    private String bio;
    private String assignedAuthorName;
    private List<String> assignedBookIds;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private Integer booksCount;
    private Long totalReads;
    private Long totalViews;
    private Long totalAudios;
}
