package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CasualLabourerReportDto(
    Integer labourerId,
    String name,
    String phone,
    BigDecimal allTimeEarned,
    BigDecimal allTimePaid,
    BigDecimal balance,
    List<WorkEntry> workEntries
) {
    public record WorkEntry(
        Integer sessionId,
        LocalDate sessionDate,
        String activity,
        BigDecimal amount
    ) {}
}
