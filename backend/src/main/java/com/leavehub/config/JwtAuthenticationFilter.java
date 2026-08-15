package com.leavehub.config;

import com.leavehub.entity.Employee;
import com.leavehub.repository.EmployeeRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final EmployeeRepository employeeRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && jwtService.validateToken(token)) {
            try {
                String email = jwtService.extractEmail(token);
                Integer emplId = jwtService.extractEmplId(token);
                String role = jwtService.extractRole(token);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // Verify employee exists in repository
                    Optional<Employee> empOpt = (emplId != null)
                            ? employeeRepository.findById(emplId)
                            : employeeRepository.findByEmail(email);

                    if (empOpt.isPresent()) {
                        Employee emp = empOpt.get();
                        String effectiveRole = (emp.getRole() != null) ? emp.getRole() : role;
                        String authority = "ROLE_" + (effectiveRole != null ? effectiveRole.toUpperCase() : "USER");
                        List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(authority));

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(emp.getEmail(), null, authorities);

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (Exception ignored) {
                // If any error occurs while extracting claims, security context remains unauthenticated
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }
}
