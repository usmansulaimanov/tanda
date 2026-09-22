package com.tanda.repository;

import com.tanda.entity.Author;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuthorRepository extends JpaRepository<Author, String> {
    Optional<Author> findByUserId(String userId);
    boolean existsByDisplayNameIgnoreCase(String displayName);
}
