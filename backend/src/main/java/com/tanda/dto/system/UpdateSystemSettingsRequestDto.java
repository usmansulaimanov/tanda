package com.tanda.dto.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSystemSettingsRequestDto {
    private Boolean premiumEnabled;
    private Boolean openAccessMode;
    private Boolean audioAdEnabled;
    private String audioAdUrl;
    private String audioAdTitle;
    private String kaspiPhone;
    private String kaspiCard;
    private String kaspiRecipientName;
    private Integer price1Month;
    private Integer price3Months;
    private Integer price1Year;
    private Boolean plan1MonthEnabled;
    private Boolean plan3MonthsEnabled;
    private Boolean plan1YearEnabled;
}
