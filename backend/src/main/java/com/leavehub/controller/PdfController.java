package com.leavehub.controller;

import com.leavehub.config.SecurityUtils;
import com.leavehub.dto.LeaveRequestDto;
import com.leavehub.entity.Department;
import com.leavehub.entity.Employee;
import com.leavehub.entity.LeaveType;
import com.leavehub.repository.DepartmentRepository;
import com.leavehub.repository.EmployeeRepository;
import com.leavehub.repository.LeaveRequestRepository;
import com.leavehub.repository.LeaveTypeRepository;
import com.leavehub.service.LeaveRequestService;
import com.leavehub.service.PdfGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PdfController {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveRequestService leaveRequestService;
    private final PdfGeneratorService pdfGeneratorService;
    private final SecurityUtils securityUtils;

    @GetMapping("/leave-request/{id}")
    public ResponseEntity<byte[]> downloadLeaveRequestPdf(@PathVariable Integer id) {
        // Enforces access authorization internally (requester, manager, admin)
        LeaveRequestDto request = leaveRequestService.getRequestById(id);

        Employee employee = employeeRepository.findById(request.getEmplId()).orElse(null);
        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId()).orElse(null);
        Department department = (employee != null && employee.getDeptId() != null) ?
                departmentRepository.findById(employee.getDeptId()).orElse(null) : null;

        byte[] pdfBytes = pdfGeneratorService.generateLeaveRequestPdf(request, employee, leaveType, department);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "Cerere_Concediu_" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @GetMapping("/department-report/{deptId}")
    public ResponseEntity<byte[]> downloadDepartmentReportPdf(@PathVariable Integer deptId) {
        Integer targetDeptId = deptId;
        if (targetDeptId == null || targetDeptId == 0) {
            Employee current = securityUtils.getCurrentEmployee();
            if (!securityUtils.isAdmin(current)) {
                if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && current.getDeptId() != null) {
                    targetDeptId = current.getDeptId();
                } else {
                    throw new AccessDeniedException("Acces interzis.");
                }
            } else {
                Department allDept = new Department(0, "Toate Departamentele", "All Departments", null, 0);
                List<LeaveRequestDto> requests = leaveRequestService.getAllRequests();
                List<Employee> employees = employeeRepository.findAll();

                byte[] pdfBytes = pdfGeneratorService.generateDepartmentReportPdf(allDept, requests, employees);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment", "Raport_Toate_Departamentele.pdf");
                headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            }
        }

        final Integer effectiveDeptId = targetDeptId;
        Department department = departmentRepository.findById(effectiveDeptId)
                .orElseThrow(() -> new IllegalArgumentException("Departamentul nu exista: " + effectiveDeptId));

        // Enforces department authorization internally
        List<LeaveRequestDto> requests = leaveRequestService.getRequestsByDepartment(effectiveDeptId);
        List<Employee> employees = employeeRepository.findByDeptId(effectiveDeptId);

        byte[] pdfBytes = pdfGeneratorService.generateDepartmentReportPdf(department, requests, employees);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "Raport_Departament_" + effectiveDeptId + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @GetMapping("/balances-report")
    public ResponseEntity<byte[]> downloadBalancesReportPdf() {
        Employee current = securityUtils.getCurrentEmployee();
        if (!securityUtils.isAdmin(current)) {
            throw new AccessDeniedException("Doar administratorii pot genera raportul de solduri globale.");
        }

        List<Employee> employees = employeeRepository.findAll();
        List<Department> departments = departmentRepository.findAll();

        byte[] pdfBytes = pdfGeneratorService.generateBalancesReportPdf(employees, departments);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "Raport_Situatie_Solduri.pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @GetMapping("/pending-report")
    public ResponseEntity<byte[]> downloadPendingReportPdf() {
        Employee current = securityUtils.getCurrentEmployee();
        if (!securityUtils.isManager(current)) {
            throw new AccessDeniedException("Doar managerii si administratorii pot descarca raportul de cereri in asteptare.");
        }

        List<LeaveRequestDto> pending;
        if (securityUtils.isAdmin(current)) {
            pending = leaveRequestService.getAllRequests().stream()
                    .filter(r -> "PENDING".equalsIgnoreCase(r.getStatus()))
                    .collect(Collectors.toList());
        } else {
            pending = leaveRequestService.getRequestsByDepartment(current.getDeptId()).stream()
                    .filter(r -> "PENDING".equalsIgnoreCase(r.getStatus()))
                    .collect(Collectors.toList());
        }

        byte[] pdfBytes = pdfGeneratorService.generatePendingRequestsReportPdf(pending);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "Raport_Cereri_In_Asteptare.pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
