package com.farmreports.api.repository;

import com.farmreports.api.entity.CasualWorkSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CasualWorkSessionRepository extends JpaRepository<CasualWorkSession, Integer> {

    @Query("SELECT s FROM CasualWorkSession s LEFT JOIN FETCH s.entries e LEFT JOIN FETCH e.labourer ORDER BY s.sessionDate DESC")
    List<CasualWorkSession> findAllWithEntries();

    @Query("SELECT s FROM CasualWorkSession s LEFT JOIN FETCH s.entries e LEFT JOIN FETCH e.labourer WHERE s.id = :id")
    Optional<CasualWorkSession> findByIdWithEntries(Integer id);
}
