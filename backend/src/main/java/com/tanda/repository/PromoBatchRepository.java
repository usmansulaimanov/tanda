package com.tanda.repository;

import com.tanda.entity.PromoBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromoBatchRepository extends JpaRepository<PromoBatch, String> {
    List<PromoBatch> findAllByOrderByCreatedAtDesc();
}
