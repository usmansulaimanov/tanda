package com.tanda.dto.groups;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingGroupCreateRequestDto {

    @NotBlank(message = "Топ атауы міндетті")
    @Size(min = 2, max = 100, message = "Топ атауы 2 мен 100 таңба аралығында болуы керек")
    private String name;

    @Size(max = 1000, message = "Сипаттама 1000 таңбадан аспауы керек")
    private String description;

    private String coverImageUrl;

    @Builder.Default
    private Boolean isPublic = false;

    private List<String> inviteeEmails;
}
