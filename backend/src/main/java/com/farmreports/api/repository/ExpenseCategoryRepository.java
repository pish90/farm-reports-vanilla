package com.farmreports.api.repository;

import com.farmreports.api.entity.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Integer> {
    List<ExpenseCategory> findByActiveTrueOrderByNameAsc();
}
