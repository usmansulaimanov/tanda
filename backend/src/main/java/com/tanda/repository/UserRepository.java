package com.tanda.repository;

import com.tanda.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    long countByRole(String role);

    List<User> findByRole(String role);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByIdNumber(String idNumber);

    Optional<User> findByIdNumber(String idNumber);

    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR " +
           " (LOWER(:role) IN ('client', 'reader', 'user') AND (u.role IS NULL OR LOWER(u.role) IN ('client', 'reader', 'user') OR (LOWER(u.role) NOT IN ('admin', 'author', 'manager')))) OR " +
           " (LOWER(:role) NOT IN ('client', 'reader', 'user') AND LOWER(u.role) = LOWER(:role))) AND " +
           "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.idNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY u.createdAt DESC")
    List<User> searchUsers(@Param("role") String role, @Param("search") String search);
}

