package com.tanda.repository;

import com.tanda.entity.Quote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, String> {

    List<Quote> findByIsActiveTrueOrderByCreatedAtDesc();

    List<Quote> findAllByOrderByCreatedAtDesc();

    @Query(value = "SELECT * FROM quotes WHERE is_active = true ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Quote findRandomActiveQuote();
}
