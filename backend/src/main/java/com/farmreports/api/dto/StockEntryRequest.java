package com.farmreports.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record StockEntryRequest(int year, int month, List<ItemEntry> entries) {
    public record ItemEntry(Integer itemId, BigDecimal quantity, String notes) {}
}
