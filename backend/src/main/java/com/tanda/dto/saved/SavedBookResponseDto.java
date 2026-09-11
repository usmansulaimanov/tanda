package com.tanda.dto.saved;

import com.tanda.dto.BookResponseDto;
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
public class SavedBookResponseDto {

    private List<String> bookIds;
    private List<BookResponseDto> books;
}
