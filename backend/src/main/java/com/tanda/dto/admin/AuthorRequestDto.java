package com.tanda.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class AuthorRequestDto {

    @NotBlank(message = "Автордың аты-жөнін жазыңыз")
    private String name;

    @NotBlank(message = "Электронды поштасын жазыңыз")
    @Email(message = "Жарамды электронды пошта енгізіңіз")
    private String email;

    private String password;
    private String phone;
    private String idNumber;
    private String avatarUrl;
    private String bio;
    private String assignedAuthorName;
    private List<String> assignedBookIds;
    private Boolean isActive;
}
