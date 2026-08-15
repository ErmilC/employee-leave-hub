package com.leavehub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApprovalDto {
    private Integer leaveRequestId;
    private Integer managerEmplId;
    private String action; // "APPROVE" or "REJECT"
    private String comment; // Mandatory for REJECT
}
