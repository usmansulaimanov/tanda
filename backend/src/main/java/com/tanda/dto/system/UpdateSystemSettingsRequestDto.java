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
    private String bankName;
    private String kaspiPhone;
    private String kaspiCard;
    private String kaspiRecipientName;
    private Integer price1Month;
    private Integer price3Months;
    private Integer price1Year;
    private Integer oldPrice1Month;
    private Integer oldPrice3Months;
    private Integer oldPrice1Year;
    private Boolean plan1MonthEnabled;
    private Boolean plan3MonthsEnabled;
    private Boolean plan1YearEnabled;
    private String plan1MonthDesc;
    private String plan3MonthsDesc;
    private String plan1YearDesc;
    private String plan1MonthBadge;
    private String plan3MonthsBadge;
    private String plan1YearBadge;
    private Boolean kaspiPhoneEnabled;
    private Boolean kaspiCardEnabled;
    private Boolean heroMessageEnabled;
    private String heroMessageText;
    private String heroMessageTarget;
    private java.time.OffsetDateTime heroMessageExpiresAt;
    private String paymentNotice;
    private Boolean headerBannerEnabled;
    private String headerBannerText;
    private String headerBannerButtonText;
    private String headerBannerPresets;
    private Boolean aiReceiptVerificationEnabled;
}
