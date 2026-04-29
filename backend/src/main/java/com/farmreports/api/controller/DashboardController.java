package com.farmreports.api.controller;

import com.farmreports.api.dto.DashboardDto;
import com.farmreports.api.entity.Expense;
import com.farmreports.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final WorkerRepository workerRepo;
    private final AttendanceRepository attendanceRepo;
    private final ExpenseRepository expenseRepo;
    private final StockRecordRepository stockRecordRepo;
    private final StockCategoryRepository stockCategoryRepo;
    private final StockItemRepository stockItemRepo;

    @GetMapping
    public DashboardDto get() {
        LocalDate today = LocalDate.now();
        int year = today.getYear();
        int month = today.getMonthValue();

        long totalWorkers = workerRepo.findByActiveTrue().size();
        long presentToday = attendanceRepo.countPresentOnDate(today);
        BigDecimal totalExpenses = expenseRepo.sumByYearAndMonth(year, month);

        var expenses = expenseRepo.findByYearAndMonth(year, month);
        var expensesByCategory = expenses.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCategory() != null ? e.getCategory().getName() : "Uncategorised",
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)))
                .entrySet().stream()
                .map(e -> new DashboardDto.ExpenseSummary(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(DashboardDto.ExpenseSummary::total).reversed())
                .toList();

        var stockRecords = stockRecordRepo.findByYearAndMonth(year, month);
        var stockSummary = stockRecords.stream()
                .map(r -> new DashboardDto.StockSummary(
                        r.getItem().getCategory().getName(),
                        r.getItem().getName(),
                        r.getItem().getCategory().getUnit(),
                        r.getQuantity()))
                .toList();

        return new DashboardDto(year, month, totalWorkers, presentToday,
                totalExpenses, expensesByCategory, stockSummary);
    }
}
