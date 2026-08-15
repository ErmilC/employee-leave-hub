package com.leavehub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LeaveRequestDto {
    private Integer leaveRequestId;
    private Integer emplId;
    private String employeeName;
    private String employeeEmail;
    private Integer deptId;
    private String departmentName;
    private String departmentNameEn;
    private Integer leaveTypeId;
    private String leaveTypeName;
    private String leaveTypeNameEn;
    private String leaveTypeCode;
    private Boolean requiresAttachment;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer workingDays;
    private String status;
    private String rejectionReason;
    private Integer attachmentId;
    private String attachmentName;
    private LocalDateTime createdAt;
}
