package com.farmreports.api.controller;

import com.farmreports.api.dto.ApiResponse;
import com.farmreports.api.dto.AuditLogDto;
import com.farmreports.api.entity.AuditLog;
import com.farmreports.api.repository.AuditLogRepository;
import com.farmreports.api.security.RoleHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepo;

    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication auth) {
        RoleHelper.requireAdmin(auth);

        // Pass date strings directly; native SQL handles NULL and casts to TIMESTAMP
        String endStr = endDate != null ? LocalDate.parse(endDate).plusDays(1).toString() : null;

        Page<AuditLog> result = auditLogRepo.findFiltered(action, startDate, endStr, PageRequest.of(page, size));

        return ApiResponse.ok(Map.of(
            "content",       result.getContent().stream().map(this::toDto).toList(),
            "totalElements", result.getTotalElements(),
            "totalPages",    result.getTotalPages(),
            "page",          result.getNumber()
        ));
    }

    private AuditLogDto toDto(AuditLog a) {
        return new AuditLogDto(
            a.getId(), a.getAction(), a.getUserId(), a.getUserName(), a.getUserRole(),
            a.getDescription(), a.getEntityType(), a.getEntityId(),
            a.getIpAddress(), a.getCreatedAt()
        );
    }
}
