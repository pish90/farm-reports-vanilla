package com.farmreports.api.repository;

import com.farmreports.api.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Integer> {

    @Query("SELECT e FROM Expense e LEFT JOIN FETCH e.category WHERE e.year = :year AND e.month = :month ORDER BY e.expenseDate")
    List<Expense> findByYearAndMonth(int year, int month);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.year = :year AND e.month = :month")
    BigDecimal sumByYearAndMonth(int year, int month);
}
