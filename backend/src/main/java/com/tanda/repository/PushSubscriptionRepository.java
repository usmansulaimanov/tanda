package com.tanda.repository;

import com.tanda.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, String> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUserId(String userId);

    List<PushSubscription> findByUserIdIn(List<String> userIds);

    void deleteByEndpoint(String endpoint);
}
