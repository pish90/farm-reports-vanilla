package com.farmreports.api.dto;

import java.math.BigDecimal;

public record CasualWorkEntryDto(
    Integer id,
    Integer casualLabourerId,
    String labourerName,
    BigDecimal rateOverride,
    BigDecimal effectiveRate
) {}
