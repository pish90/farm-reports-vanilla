package com.farmreports.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(Integer categoryId, String description,
                             @NotNull @Positive BigDecimal amount,
                             @NotNull LocalDate expenseDate,
                             String receiptUrl) {}
