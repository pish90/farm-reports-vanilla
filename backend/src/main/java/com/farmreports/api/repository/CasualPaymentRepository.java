package com.farmreports.api.repository;

import com.farmreports.api.entity.CasualPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CasualPaymentRepository extends JpaRepository<CasualPayment, Integer> {
    List<CasualPayment> findByLabourerIdOrderByPaymentDateDesc(Integer labourerId);
}
