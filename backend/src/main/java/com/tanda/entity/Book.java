package com.tanda.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "books")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Book {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "author", length = 255, nullable = false)
    private String author;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", length = 64, nullable = false)
    private String category;

    @Column(name = "pages")
    private Integer pages;

    @Column(name = "has_audio", nullable = false)
    @Builder.Default
    private Boolean hasAudio = false;

    @Column(name = "audio_narrator", length = 255)
    private String audioNarrator;

    @Column(name = "audio_duration", length = 64)
    private String audioDuration;

    @Column(name = "audio_url", columnDefinition = "TEXT")
    private String audioUrl;

    @Column(name = "cover_image", columnDefinition = "TEXT")
    private String coverImage;

    @Column(name = "is_free", nullable = false)
    @Builder.Default
    private Boolean isFree = true;

    @Column(name = "is_archived", nullable = false)
    @Builder.Default
    private Boolean isArchived = false;

    @Column(name = "gradient", length = 255)
    private String gradient;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("chapterOrder ASC")
    @Builder.Default
    private List<AudioChapter> audioChapters = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (hasAudio == null) {
            hasAudio = false;
        }
        if (isFree == null) {
            isFree = true;
        }
        if (isArchived == null) {
            isArchived = false;
        }
    }

    public void addAudioChapter(AudioChapter chapter) {
        audioChapters.add(chapter);
        chapter.setBook(this);
    }

    public void removeAudioChapter(AudioChapter chapter) {
        audioChapters.remove(chapter);
        chapter.setBook(null);
    }
}
