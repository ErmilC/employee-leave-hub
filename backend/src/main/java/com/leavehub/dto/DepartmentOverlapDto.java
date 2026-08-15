package com.leavehub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DepartmentOverlapDto {
    private LocalDate date;
    private int absentCount;
    private int maxAllowed;
    private boolean limitExceeded;
    private java.util.List<String> absentEmployeeNames;
}
