package com.farmreports.api.repository;

import com.farmreports.api.entity.StockCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StockCategoryRepository extends JpaRepository<StockCategory, Integer> {
    List<StockCategory> findByActiveTrueOrderByDisplayOrderAsc();
}
