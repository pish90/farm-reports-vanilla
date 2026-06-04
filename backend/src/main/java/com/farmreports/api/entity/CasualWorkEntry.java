package com.farmreports.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "casual_work_entries")
@Getter @Setter
public class CasualWorkEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private CasualWorkSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "casual_labourer_id", nullable = false)
    private CasualLabourer labourer;

    @Column(name = "rate_override")
    private BigDecimal rateOverride;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
