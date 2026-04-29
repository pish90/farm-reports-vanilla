package com.farmreports.api.dto;

import jakarta.validation.constraints.NotBlank;

public record StockItemDto(Integer id, Integer categoryId, @NotBlank String name, int displayOrder, boolean active) {}
