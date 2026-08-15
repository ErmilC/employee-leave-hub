package com.leavehub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "LEAVE_TYPE")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_type_id")
    private Integer leaveTypeId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "name_en")
    private String nameEn;

    @Column(name = "code", nullable = false, unique = true)
    private String code; // "CO", "CM", "FP", "SPECIAL"

    @Column(name = "requires_attachment", nullable = false)
    private Boolean requiresAttachment;

    @Column(name = "paid", nullable = false)
    private Boolean paid;
}
