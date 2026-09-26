package com.tanda.repository;

import com.tanda.entity.DeletedUserArchive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeletedUserArchiveRepository extends JpaRepository<DeletedUserArchive, String> {

    List<DeletedUserArchive> findAllByOrderByDeletedAtDesc();

    List<DeletedUserArchive> findByUserIdOrderByDeletedAtDesc(String userId);

    List<DeletedUserArchive> findByOriginalEmailIgnoreCase(String originalEmail);
}
