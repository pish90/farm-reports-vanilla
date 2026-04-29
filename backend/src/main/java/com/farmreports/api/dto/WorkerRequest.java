package com.farmreports.api.dto;

import jakarta.validation.constraints.NotBlank;

public record WorkerRequest(@NotBlank String name, String jobTitle) {}
