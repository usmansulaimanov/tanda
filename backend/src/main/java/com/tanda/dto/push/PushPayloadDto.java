package com.tanda.dto.push;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushPayloadDto {

    private String title;
    private String body;
    private String icon;
    private String badge;
    private String tag;
    private Map<String, Object> data;
}
