package com.tanda.repository;

import com.tanda.entity.PayoutRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, String> {

    List<PayoutRequest> findByAuthorIdOrderByRequestedAtDesc(String authorId);

    List<PayoutRequest> findAllByOrderByRequestedAtDesc();

    List<PayoutRequest> findByStatusOrderByRequestedAtDesc(String status);
}
