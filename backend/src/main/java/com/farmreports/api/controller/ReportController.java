package com.farmreports.api.controller;

import com.farmreports.api.dto.*;
import com.farmreports.api.entity.*;
import com.farmreports.api.repository.*;
import com.farmreports.api.security.RoleHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportRepository reportRepo;
    private final AttendanceRepository attendanceRepo;
    private final WorkerRepository workerRepo;
    private final ExpenseRepository expenseRepo;
    private final StockRecordRepository stockRecordRepo;
    private final StockCategoryRepository stockCategoryRepo;
    private final StockItemRepository stockItemRepo;

    @GetMapping
    public ReportDto get(@RequestParam int year, @RequestParam int month, Authentication auth) {
        Report report = reportRepo.findByYearAndMonth(year, month).orElse(null);
        return buildReport(year, month, report);
    }

    @Transactional
    @PostMapping("/{year}/{month}/submit")
    public ReportDto submit(@PathVariable int year, @PathVariable int month, Authentication auth) {
        requireAdmin(auth);
        Report report = reportRepo.findByYearAndMonth(year, month).orElseGet(() -> {
            Report r = new Report();
            r.setYear(year);
            r.setMonth(month);
            return r;
        });
        report.setStatus(ReportStatus.SUBMITTED);
        report.setSubmittedAt(Instant.now());
        reportRepo.save(report);
        return buildReport(year, month, report);
    }

    @Transactional
    @PostMapping("/{year}/{month}/reopen")
    public ReportDto reopen(@PathVariable int year, @PathVariable int month, Authentication auth) {
        requireAdmin(auth);
        Report report = reportRepo.findByYearAndMonth(year, month)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        report.setStatus(ReportStatus.DRAFT);
        report.setSubmittedAt(null);
        reportRepo.save(report);
        return buildReport(year, month, report);
    }

    private ReportDto buildReport(int year, int month, Report report) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        int workingDays = to.getDayOfMonth();

        // Attendance
        var attendance = attendanceRepo.findByDateBetween(from, to);
        var workers = workerRepo.findByActiveTrue();
        var workerRows = workers.stream().map(w -> {
            long present = attendance.stream()
                    .filter(a -> a.getWorker().getId().equals(w.getId()) && a.isPresent()).count();
            return new ReportDto.WorkerRow(w.getName(), w.getJobTitle(),
                    (int) present, (int) (workingDays - present));
        }).toList();
        int totalPresent = workerRows.stream().mapToInt(ReportDto.WorkerRow::present).sum();
        int totalAbsent = workerRows.stream().mapToInt(ReportDto.WorkerRow::absent).sum();
        var attendanceSummary = new ReportDto.AttendanceSummary(workingDays, totalPresent, totalAbsent, workerRows);

        // Stock
        var stockRecords = stockRecordRepo.findByYearAndMonth(year, month);
        var stockSections = stockCategoryRepo.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(cat -> {
                    var items = stockItemRepo.findByCategoryIdAndActiveTrueOrderByDisplayOrderAsc(cat.getId())
                            .stream()
                            .map(item -> {
                                var rec = stockRecords.stream()
                                        .filter(r -> r.getItem().getId().equals(item.getId()))
                                        .findFirst();
                                return new ReportDto.StockRow(item.getName(),
                                        rec.map(StockRecord::getQuantity).orElse(BigDecimal.ZERO),
                                        rec.map(StockRecord::getNotes).orElse(null));
                            }).toList();
                    return new ReportDto.StockSection(cat.getName(), cat.getUnit(), items);
                }).filter(s -> !s.items().isEmpty()).toList();

        // Expenses
        var expenses = expenseRepo.findByYearAndMonth(year, month);
        var fmt = DateTimeFormatter.ofPattern("dd MMM");
        var expenseSections = expenses.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCategory() != null ? e.getCategory().getName() : "Uncategorised"))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    var rows = entry.getValue().stream()
                            .map(e -> new ReportDto.ExpenseRow(e.getDescription(), e.getAmount(),
                                    e.getExpenseDate().format(fmt)))
                            .toList();
                    BigDecimal sub = entry.getValue().stream()
                            .map(Expense::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new ReportDto.ExpenseSection(entry.getKey(), sub, rows);
                }).toList();
        BigDecimal totalExpenses = expenseSections.stream()
                .map(ReportDto.ExpenseSection::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ReportDto(
                report != null ? report.getId() : null,
                year, month,
                report != null ? report.getStatus().name() : "DRAFT",
                report != null ? report.getNotes() : null,
                report != null ? report.getCreatedAt() : null,
                report != null ? report.getSubmittedAt() : null,
                attendanceSummary, stockSections, expenseSections, totalExpenses);
    }

    private void requireAdmin(Authentication auth) {
        RoleHelper.requireManager(auth);
    }
}
