package com.farmreports.api.controller;

import com.farmreports.api.dto.ApiResponse;
import com.farmreports.api.dto.WorkerDto;
import com.farmreports.api.dto.WorkerRequest;
import com.farmreports.api.entity.Worker;
import com.farmreports.api.repository.WorkerRepository;
import com.farmreports.api.security.RoleHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerRepository repo;

    @GetMapping
    public List<WorkerDto> list() {
        return repo.findByActiveTrue().stream().map(this::toDto).toList();
    }

    @GetMapping("/all")
    public List<WorkerDto> listAll() {
        return repo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    @PostMapping
    public ApiResponse<WorkerDto> create(@Valid @RequestBody WorkerRequest req, Authentication auth) {
        requireManagerOrAdmin(auth);
        Worker w = new Worker();
        w.setName(req.name());
        w.setJobTitle(req.jobTitle());
        return ApiResponse.ok(toDto(repo.save(w)));
    }

    @Transactional
    @PutMapping("/{id}")
    public ApiResponse<WorkerDto> update(@PathVariable Integer id,
                                         @Valid @RequestBody WorkerRequest req,
                                         Authentication auth) {
        requireManagerOrAdmin(auth);
        Worker w = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        w.setName(req.name());
        w.setJobTitle(req.jobTitle());
        return ApiResponse.ok(toDto(repo.save(w)));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deactivate(@PathVariable Integer id, Authentication auth) {
        requireManagerOrAdmin(auth);
        Worker w = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        w.setActive(false);
        repo.save(w);
        return ApiResponse.ok(null);
    }

    private WorkerDto toDto(Worker w) {
        return new WorkerDto(w.getId(), w.getName(), w.getJobTitle(), w.isActive());
    }

    private void requireManagerOrAdmin(Authentication auth) {
        RoleHelper.requireManager(auth);
    }
}
