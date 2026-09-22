package com.tanda.repository;

import com.tanda.entity.ManagerPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManagerPermissionRepository extends JpaRepository<ManagerPermission, Long> {
    List<ManagerPermission> findByUserId(String userId);
    List<ManagerPermission> findByUserIdIn(List<String> userIds);
    void deleteByUserId(String userId);
}
