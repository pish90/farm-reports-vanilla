package com.farmreports.api.controller;

import com.farmreports.api.dto.*;
import com.farmreports.api.entity.*;
import com.farmreports.api.repository.*;
import com.farmreports.api.security.RoleHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockCategoryRepository categoryRepo;
    private final StockItemRepository itemRepo;
    private final StockRecordRepository recordRepo;

    @GetMapping("/categories")
    public List<StockCategoryDto> categories() {
        return categoryRepo.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(c -> new StockCategoryDto(c.getId(), c.getName(), c.getUnit(),
                        c.getDisplayOrder(), c.isActive(),
                        itemRepo.findByCategoryIdAndActiveTrueOrderByDisplayOrderAsc(c.getId())
                                .stream().map(i -> new StockItemDto(i.getId(), c.getId(),
                                        i.getName(), i.getDisplayOrder(), i.isActive(), null, null))
                                .toList()))
                .toList();
    }

    @Transactional
    @PostMapping("/categories")
    public ApiResponse<StockCategoryDto> createCategory(@Valid @RequestBody StockCategoryDto dto,
                                                        Authentication auth) {
        requireAdmin(auth);
        StockCategory cat = new StockCategory();
        cat.setName(dto.name());
        cat.setUnit(dto.unit());
        cat.setDisplayOrder(dto.displayOrder());
        cat = categoryRepo.save(cat);
        return ApiResponse.ok(new StockCategoryDto(cat.getId(), cat.getName(), cat.getUnit(),
                cat.getDisplayOrder(), cat.isActive(), List.of()));
    }

    @Transactional
    @PutMapping("/categories/{id}")
    public ApiResponse<Void> updateCategory(@PathVariable Integer id,
                                            @Valid @RequestBody StockCategoryDto dto,
                                            Authentication auth) {
        requireAdmin(auth);
        StockCategory cat = categoryRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        cat.setName(dto.name());
        cat.setUnit(dto.unit());
        cat.setDisplayOrder(dto.displayOrder());
        cat.setActive(dto.active());
        categoryRepo.save(cat);
        return ApiResponse.ok(null);
    }

    @Transactional
    @PostMapping("/categories/{categoryId}/items")
    public ApiResponse<StockItemDto> createItem(@PathVariable Integer categoryId,
                                                @Valid @RequestBody StockItemDto dto,
                                                Authentication auth) {
        requireAdmin(auth);
        StockCategory cat = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        StockItem item = new StockItem();
        item.setCategory(cat);
        item.setName(dto.name());
        item.setDisplayOrder(dto.displayOrder());
        item = itemRepo.save(item);
        return ApiResponse.ok(new StockItemDto(item.getId(), categoryId, item.getName(),
                item.getDisplayOrder(), item.isActive(), null, null));
    }

    @Transactional
    @PutMapping("/items/{id}")
    public ApiResponse<Void> updateItem(@PathVariable Integer id,
                                        @Valid @RequestBody StockItemDto dto,
                                        Authentication auth) {
        requireAdmin(auth);
        StockItem item = itemRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        item.setName(dto.name());
        item.setDisplayOrder(dto.displayOrder());
        item.setActive(dto.active());
        itemRepo.save(item);
        return ApiResponse.ok(null);
    }

    @GetMapping("/records")
    public List<StockCategoryDto> records(@RequestParam int year, @RequestParam int month) {
        var recs = recordRepo.findByYearAndMonth(year, month);
        return categoryRepo.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(c -> {
                    var items = itemRepo.findByCategoryIdAndActiveTrueOrderByDisplayOrderAsc(c.getId())
                            .stream().map(i -> {
                                var rec = recs.stream()
                                        .filter(r -> r.getItem().getId().equals(i.getId()))
                                        .findFirst();
                                return new StockItemDto(i.getId(), c.getId(), i.getName(),
                                        i.getDisplayOrder(), i.isActive(),
                                        rec.map(StockRecord::getQuantity).orElse(null),
                                        rec.map(StockRecord::getNotes).orElse(null));
                            }).toList();
                    return new StockCategoryDto(c.getId(), c.getName(), c.getUnit(),
                            c.getDisplayOrder(), c.isActive(), items);
                }).toList();
    }

    @Transactional
    @PutMapping("/records")
    public ApiResponse<Void> saveRecords(@RequestBody StockEntryRequest req, Authentication auth) {
        RoleHelper.requireManager(auth);
        for (var entry : req.entries()) {
            StockItem item = itemRepo.findById(entry.itemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            StockRecord rec = recordRepo.findByItemIdAndYearAndMonth(entry.itemId(), req.year(), req.month())
                    .orElseGet(StockRecord::new);
            rec.setItem(item);
            rec.setYear(req.year());
            rec.setMonth(req.month());
            rec.setQuantity(entry.quantity());
            rec.setNotes(entry.notes());
            rec.setRecordedAt(Instant.now());
            recordRepo.save(rec);
        }
        return ApiResponse.ok(null);
    }

    private void requireAdmin(Authentication auth) {
        RoleHelper.requireAdmin(auth);
    }
}
