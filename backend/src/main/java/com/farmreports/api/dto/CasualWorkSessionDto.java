package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CasualWorkSessionDto(
    Integer id,
    LocalDate sessionDate,
    String activity,
    BigDecimal defaultDailyRate,
    List<CasualWorkEntryDto> entries
) {}
