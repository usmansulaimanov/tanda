package com.tanda.repository;

import com.tanda.entity.AudioChapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AudioChapterRepository extends JpaRepository<AudioChapter, String> {

    List<AudioChapter> findByBookIdOrderByChapterOrderAsc(String bookId);

    void deleteByBookId(String bookId);
}
