package com.tanda.dto.groups;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingGroupDetailResponseDto {

    private ReadingGroupResponseDto group;
    private List<ReadingGroupMemberDto> members;
    private List<ReadingGroupArchiveDto> archives;
}
