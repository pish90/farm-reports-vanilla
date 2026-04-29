package com.farmreports.api.repository;

import com.farmreports.api.entity.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StockItemRepository extends JpaRepository<StockItem, Integer> {
    List<StockItem> findByCategoryIdAndActiveTrueOrderByDisplayOrderAsc(Integer categoryId);
}
