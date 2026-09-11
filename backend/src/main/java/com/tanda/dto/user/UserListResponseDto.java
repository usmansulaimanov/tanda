package com.tanda.dto.user;

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
public class UserListResponseDto {

    private String id;
    private String idNumber;
    private String name;
    private String email;
    private String role;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private Integer savedBooksCount;
}
