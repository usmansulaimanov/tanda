package com.tanda.dto.premium;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrantPremiumRequestDto {
    @NotNull
    @Min(1)
    private Integer days;
    private String source; // e.g. "MANUAL_ADMIN", "PROMO_CODE", "BIRTHDAY_GIFT"
    private String note;
}
