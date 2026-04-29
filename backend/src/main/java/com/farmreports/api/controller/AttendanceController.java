package com.farmreports.api.controller;

import com.farmreports.api.dto.ApiResponse;
import com.farmreports.api.dto.AttendanceBulkRequest;
import com.farmreports.api.dto.AttendanceDto;
import com.farmreports.api.entity.Attendance;
import com.farmreports.api.entity.Worker;
import com.farmreports.api.repository.AttendanceRepository;
import com.farmreports.api.repository.WorkerRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceRepository attendanceRepo;
    private final WorkerRepository workerRepo;

    @GetMapping
    public List<AttendanceDto> list(@RequestParam int year, @RequestParam int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        return attendanceRepo.findByDateBetween(from, to).stream().map(this::toDto).toList();
    }

    @Transactional
    @PostMapping("/bulk")
    public ApiResponse<Void> bulkSave(@Valid @RequestBody AttendanceBulkRequest req) {
        for (AttendanceBulkRequest.WorkerAttendance wa : req.records()) {
            Worker worker = workerRepo.findById(wa.workerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Worker not found: " + wa.workerId()));
            Attendance att = attendanceRepo.findByWorkerAndDate(worker, req.date())
                    .orElseGet(Attendance::new);
            att.setWorker(worker);
            att.setDate(req.date());
            att.setPresent(wa.present());
            att.setNotes(wa.notes());
            attendanceRepo.save(att);
        }
        return ApiResponse.ok(null);
    }

    private AttendanceDto toDto(Attendance a) {
        return new AttendanceDto(a.getId(), a.getWorker().getId(), a.getWorker().getName(),
                a.getDate(), a.isPresent(), a.getNotes());
    }
}
