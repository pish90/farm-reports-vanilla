package com.farmreports.api.repository;

import com.farmreports.api.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:action IS NULL OR a.action = :action)
          AND (:start  IS NULL OR a.createdAt >= :start)
          AND (:end    IS NULL OR a.createdAt <= :end)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> findFiltered(
        @Param("action") String action,
        @Param("start")  Instant start,
        @Param("end")    Instant end,
        Pageable pageable
    );
}
