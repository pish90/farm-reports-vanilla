package com.farmreports.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(@NotBlank String name, @Email @NotBlank String email,
                                @NotBlank String password, @NotNull String role) {}
