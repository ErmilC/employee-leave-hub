package com.leavehub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())) // For H2 Console
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/h2-console/**", "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Admin only endpoints (CRUD on employees, departments, leave-types, global company requests, balances report, all notifications)
                .requestMatchers(HttpMethod.POST, "/api/employees/**", "/api/departments/**", "/api/leave-types/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/employees/**", "/api/departments/**", "/api/leave-types/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/employees/**", "/api/departments/**", "/api/leave-types/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/leave-requests").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/notifications").hasRole("ADMIN")
                .requestMatchers("/api/pdf/balances-report").hasRole("ADMIN")

                // Manager and Admin endpoints (Approval/rejection, department overlap, department requests, pending & department reports, employee list)
                .requestMatchers("/api/leave-requests/approval").hasAnyRole("DEPT_RESP", "ADMIN")
                .requestMatchers("/api/leave-requests/department/**").hasAnyRole("DEPT_RESP", "ADMIN")
                .requestMatchers("/api/pdf/pending-report", "/api/pdf/department-report/**").hasAnyRole("DEPT_RESP", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/employees").hasAnyRole("DEPT_RESP", "ADMIN")
                .requestMatchers("/api/employees/department/**").hasAnyRole("DEPT_RESP", "ADMIN")

                // Authenticated user endpoints (User dashboard, personal history, submitting leave requests, attachments, PDF, session refresh, notifications)
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/notifications/user").authenticated()
                .requestMatchers("/api/leave-requests/employee/**", "/api/leave-requests/*/workflow", "/api/leave-requests/*/submit", "/api/leave-requests/*/cancel").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/leave-requests").authenticated()
                .requestMatchers("/api/attachments/**", "/api/employees/*", "/api/departments/**", "/api/leave-types/**", "/api/notifications/**", "/api/pdf/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
