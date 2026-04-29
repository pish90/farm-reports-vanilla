package com.farmreports.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record StockCategoryDto(Integer id, @NotBlank String name, String unit, int displayOrder, boolean active,
                                List<StockItemDto> items) {}
