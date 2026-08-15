package com.leavehub.controller;

import com.leavehub.dto.ApprovalDto;
import com.leavehub.dto.DepartmentOverlapDto;
import com.leavehub.dto.LeaveRequestDto;
import com.leavehub.entity.LeaveRequest;
import com.leavehub.entity.LeaveWorkflow;
import com.leavehub.service.LeaveRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/leave-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    @GetMapping
    public ResponseEntity<List<LeaveRequestDto>> getAllRequests() {
        return ResponseEntity.ok(leaveRequestService.getAllRequests());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequestDto> getRequestById(@PathVariable Integer id) {
        return ResponseEntity.ok(leaveRequestService.getRequestById(id));
    }

    @GetMapping("/employee/{emplId}")
    public ResponseEntity<List<LeaveRequestDto>> getRequestsByEmployee(@PathVariable Integer emplId) {
        return ResponseEntity.ok(leaveRequestService.getRequestsByEmployee(emplId));
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<LeaveRequestDto>> getRequestsByDepartment(@PathVariable Integer deptId) {
        return ResponseEntity.ok(leaveRequestService.getRequestsByDepartment(deptId));
    }

    @PostMapping
    public ResponseEntity<LeaveRequestDto> createRequest(@RequestBody LeaveRequest leaveRequest,
                                                         @RequestParam(required = false, defaultValue = "PENDING") String status) {
        return ResponseEntity.ok(leaveRequestService.createLeaveRequest(leaveRequest, status));
    }

    @PostMapping("/approval")
    public ResponseEntity<LeaveRequestDto> processApproval(@RequestBody ApprovalDto approvalDto) {
        return ResponseEntity.ok(leaveRequestService.processApproval(approvalDto));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<LeaveRequestDto> cancelRequest(@PathVariable Integer id, @RequestParam(required = false) Integer emplId) {
        return ResponseEntity.ok(leaveRequestService.cancelRequest(id, emplId));
    }

    @GetMapping("/department/{deptId}/overlap")
    public ResponseEntity<List<DepartmentOverlapDto>> getOverlapAnalysis(
            @PathVariable Integer deptId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(leaveRequestService.getDepartmentOverlapAnalysis(deptId, startDate, endDate));
    }

    @GetMapping("/{id}/workflow")
    public ResponseEntity<List<LeaveWorkflow>> getWorkflowHistory(@PathVariable Integer id) {
        return ResponseEntity.ok(leaveRequestService.getWorkflowHistory(id));
    }
}
