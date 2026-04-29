package com.farmreports.api.dto;

import java.time.LocalDate;

public record AttendanceDto(Integer id, Integer workerId, String workerName, LocalDate date, boolean present, String notes) {}
