package com.leavehub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "DEPARTMENT")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dept_id")
    private Integer deptId;

    @Column(name = "department_name", nullable = false)
    private String departmentName;

    @Column(name = "department_name_en")
    private String departmentNameEn;

    @Column(name = "manager_id")
    private Integer managerId;

    @Column(name = "max_absent_employees", nullable = false)
    private Integer maxAbsentEmployees;
}
