package com.leavehub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "LEAVE_WORKFLOW")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveWorkflow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "workflow_id")
    private Integer workflowId;

    @Column(name = "leave_request_id", nullable = false)
    private Integer leaveRequestId;

    @Column(name = "empl_id", nullable = false)
    private Integer emplId; // Employee who performed the state change

    @Column(name = "old_status")
    private String oldStatus;

    @Column(name = "current_status", nullable = false)
    private String currentStatus;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "comment")
    private String comment;
}
