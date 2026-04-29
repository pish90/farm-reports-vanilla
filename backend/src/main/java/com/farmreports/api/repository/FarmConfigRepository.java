package com.farmreports.api.repository;

import com.farmreports.api.entity.FarmConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FarmConfigRepository extends JpaRepository<FarmConfig, Integer> {}
