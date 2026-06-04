package com.farmreports.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity @Table(name = "audit_logs")
@Getter @Setter
public class AuditLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String action;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "user_role")
    private String userRole;

    private String description;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "entity_id")
    private Integer entityId;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
