package com.leavehub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "LEAVE_REQUEST")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_request_id")
    private Integer leaveRequestId;

    @Column(name = "empl_id", nullable = false)
    private Integer emplId;

    @Column(name = "leave_type_id", nullable = false)
    private Integer leaveTypeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "working_days", nullable = false)
    private Integer workingDays;

    @Column(name = "status", nullable = false)
    private String status; // "PENDING", "APPROVED", "REJECTED", "CANCELLED"

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
