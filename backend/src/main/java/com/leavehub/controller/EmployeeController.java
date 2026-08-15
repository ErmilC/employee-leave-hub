package com.leavehub.controller;

import com.leavehub.config.SecurityUtils;
import com.leavehub.entity.Employee;
import com.leavehub.repository.DepartmentRepository;
import com.leavehub.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        Employee current = securityUtils.getCurrentEmployee();
        if (securityUtils.isAdmin(current)) {
            return ResponseEntity.ok(employeeRepository.findAll());
        } else if ("DEPT_RESP".equalsIgnoreCase(current.getRole())) {
            if (current.getDeptId() == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            return ResponseEntity.ok(employeeRepository.findByDeptId(current.getDeptId()));
        } else {
            throw new AccessDeniedException("Acces interzis.");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Integer id) {
        Employee target = employeeRepository.findById(id)
                .orElse(null);
        if (target == null) {
            return ResponseEntity.notFound().build();
        }

        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(id)) {
            throw new AccessDeniedException("Nu aveti permisiunea de a vizualiza profilul altui angajat.");
        }
        if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(id)) {
            if (!Objects.equals(current.getDeptId(), target.getDeptId())) {
                throw new AccessDeniedException("Nu puteti vizualiza datele angajatilor din alte departamente.");
            }
        }

        return ResponseEntity.ok(target);
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<Employee>> getEmployeesByDepartment(@PathVariable Integer deptId) {
        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole())) {
            throw new AccessDeniedException("Acces interzis.");
        }
        if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !Objects.equals(current.getDeptId(), deptId)) {
            throw new AccessDeniedException("Nu puteti vizualiza angajatii din alt departament.");
        }
        return ResponseEntity.ok(employeeRepository.findByDeptId(deptId));
    }

    @PostMapping
    public ResponseEntity<?> saveEmployee(@RequestBody Employee employee) {
        if (employee.getName() == null || employee.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Numele angajatului este obligatoriu.");
        }
        if (employee.getEmail() == null || !isValidEmail(employee.getEmail())) {
            return ResponseEntity.badRequest().body("Adresa de email este invalida! Introduceti un format valid (ex: nume@domeniu.ro).");
        }
        String cleanEmail = employee.getEmail().trim().toLowerCase();
        if (employeeRepository.findByEmail(cleanEmail).isPresent()) {
            return ResponseEntity.badRequest().body("Exista deja un angajat inregistrat cu adresa de email: " + cleanEmail);
        }
        employee.setName(employee.getName().trim());
        employee.setEmail(cleanEmail);
        String rawPassword = (employee.getPassword() == null || employee.getPassword().trim().isEmpty())
                ? "password" : employee.getPassword().trim();
        employee.setPassword(passwordEncoder.encode(rawPassword));
        if (employee.getAvailableLeaveDays() == null) {
            employee.setAvailableLeaveDays(employee.getAnnualLeaveDays());
        }
        return ResponseEntity.ok(employeeRepository.save(employee));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEmployee(@PathVariable Integer id, @RequestBody Employee employeeDetails) {
        if (employeeDetails.getName() == null || employeeDetails.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Numele angajatului este obligatoriu.");
        }
        if (employeeDetails.getEmail() == null || !isValidEmail(employeeDetails.getEmail())) {
            return ResponseEntity.badRequest().body("Adresa de email este invalida! Introduceti un format valid (ex: nume@domeniu.ro).");
        }
        return employeeRepository.findById(id).map(emp -> {
            String cleanEmail = employeeDetails.getEmail().trim().toLowerCase();
            if (!emp.getEmail().equalsIgnoreCase(cleanEmail) && employeeRepository.findByEmail(cleanEmail).isPresent()) {
                return ResponseEntity.badRequest().body("Exista deja un alt angajat inregistrat cu adresa de email: " + cleanEmail);
            }
            emp.setName(employeeDetails.getName().trim());
            emp.setEmail(cleanEmail);
            emp.setRole(employeeDetails.getRole());
            emp.setDeptId(employeeDetails.getDeptId());
            emp.setAnnualLeaveDays(employeeDetails.getAnnualLeaveDays());
            emp.setAvailableLeaveDays(employeeDetails.getAvailableLeaveDays());
            if (employeeDetails.getPassword() != null && !employeeDetails.getPassword().trim().isEmpty()) {
                emp.setPassword(passwordEncoder.encode(employeeDetails.getPassword().trim()));
            }
            return ResponseEntity.ok(employeeRepository.save(emp));
        }).orElse(ResponseEntity.notFound().build());
    }

    private boolean isValidEmail(String email) {
        if (email == null) return false;
        String regex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        return email.trim().matches(regex);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Integer id) {
        if (!employeeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        departmentRepository.findAll().stream()
                .filter(d -> id.equals(d.getManagerId()))
                .forEach(d -> {
                    d.setManagerId(null);
                    departmentRepository.save(d);
                });
        employeeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
