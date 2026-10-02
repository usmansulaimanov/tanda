package com.tanda.dto.bonus;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class BonusPurchaseSubscriptionRequestDto {

    @NotBlank(message = "Жоспар атауы көрсетілуі тиіс")
    private String planName; // e.g. "1_month", "3_months", "1_year"

    @Min(value = 1, message = "Жоспар мерзімі кемінде 1 күн болуы тиіс")
    private int planDays;

    @Min(value = 1, message = "Бонус сомасы оң сан болуы тиіс")
    private int amount;
}
