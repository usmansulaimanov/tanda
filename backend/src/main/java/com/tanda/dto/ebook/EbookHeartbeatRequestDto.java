package com.tanda.dto.ebook;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EbookHeartbeatRequestDto {

    private Integer currentPage;
    private Integer totalPages;
    private String currentCfi;
    private Integer interactionCount;
}
