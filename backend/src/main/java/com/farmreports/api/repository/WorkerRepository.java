package com.farmreports.api.repository;

import com.farmreports.api.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkerRepository extends JpaRepository<Worker, Integer> {
    List<Worker> findByActiveTrue();
}
