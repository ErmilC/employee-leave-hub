package com.leavehub.config;

import com.leavehub.entity.Employee;
import com.leavehub.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final EmployeeRepository employeeRepository;

    public Employee getCurrentEmployee() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Acces neautorizat. Va rugam sa va autentificati.");
        }
        return employeeRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Utilizatorul autentificat nu exista in baza de date."));
    }

    public Optional<Employee> getCurrentEmployeeOptional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        return employeeRepository.findByEmail(auth.getName());
    }

    public boolean isAdmin(Employee employee) {
        return employee != null && "ADMIN".equalsIgnoreCase(employee.getRole());
    }

    public boolean isManager(Employee employee) {
        return employee != null && ("DEPT_RESP".equalsIgnoreCase(employee.getRole()) || "ADMIN".equalsIgnoreCase(employee.getRole()));
    }
}
