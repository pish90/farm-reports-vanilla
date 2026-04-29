package com.farmreports.api.repository;

import com.farmreports.api.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Integer> {
    Optional<Report> findByYearAndMonth(int year, int month);
}
