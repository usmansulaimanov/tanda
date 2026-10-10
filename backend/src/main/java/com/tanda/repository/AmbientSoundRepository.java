package com.tanda.repository;

import com.tanda.entity.AmbientSound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AmbientSoundRepository extends JpaRepository<AmbientSound, Long> {

    List<AmbientSound> findByIsActiveTrueOrderBySortOrderAscIdAsc();

    List<AmbientSound> findAllByOrderBySortOrderAscIdAsc();
}
