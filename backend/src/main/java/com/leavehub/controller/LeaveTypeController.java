package com.leavehub.controller;

import com.leavehub.entity.LeaveType;
import com.leavehub.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leave-types")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LeaveTypeController {

    private final LeaveTypeRepository leaveTypeRepository;

    @GetMapping
    public ResponseEntity<List<LeaveType>> getAllLeaveTypes() {
        return ResponseEntity.ok(leaveTypeRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> saveLeaveType(@RequestBody LeaveType leaveType) {
        if (leaveType.getName() == null || leaveType.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba romana a tipului de concediu este obligatorie.");
        }
        if (leaveType.getNameEn() == null || leaveType.getNameEn().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba engleza a tipului de concediu este obligatorie.");
        }
        if (leaveType.getCode() == null || leaveType.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Codul tipului de concediu este obligatoriu.");
        }
        leaveType.setName(leaveType.getName().trim());
        leaveType.setNameEn(leaveType.getNameEn().trim());
        leaveType.setCode(leaveType.getCode().trim().toUpperCase());
        if (leaveType.getRequiresAttachment() == null) leaveType.setRequiresAttachment(false);
        if (leaveType.getPaid() == null) leaveType.setPaid(true);
        return ResponseEntity.ok(leaveTypeRepository.save(leaveType));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateLeaveType(@PathVariable Integer id, @RequestBody LeaveType details) {
        if (details.getName() == null || details.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba romana a tipului de concediu este obligatorie.");
        }
        if (details.getNameEn() == null || details.getNameEn().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba engleza a tipului de concediu este obligatorie.");
        }
        if (details.getCode() == null || details.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Codul tipului de concediu este obligatoriu.");
        }
        return leaveTypeRepository.findById(id).map(type -> {
            type.setName(details.getName().trim());
            type.setNameEn(details.getNameEn().trim());
            type.setCode(details.getCode().trim().toUpperCase());
            type.setRequiresAttachment(details.getRequiresAttachment() != null ? details.getRequiresAttachment() : false);
            type.setPaid(details.getPaid() != null ? details.getPaid() : true);
            return ResponseEntity.ok(leaveTypeRepository.save(type));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLeaveType(@PathVariable Integer id) {
        if (!leaveTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        leaveTypeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
