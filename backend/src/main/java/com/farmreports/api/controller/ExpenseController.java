package com.farmreports.api.controller;

import com.farmreports.api.dto.*;
import com.farmreports.api.entity.*;
import com.farmreports.api.repository.*;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseRepository expenseRepo;
    private final ExpenseCategoryRepository categoryRepo;
    private final UserRepository userRepo;

    @GetMapping("/categories")
    public List<ExpenseCategoryDto> categories() {
        return categoryRepo.findByActiveTrueOrderByNameAsc().stream()
                .map(c -> new ExpenseCategoryDto(c.getId(), c.getName(), c.isActive()))
                .toList();
    }

    @Transactional
    @PostMapping("/categories")
    public ApiResponse<ExpenseCategoryDto> createCategory(@Valid @RequestBody ExpenseCategoryDto dto,
                                                          Authentication auth) {
        requireAdmin(auth);
        ExpenseCategory cat = new ExpenseCategory();
        cat.setName(dto.name());
        cat = categoryRepo.save(cat);
        return ApiResponse.ok(new ExpenseCategoryDto(cat.getId(), cat.getName(), cat.isActive()));
    }

    @Transactional
    @PutMapping("/categories/{id}")
    public ApiResponse<Void> updateCategory(@PathVariable Integer id,
                                            @Valid @RequestBody ExpenseCategoryDto dto,
                                            Authentication auth) {
        requireAdmin(auth);
        ExpenseCategory cat = categoryRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        cat.setName(dto.name());
        cat.setActive(dto.active());
        categoryRepo.save(cat);
        return ApiResponse.ok(null);
    }

    @GetMapping
    public List<ExpenseDto> list(@RequestParam int year, @RequestParam int month) {
        return expenseRepo.findByYearAndMonth(year, month).stream().map(this::toDto).toList();
    }

    @Transactional
    @PostMapping
    public ApiResponse<ExpenseDto> create(@Valid @RequestBody ExpenseRequest req, Authentication auth) {
        Expense e = buildExpense(new Expense(), req, auth);
        return ApiResponse.ok(toDto(expenseRepo.save(e)));
    }

    @Transactional
    @PutMapping("/{id}")
    public ApiResponse<ExpenseDto> update(@PathVariable Integer id,
                                          @Valid @RequestBody ExpenseRequest req,
                                          Authentication auth) {
        Expense e = expenseRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ApiResponse.ok(toDto(expenseRepo.save(buildExpense(e, req, auth))));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Integer id) {
        expenseRepo.deleteById(id);
        return ApiResponse.ok(null);
    }

    private Expense buildExpense(Expense e, ExpenseRequest req, Authentication auth) {
        if (req.categoryId() != null)
            e.setCategory(categoryRepo.findById(req.categoryId()).orElse(null));
        e.setDescription(req.description());
        e.setAmount(req.amount());
        e.setExpenseDate(req.expenseDate());
        e.setYear(req.expenseDate().getYear());
        e.setMonth(req.expenseDate().getMonthValue());
        e.setReceiptUrl(req.receiptUrl());
        Claims claims = (Claims) auth.getPrincipal();
        userRepo.findByEmail(claims.getSubject()).ifPresent(e::setCreatedBy);
        return e;
    }

    private ExpenseDto toDto(Expense e) {
        return new ExpenseDto(e.getId(),
                e.getCategory() != null ? e.getCategory().getId() : null,
                e.getCategory() != null ? e.getCategory().getName() : null,
                e.getDescription(), e.getAmount(), e.getExpenseDate(),
                e.getYear(), e.getMonth(), e.getReceiptUrl());
    }

    private void requireAdmin(Authentication auth) {
        if (auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
