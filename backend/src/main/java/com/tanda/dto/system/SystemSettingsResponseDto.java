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
    private String kaspiPhone;
    private String kaspiCard;
    private String kaspiRecipientName;
    private int price1Month;
    private int price3Months;
    private int price1Year;
    private OffsetDateTime updatedAt;
}
