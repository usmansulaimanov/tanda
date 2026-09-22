package com.tanda.dto.promo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePromoCodeRequestDto {
    private Boolean isActive;
    private Boolean isIssued;
    private String note;
}
