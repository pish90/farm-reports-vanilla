package com.farmreports.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "attendance")
@Getter @Setter
public class Attendance {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "worker_id", nullable = false)
    private Worker worker;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private boolean present = false;

    private String notes;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();
}
