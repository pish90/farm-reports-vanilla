package com.farmreports.api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record AttendanceBulkRequest(@NotNull LocalDate date, @NotNull List<WorkerAttendance> records) {
    public record WorkerAttendance(Integer workerId, boolean present, String notes) {}
}
