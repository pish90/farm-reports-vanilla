package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RecordPaymentRequest(LocalDate paymentDate, BigDecimal amount, String note) {}
