package com.tanda.repository;

import com.tanda.entity.SubscriptionPaymentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubscriptionPaymentRequestRepository extends JpaRepository<SubscriptionPaymentRequest, String> {
    List<SubscriptionPaymentRequest> findByUserIdOrderByCreatedAtDesc(String userId);
    List<SubscriptionPaymentRequest> findAllByOrderByCreatedAtDesc();
    List<SubscriptionPaymentRequest> findByStatusOrderByCreatedAtDesc(String status);
    long countByStatus(String status);
    long countByAiStatus(String aiStatus);
    boolean existsByReceiptNumberAndStatus(String receiptNumber, String status);
    boolean existsByReceiptHashAndStatus(String receiptHash, String status);
    java.util.Optional<SubscriptionPaymentRequest> findFirstByReceiptNumber(String receiptNumber);
}

