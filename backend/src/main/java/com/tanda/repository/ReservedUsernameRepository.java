package com.tanda.repository;

import com.tanda.entity.ReservedUsername;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface ReservedUsernameRepository extends JpaRepository<ReservedUsername, String> {
    boolean existsByUsernameIgnoreCase(String username);
    Optional<ReservedUsername> findByUsernameIgnoreCase(String username);
    void deleteByUsernameIgnoreCase(String username);

    @Modifying
    @Query("DELETE FROM ReservedUsername r WHERE LOWER(r.username) IN :usernames")
    void deleteAllByUsernamesIgnoreCase(@Param("usernames") Collection<String> usernames);
}
