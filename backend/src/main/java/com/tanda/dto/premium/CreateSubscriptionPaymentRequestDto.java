package com.tanda.dto.premium;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubscriptionPaymentRequestDto {

    @NotBlank(message = "Тариф жоспары міндетті")
    private String planName; // '1_MONTH', '3_MONTHS', '1_YEAR'

    @NotNull(message = "Күндер саны міндетті")
    private Integer planDays;

    @NotNull(message = "Төлем сомасы міндетті")
    private Integer amountKzt;

    @NotBlank(message = "Чек файлы немесе сілтемесі міндетті")
    private String receiptUrl;

    private String phoneOrAccount;
    private String notes;
}
