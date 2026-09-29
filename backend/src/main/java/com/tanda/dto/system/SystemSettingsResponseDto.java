package com.tanda.dto.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSettingsResponseDto {
    private boolean premiumEnabled;
    private boolean openAccessMode;
    private boolean audioAdEnabled;
    private String audioAdUrl;
    private String audioAdTitle;
    private String bankName;
    private String kaspiPhone;
    private String kaspiCard;
    private String kaspiRecipientName;
    private int price1Month;
    private int price3Months;
    private int price1Year;
    private Integer oldPrice1Month;
    private Integer oldPrice3Months;
    private Integer oldPrice1Year;
    private boolean plan1MonthEnabled;
    private boolean plan3MonthsEnabled;
    private boolean plan1YearEnabled;
    private String plan1MonthDesc;
    private String plan3MonthsDesc;
    private String plan1YearDesc;
    private String plan1MonthBadge;
    private String plan3MonthsBadge;
    private String plan1YearBadge;
    private boolean kaspiPhoneEnabled;
    private boolean kaspiCardEnabled;
    private boolean heroMessageEnabled;
    private String heroMessageText;
    private String heroMessageTarget;
    private OffsetDateTime heroMessageExpiresAt;
    private String paymentNotice;
    private boolean paymentNoticeEnabled;
    private boolean headerBannerEnabled;
    private String headerBannerText;
    private String headerBannerButtonText;
    private String headerBannerPresets;
    private boolean aiReceiptVerificationEnabled;
    private OffsetDateTime updatedAt;
}
