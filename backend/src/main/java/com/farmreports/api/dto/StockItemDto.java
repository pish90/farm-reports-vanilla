package com.farmreports.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record StockItemDto(Integer id, Integer categoryId, @NotBlank String name, int displayOrder, boolean active,
                           BigDecimal quantity, String notes) {}
