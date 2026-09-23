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

    List<User> findAllByOrderByCreatedAtDesc();

    @Query("SELECT u FROM User u WHERE " +
           "(u.role = 'client' OR u.role IS NULL OR LOWER(u.role) IN ('client', 'reader', 'user') OR (LOWER(u.role) NOT IN ('admin', 'author', 'manager'))) " +
           "ORDER BY u.createdAt DESC")
    List<User> findAllClients();

    @Query("SELECT u FROM User u WHERE " +
           "(u.role = 'client' OR u.role IS NULL OR LOWER(u.role) IN ('client', 'reader', 'user') OR (LOWER(u.role) NOT IN ('admin', 'author', 'manager'))) AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.idNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY u.createdAt DESC")
    List<User> searchClients(@Param("search") String search);

    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.role) = LOWER(:role) " +
           "ORDER BY u.createdAt DESC")
    List<User> findByRoleIgnoreCase(@Param("role") String role);

    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.role) = LOWER(:role) AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.idNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY u.createdAt DESC")
    List<User> searchByRole(@Param("role") String role, @Param("search") String search);

    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.idNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "ORDER BY u.createdAt DESC")
    List<User> searchAllUsers(@Param("search") String search);
}

