package com.farmreports.api.controller;

import com.farmreports.api.config.AuditService;
import com.farmreports.api.dto.*;
import com.farmreports.api.entity.*;
import com.farmreports.api.repository.*;
import com.farmreports.api.security.RoleHelper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/casual-labourers")
@RequiredArgsConstructor
public class CasualLabourerController {

    private final CasualLabourerRepository labourerRepo;
    private final CasualWorkSessionRepository sessionRepo;
    private final CasualWorkEntryRepository entryRepo;
    private final CasualPaymentRepository paymentRepo;
    private final AuditService auditService;

    // ── Labourers ─────────────────────────────────────────────────────────────

    @GetMapping
    public ApiResponse<List<CasualLabourerDto>> listLabourers() {
        return ApiResponse.ok(labourerRepo.findByActiveTrueOrderByNameAsc().stream()
            .map(l -> new CasualLabourerDto(l.getId(), l.getName(), l.getPhone(), l.isActive()))
            .toList());
    }

    @PostMapping
    public ApiResponse<CasualLabourerDto> addLabourer(
            @RequestBody CasualLabourerDto req,
            Authentication auth, HttpServletRequest request) {
        RoleHelper.requireManager(auth);
        CasualLabourer l = new CasualLabourer();
        l.setName(req.name());
        l.setPhone(req.phone());
        CasualLabourer saved = labourerRepo.save(l);
        auditService.log("CASUAL_LABOURER_ADDED", auth, request,
            "Added casual labourer: " + saved.getName(), "CasualLabourer", saved.getId());
        return ApiResponse.ok(new CasualLabourerDto(saved.getId(), saved.getName(), saved.getPhone(), saved.isActive()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deactivateLabourer(@PathVariable Integer id,
            Authentication auth, HttpServletRequest request) {
        RoleHelper.requireManager(auth);
        CasualLabourer l = labourerRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        l.setActive(false);
        labourerRepo.save(l);
        auditService.log("CASUAL_LABOURER_DEACTIVATED", auth, request,
            "Deactivated casual labourer: " + l.getName(), "CasualLabourer", id);
        return ApiResponse.ok(null);
    }

    // ── Work Sessions ─────────────────────────────────────────────────────────

    @GetMapping("/work-sessions")
    public ApiResponse<List<CasualWorkSessionDto>> listSessions() {
        return ApiResponse.ok(sessionRepo.findAllWithEntries().stream().map(this::toSessionDto).toList());
    }

    @Transactional
    @PostMapping("/work-sessions")
    public ApiResponse<CasualWorkSessionDto> createSession(
            @RequestBody CreateWorkSessionRequest req,
            Authentication auth, HttpServletRequest request) {
        RoleHelper.requireManager(auth);
        CasualWorkSession session = buildSession(req, null);
        CasualWorkSession saved = sessionRepo.save(session);
        CasualWorkSession full = sessionRepo.findByIdWithEntries(saved.getId()).orElse(saved);
        auditService.log("CASUAL_SESSION_CREATED", auth, request,
            "Created work session: " + req.activity() + " on " + req.sessionDate(), "CasualWorkSession", full.getId());
        return ApiResponse.ok(toSessionDto(full));
    }

    @Transactional
    @PutMapping("/work-sessions/{id}")
    public ApiResponse<CasualWorkSessionDto> updateSession(
            @PathVariable Integer id,
            @RequestBody CreateWorkSessionRequest req,
            Authentication auth, HttpServletRequest request) {
        RoleHelper.requireManager(auth);
        sessionRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        CasualWorkSession session = buildSession(req, id);
        CasualWorkSession saved = sessionRepo.save(session);
        CasualWorkSession full = sessionRepo.findByIdWithEntries(saved.getId()).orElse(saved);
        auditService.log("CASUAL_SESSION_UPDATED", auth, request,
            "Updated work session: " + req.activity(), "CasualWorkSession", id);
        return ApiResponse.ok(toSessionDto(full));
    }

    @Transactional
    @DeleteMapping("/work-sessions/{id}")
    public ApiResponse<Void> deleteSession(@PathVariable Integer id,
            Authentication auth, HttpServletRequest request) {
        RoleHelper.requireManager(auth);
        sessionRepo.deleteById(id);
        auditService.log("CASUAL_SESSION_DELETED", auth, request,
            "Deleted work session #" + id, "CasualWorkSession", id);
        return ApiResponse.ok(null);
    }

    // ── All-Summaries ─────────────────────────────────────────────────────────

    @GetMapping("/all-summaries")
    public ApiResponse<List<CasualLabourerReportDto>> allSummaries() {
        List<CasualLabourer> labourers = labourerRepo.findByActiveTrueOrderByNameAsc();
        return ApiResponse.ok(labourers.stream().map(this::buildSummary).toList());
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    @PostMapping("/{labourerId}/payments")
    public ApiResponse<Void> recordPayment(
            @PathVariable Integer labourerId,
            @RequestBody RecordPaymentRequest req,
            Authentication auth, HttpServletRequest request) {
        RoleHelper.requireManager(auth);
        CasualLabourer l = labourerRepo.findById(labourerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        CasualPayment payment = new CasualPayment();
        payment.setLabourer(l);
        payment.setPaymentDate(req.paymentDate());
        payment.setAmount(req.amount());
        payment.setNote(req.note());
        paymentRepo.save(payment);
        auditService.log("CASUAL_PAYMENT_RECORDED", auth, request,
            "Recorded payment of " + req.amount() + " for " + l.getName(), "CasualPayment", labourerId);
        return ApiResponse.ok(null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CasualWorkSession buildSession(CreateWorkSessionRequest req, Integer existingId) {
        CasualWorkSession session = new CasualWorkSession();
        if (existingId != null) session.setId(existingId);
        session.setSessionDate(req.sessionDate());
        session.setActivity(req.activity());
        session.setDefaultDailyRate(req.defaultDailyRate());

        if (req.entries() != null) {
            for (CreateWorkSessionRequest.EntryRequest e : req.entries()) {
                CasualLabourer labourer = labourerRepo.findById(e.casualLabourerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Labourer not found: " + e.casualLabourerId()));
                CasualWorkEntry entry = new CasualWorkEntry();
                entry.setSession(session);
                entry.setLabourer(labourer);
                entry.setRateOverride(e.rateOverride());
                session.getEntries().add(entry);
            }
        }
        return session;
    }

    private CasualWorkSessionDto toSessionDto(CasualWorkSession s) {
        return new CasualWorkSessionDto(
            s.getId(),
            s.getSessionDate(),
            s.getActivity(),
            s.getDefaultDailyRate(),
            s.getEntries().stream().map(e -> {
                BigDecimal effective = e.getRateOverride() != null ? e.getRateOverride() : s.getDefaultDailyRate();
                return new CasualWorkEntryDto(e.getId(), e.getLabourer().getId(),
                    e.getLabourer().getName(), e.getRateOverride(), effective);
            }).toList()
        );
    }

    private CasualLabourerReportDto buildSummary(CasualLabourer l) {
        List<CasualWorkEntry> entries = entryRepo.findByLabourerIdOrderBySessionDateDesc(l.getId());
        BigDecimal earned = entries.stream()
            .map(e -> e.getRateOverride() != null ? e.getRateOverride() : e.getSession().getDefaultDailyRate())
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CasualPayment> payments = paymentRepo.findByLabourerIdOrderByPaymentDateDesc(l.getId());
        BigDecimal paid = payments.stream().map(CasualPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CasualLabourerReportDto.WorkEntry> workEntries = entries.stream()
            .map(e -> new CasualLabourerReportDto.WorkEntry(
                e.getSession().getId(),
                e.getSession().getSessionDate(),
                e.getSession().getActivity(),
                e.getRateOverride() != null ? e.getRateOverride() : e.getSession().getDefaultDailyRate()
            )).toList();

        return new CasualLabourerReportDto(
            l.getId(), l.getName(), l.getPhone(),
            earned, paid, earned.subtract(paid), workEntries
        );
    }
}
