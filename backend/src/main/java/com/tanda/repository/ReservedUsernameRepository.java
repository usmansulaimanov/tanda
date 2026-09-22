package com.tanda.repository;

import com.tanda.entity.ReservedUsername;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReservedUsernameRepository extends JpaRepository<ReservedUsername, String> {
    boolean existsByUsernameIgnoreCase(String username);
    Optional<ReservedUsername> findByUsernameIgnoreCase(String username);
    void deleteByUsernameIgnoreCase(String username);
}
