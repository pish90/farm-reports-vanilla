package com.farmreports.api.dto;

public record UserDto(Integer id, String name, String email, String role, boolean active) {}
