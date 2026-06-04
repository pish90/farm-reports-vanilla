package com.farmreports.api.repository;

import com.farmreports.api.entity.CasualLabourer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CasualLabourerRepository extends JpaRepository<CasualLabourer, Integer> {
    List<CasualLabourer> findByActiveTrueOrderByNameAsc();
}
