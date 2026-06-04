package com.farmreports.api.repository;

import com.farmreports.api.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {

    @Query(value = """
        SELECT * FROM audit_logs
        WHERE  (CAST(:action AS TEXT) IS NULL OR action     = CAST(:action AS TEXT))
          AND  (CAST(:start  AS TIMESTAMP) IS NULL OR created_at >= CAST(:start AS TIMESTAMP))
          AND  (CAST(:end    AS TIMESTAMP) IS NULL OR created_at <= CAST(:end   AS TIMESTAMP))
        ORDER BY created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM audit_logs
        WHERE  (CAST(:action AS TEXT) IS NULL OR action     = CAST(:action AS TEXT))
          AND  (CAST(:start  AS TIMESTAMP) IS NULL OR created_at >= CAST(:start AS TIMESTAMP))
          AND  (CAST(:end    AS TIMESTAMP) IS NULL OR created_at <= CAST(:end   AS TIMESTAMP))
        """,
        nativeQuery = true)
    Page<AuditLog> findFiltered(
        @Param("action") String action,
        @Param("start")  String start,
        @Param("end")    String end,
        Pageable pageable
    );
}
