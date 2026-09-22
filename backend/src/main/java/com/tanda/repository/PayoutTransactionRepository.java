package com.tanda.repository;

import com.tanda.entity.PayoutTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayoutTransactionRepository extends JpaRepository<PayoutTransaction, String> {

    List<PayoutTransaction> findByPayoutRequestId(String payoutRequestId);
}
