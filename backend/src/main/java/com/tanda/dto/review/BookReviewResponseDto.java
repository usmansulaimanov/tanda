package com.tanda.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookReviewResponseDto {

    private Long id;
    private String bookId;
    private String userId;
    private String userName;
    private String userAvatar;
    private String userRole;
    private Integer rating;
    private String reviewText;
    private Boolean isSpoiler;
    private Integer likesCount;
    private Integer dislikesCount;
    private String userReaction; // "LIKE" | "DISLIKE" | null
    private Boolean isLikedByCurrentUser;
    private Boolean isVerifiedReader;
    private Boolean canEdit;
    private Boolean canDelete;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
