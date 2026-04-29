package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardDto(
        int year, int month,
        long totalWorkers, long presentToday,
        BigDecimal totalExpensesThisMonth,
        List<ExpenseSummary> expensesByCategory,
        List<StockSummary> stockSummary) {

    public record ExpenseSummary(String category, BigDecimal total) {}
    public record StockSummary(String category, String item, String unit, BigDecimal quantity) {}
}
