package com.leavehub.controller;

import com.leavehub.config.JwtService;
import com.leavehub.dto.AuthRequestDto;
import com.leavehub.dto.AuthResponseDto;
import com.leavehub.entity.Employee;
import com.leavehub.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final EmployeeRepository employeeRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequestDto request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email is required.");
        }

        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Password is required.");
        }

        Optional<Employee> empOpt = employeeRepository.findByEmailIgnoreCase(request.getEmail().trim());

        if (empOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email sau parola incorecta. Va rugam sa reincercati.");
        }

        Employee emp = empOpt.get();
        String rawPassword = request.getPassword().trim();
        String storedPassword = (emp.getPassword() != null && !emp.getPassword().isBlank()) ? emp.getPassword() : "password";

        boolean passwordValid = false;
        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            passwordValid = passwordEncoder.matches(rawPassword, storedPassword);
        } else {
            // Auto-upgrade plain-text password to BCrypt on successful login
            if (storedPassword.equals(rawPassword)) {
                passwordValid = true;
                emp.setPassword(passwordEncoder.encode(rawPassword));
                employeeRepository.save(emp);
            }
        }

        if (!passwordValid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email sau parola incorecta. Va rugam sa reincercati.");
        }

        String jwtToken = jwtService.generateToken(emp);

        AuthResponseDto response = new AuthResponseDto(
                jwtToken,
                emp.getEmplId(),
                emp.getName(),
                emp.getEmail(),
                emp.getRole(),
                emp.getDeptId(),
                emp.getAnnualLeaveDays(),
                emp.getAvailableLeaveDays()
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null || !authentication.isAuthenticated()
                || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found or unauthenticated.");
        }

        Optional<Employee> empOpt = employeeRepository.findByEmail(authentication.getName());

        if (empOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found or unauthenticated.");
        }

        Employee emp = empOpt.get();
        String jwtToken = jwtService.generateToken(emp);
        AuthResponseDto response = new AuthResponseDto(
                jwtToken,
                emp.getEmplId(),
                emp.getName(),
                emp.getEmail(),
                emp.getRole(),
                emp.getDeptId(),
                emp.getAnnualLeaveDays(),
                emp.getAvailableLeaveDays()
        );

        return ResponseEntity.ok(response);
    }
}
