package com.leavehub.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "EMPLOYEE")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "empl_id")
    private Integer emplId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "password")
    private String password;

    @Column(name = "role", nullable = false)
    private String role; // "USER", "DEPT_RESP", "ADMIN"

    @Column(name = "dept_id")
    private Integer deptId;

    @Column(name = "annual_leave_days", nullable = false)
    private Integer annualLeaveDays;

    @Column(name = "available_leave_days", nullable = false)
    private Integer availableLeaveDays;
}
