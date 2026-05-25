package com.farmreports.api.controller;

import com.farmreports.api.dto.ApiResponse;
import com.farmreports.api.dto.CreateUserRequest;
import com.farmreports.api.dto.ResetPasswordRequest;
import com.farmreports.api.dto.UserDto;
import com.farmreports.api.entity.User;
import com.farmreports.api.entity.UserRole;
import com.farmreports.api.repository.UserRepository;
import com.farmreports.api.security.RoleHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public List<UserDto> list(Authentication auth) {
        requireAdmin(auth);
        return userRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    @PostMapping
    public ApiResponse<UserDto> create(@Valid @RequestBody CreateUserRequest req, Authentication auth) {
        requireAdmin(auth);
        if (userRepo.existsByEmail(req.email()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        User user = new User();
        user.setName(req.name());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(UserRole.valueOf(req.role()));
        return ApiResponse.ok(toDto(userRepo.save(user)));
    }

    @Transactional
    @PutMapping("/{id}/deactivate")
    public ApiResponse<Void> deactivate(@PathVariable Integer id, Authentication auth) {
        requireAdmin(auth);
        User user = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setActive(false);
        userRepo.save(user);
        return ApiResponse.ok(null);
    }

    @Transactional
    @PutMapping("/{id}/activate")
    public ApiResponse<Void> activate(@PathVariable Integer id, Authentication auth) {
        requireAdmin(auth);
        User user = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setActive(true);
        userRepo.save(user);
        return ApiResponse.ok(null);
    }

    @Transactional
    @PutMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req, Authentication auth) {
        requireAdmin(auth);
        User user = userRepo.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepo.save(user);
        return ApiResponse.ok(null);
    }

    private UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole().name(), u.isActive());
    }

    private void requireAdmin(Authentication auth) {
        RoleHelper.requireAdmin(auth);
    }
}
