package com.tanda.repository;

import com.tanda.entity.Certificate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, String> {

    Optional<Certificate> findByCertificateNumber(String certificateNumber);

    boolean existsByCertificateNumber(String certificateNumber);

    List<Certificate> findByRecipientUserIdOrderByIssuedAtDesc(String recipientUserId);

    List<Certificate> findAllByOrderByIssuedAtDescCreatedAtDesc();

    @Query("SELECT c FROM Certificate c WHERE " +
           "LOWER(c.recipientName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.certificateNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY c.issuedAt DESC, c.createdAt DESC")
    List<Certificate> searchCertificates(@Param("query") String query);

    @Query(value = "SELECT certificate_number FROM certificates ORDER BY created_at DESC LIMIT 1", nativeQuery = true)
    Optional<String> findLastCertificateNumber();
}
