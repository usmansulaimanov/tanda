package com.tanda.dto.royalty;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutRequestCreateDto {

    @NotNull(message = "Сома көрсетілуі тиіс")
    @DecimalMin(value = "1.0", message = "Шығару сомасы кем дегенде 1 болуы қажет")
    private BigDecimal amount;

    private String method;

    private String cardOrAccount;
}
