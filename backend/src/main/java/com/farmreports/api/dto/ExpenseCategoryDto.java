package com.farmreports.api.dto;

import jakarta.validation.constraints.NotBlank;

public record ExpenseCategoryDto(Integer id, @NotBlank String name, boolean active) {}
