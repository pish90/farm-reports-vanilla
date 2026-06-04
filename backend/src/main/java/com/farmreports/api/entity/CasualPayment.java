package com.farmreports.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "casual_payments")
@Getter @Setter
public class CasualPayment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "casual_labourer_id", nullable = false)
    private CasualLabourer labourer;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false)
    private BigDecimal amount;

    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
