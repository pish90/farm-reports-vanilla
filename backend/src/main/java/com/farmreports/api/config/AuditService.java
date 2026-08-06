package com.farmreports.api.config;

import com.farmreports.api.entity.AuditLog;
import com.farmreports.api.repository.AuditLogRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepo;

    public void log(String action, Authentication auth, HttpServletRequest request,
                    String description, String entityType, Integer entityId) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setDescription(description);
        log.setEntityType(entityType);
        log.setEntityId(entityId);

        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof Claims claims) {
            log.setUserId(((Number) claims.get("userId")).intValue());
            log.setUserName(claims.get("name", String.class));
            log.setUserRole(claims.get("role", String.class));
        }

        if (request != null) {
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
            log.setIpAddress(ip);
        }

        auditLogRepo.save(log);
    }

    public void log(String action, Authentication auth, HttpServletRequest request, String description) {
        log(action, auth, request, description, null, null);
    }
}
