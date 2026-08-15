package com.leavehub.controller;

import com.leavehub.entity.Department;
import com.leavehub.repository.DepartmentRepository;
import com.leavehub.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Department> getDepartmentById(@PathVariable Integer id) {
        return departmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> saveDepartment(@RequestBody Department department) {
        if (department.getDepartmentName() == null || department.getDepartmentName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba romana a departamentului este obligatorie.");
        }
        if (department.getDepartmentNameEn() == null || department.getDepartmentNameEn().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba engleza a departamentului este obligatorie.");
        }
        department.setDepartmentName(department.getDepartmentName().trim());
        department.setDepartmentNameEn(department.getDepartmentNameEn().trim());
        if (department.getMaxAbsentEmployees() == null || department.getMaxAbsentEmployees() < 1) {
            department.setMaxAbsentEmployees(2);
        }
        return ResponseEntity.ok(departmentRepository.save(department));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDepartment(@PathVariable Integer id, @RequestBody Department details) {
        if (details.getDepartmentName() == null || details.getDepartmentName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba romana a departamentului este obligatorie.");
        }
        if (details.getDepartmentNameEn() == null || details.getDepartmentNameEn().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Denumirea in limba engleza a departamentului este obligatorie.");
        }
        return departmentRepository.findById(id).map(dept -> {
            dept.setDepartmentName(details.getDepartmentName().trim());
            dept.setDepartmentNameEn(details.getDepartmentNameEn().trim());
            dept.setManagerId(details.getManagerId());
            dept.setMaxAbsentEmployees(details.getMaxAbsentEmployees() != null ? details.getMaxAbsentEmployees() : 2);
            return ResponseEntity.ok(departmentRepository.save(dept));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Integer id) {
        if (!departmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        employeeRepository.findByDeptId(id).forEach(e -> {
            e.setDeptId(null);
            employeeRepository.save(e);
        });
        departmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
