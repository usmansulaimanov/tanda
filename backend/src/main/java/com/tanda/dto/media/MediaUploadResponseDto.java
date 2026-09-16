package com.tanda.dto.media;

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
public class MediaUploadResponseDto {
    private String key;
    private String url;
    private String fileName;
    private String contentType;
    private long size;
}
