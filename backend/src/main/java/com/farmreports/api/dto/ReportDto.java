package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ReportDto(
        Integer id, int year, int month, String status, String notes,
        Instant createdAt, Instant submittedAt,
        AttendanceSummary attendance,
        List<StockSection> stock,
        List<ExpenseSection> expenses,
        BigDecimal totalExpenses) {

    public record AttendanceSummary(int workingDays, int totalPresent, int totalAbsent,
                                    List<WorkerRow> workers) {}
    public record WorkerRow(String name, String jobTitle, int present, int absent) {}
    public record StockSection(String category, String unit,
                               List<StockRow> items) {}
    public record StockRow(String item, BigDecimal quantity, String notes) {}
    public record ExpenseSection(String category, BigDecimal subtotal,
                                 List<ExpenseRow> entries) {}
    public record ExpenseRow(String description, BigDecimal amount, String date) {}
}
