package com.tanda.repository;

import com.tanda.entity.ManagerPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManagerPermissionRepository extends JpaRepository<ManagerPermission, Long> {
    List<ManagerPermission> findByUserId(String userId);
    List<ManagerPermission> findByUserIdIn(List<String> userIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ManagerPermission mp WHERE mp.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);
}
