package com.farmreports.api.repository;

import com.farmreports.api.entity.Attendance;
import com.farmreports.api.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {

    @Query("SELECT a FROM Attendance a JOIN FETCH a.worker WHERE a.date BETWEEN :from AND :to ORDER BY a.date, a.worker.name")
    List<Attendance> findByDateBetween(LocalDate from, LocalDate to);

    Optional<Attendance> findByWorkerAndDate(Worker worker, LocalDate date);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.date = :date AND a.present = true")
    long countPresentOnDate(LocalDate date);
}
