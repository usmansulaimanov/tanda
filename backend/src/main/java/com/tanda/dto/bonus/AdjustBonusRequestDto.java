package com.tanda.dto.bonus;

import jakarta.validation.constraints.NotNull;
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
public class AdjustBonusRequestDto {

    @NotNull(message = "Бонус сомасы көрсетілуі тиіс")
    private Integer amount; // can be positive or negative

    private String reason;
}
