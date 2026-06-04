package com.farmreports.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "casual_work_sessions")
@Getter @Setter
public class CasualWorkSession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private String activity;

    @Column(name = "default_daily_rate", nullable = false)
    private BigDecimal defaultDailyRate = BigDecimal.ZERO;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CasualWorkEntry> entries = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
