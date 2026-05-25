package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseDto(Integer id, Integer categoryId, String categoryName,
                         String description, BigDecimal amount,
                         LocalDate expenseDate, int year, int month,
                         String receiptUrl, String supplierContractor, String receiptNo) {}
