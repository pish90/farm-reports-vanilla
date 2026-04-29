package com.farmreports.api.dto;

import jakarta.validation.constraints.NotBlank;

public record FarmConfigDto(@NotBlank String name, @NotBlank String currency, @NotBlank String timezone) {}
