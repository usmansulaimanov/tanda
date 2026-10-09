package com.tanda.dto.groups;

import jakarta.validation.constraints.Size;
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
public class ReadingGroupUpdateRequestDto {

    @Size(min = 2, max = 100, message = "Топ атауы 2 мен 100 таңба аралығында болуы керек")
    private String name;

    @Size(max = 1000, message = "Сипаттама 1000 таңбадан аспауы керек")
    private String description;

    private String coverImageUrl;

    private Boolean isPublic;
}
