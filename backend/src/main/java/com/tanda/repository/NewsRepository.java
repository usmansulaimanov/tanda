package com.tanda.repository;

import com.tanda.entity.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface NewsRepository extends JpaRepository<News, String> {

    List<News> findByIsPublishedTrueAndPublishedAtLessThanEqualOrderByPublishedAtDesc(OffsetDateTime now);

    List<News> findAllByOrderByPublishedAtDesc();
}
