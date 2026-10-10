package com.tanda.repository;

import com.tanda.entity.AmbientSound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AmbientSoundRepository extends JpaRepository<AmbientSound, Long> {

    List<AmbientSound> findByIsActiveTrueOrderBySortOrderAscIdAsc();

    List<AmbientSound> findAllByOrderBySortOrderAscIdAsc();

    @Modifying
    @Query("UPDATE AmbientSound a SET a.sortOrder = :sortOrder WHERE a.id = :id")
    void updateSortOrder(@Param("id") Long id, @Param("sortOrder") Integer sortOrder);
}
