package com.farmreports.api.controller;

import com.farmreports.api.config.AuditService;
import com.farmreports.api.dto.*;
import com.farmreports.api.entity.User;
import com.farmreports.api.repository.UserRepository;
import com.farmreports.api.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(request.email())
                .filter(User::isActive)
                .orElseThrow(() -> {
                    logAnon("LOGIN_FAILED", httpRequest, "Failed login for: " + request.email());
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
                });

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            logAnon("LOGIN_FAILED", httpRequest, "Wrong password for: " + user.getEmail());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("name", user.getName());
        claims.put("role", user.getRole().name());
        claims.put("mustChangePassword", user.isMustChangePassword());
        String token = jwtService.generateToken(user.getEmail(), claims);

        auditService.log("LOGIN", null, httpRequest, "User logged in: " + user.getName());

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(),
                user.getRole().name(), user.isMustChangePassword() ? true : null);
    }

    private void logAnon(String action, HttpServletRequest req, String description) {
        auditService.log(action, null, req, description);
    }

    @GetMapping("/me")
    public AuthResponse me(Authentication auth) {
        Claims claims = (Claims) auth.getPrincipal();
        Boolean mustChange = Boolean.TRUE.equals(claims.get("mustChangePassword", Boolean.class));
        return new AuthResponse(null,
                ((Number) claims.get("userId")).intValue(),
                claims.get("name", String.class),
                claims.getSubject(),
                claims.get("role", String.class),
                mustChange ? true : null);
    }

    @Transactional
    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req,
            Authentication auth, HttpServletRequest httpRequest) {
        Claims claims = (Claims) auth.getPrincipal();
        User user = userRepository.findByEmail(claims.getSubject())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
        auditService.log("PASSWORD_CHANGED", auth, httpRequest, "Password changed for: " + user.getName());
        return ApiResponse.ok(null);
    }
}
