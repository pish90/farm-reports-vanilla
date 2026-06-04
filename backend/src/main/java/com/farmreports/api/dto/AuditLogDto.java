package com.farmreports.api.dto;

import java.time.LocalDateTime;

public record AuditLogDto(
    Integer id,
    String action,
    Integer userId,
    String userName,
    String userRole,
    String description,
    String entityType,
    Integer entityId,
    String ipAddress,
    LocalDateTime timestamp
) {}
