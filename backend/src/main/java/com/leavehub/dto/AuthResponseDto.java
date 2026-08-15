package com.leavehub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDto {
    private String token;
    private Integer emplId;
    private String name;
    private String email;
    private String role;
    private Integer deptId;
    private Integer annualLeaveDays;
    private Integer availableLeaveDays;
}
