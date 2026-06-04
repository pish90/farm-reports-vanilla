package com.farmreports.api.repository;

import com.farmreports.api.entity.CasualWorkEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CasualWorkEntryRepository extends JpaRepository<CasualWorkEntry, Integer> {

    @Query("SELECT e FROM CasualWorkEntry e LEFT JOIN FETCH e.session s LEFT JOIN FETCH e.labourer WHERE e.labourer.id = :labourerId ORDER BY s.sessionDate DESC")
    List<CasualWorkEntry> findByLabourerIdOrderBySessionDateDesc(Integer labourerId);
}
