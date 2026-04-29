package com.farmreports.api.controller;

import com.farmreports.api.dto.ApiResponse;
import com.farmreports.api.dto.FarmConfigDto;
import com.farmreports.api.entity.FarmConfig;
import com.farmreports.api.repository.FarmConfigRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/config")
@RequiredArgsConstructor
public class ConfigController {

    private final FarmConfigRepository repo;

    @GetMapping
    public FarmConfigDto get() {
        FarmConfig c = repo.findAll().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return new FarmConfigDto(c.getName(), c.getCurrency(), c.getTimezone());
    }

    @Transactional
    @PutMapping
    public ApiResponse<FarmConfigDto> update(@Valid @RequestBody FarmConfigDto dto, Authentication auth) {
        requireAdmin(auth);
        FarmConfig c = repo.findAll().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        c.setName(dto.name());
        c.setCurrency(dto.currency());
        c.setTimezone(dto.timezone());
        repo.save(c);
        return ApiResponse.ok(dto);
    }

    private void requireAdmin(Authentication auth) {
        if (auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
