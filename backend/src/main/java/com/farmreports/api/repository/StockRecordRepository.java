package com.farmreports.api.repository;

import com.farmreports.api.entity.StockRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StockRecordRepository extends JpaRepository<StockRecord, Integer> {

    @Query("SELECT r FROM StockRecord r JOIN FETCH r.item i JOIN FETCH i.category WHERE r.year = :year AND r.month = :month")
    List<StockRecord> findByYearAndMonth(int year, int month);

    Optional<StockRecord> findByItemIdAndYearAndMonth(Integer itemId, int year, int month);
}
