package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateWorkSessionRequest(
    LocalDate sessionDate,
    String activity,
    BigDecimal defaultDailyRate,
    List<EntryRequest> entries
) {
    public record EntryRequest(Integer casualLabourerId, BigDecimal rateOverride) {}
}
