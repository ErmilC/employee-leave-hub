package com.leavehub.service;

import com.leavehub.config.SecurityUtils;
import com.leavehub.dto.ApprovalDto;
import com.leavehub.dto.DepartmentOverlapDto;
import com.leavehub.dto.LeaveRequestDto;
import com.leavehub.entity.*;
import com.leavehub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveWorkflowRepository leaveWorkflowRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final AttachmentRepository attachmentRepository;
    private final WorkingDaysCalculator workingDaysCalculator;
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    public List<LeaveRequestDto> getAllRequests() {
        Employee current = securityUtils.getCurrentEmployee();
        if (!securityUtils.isAdmin(current)) {
            throw new AccessDeniedException("Doar administratorii pot vizualiza toate cererile companiei.");
        }
        return leaveRequestRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<LeaveRequestDto> getRequestsByEmployee(Integer emplId) {
        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(emplId)) {
            throw new AccessDeniedException("Nu aveti permisiunea de a vizualiza cererile altui angajat.");
        }
        if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(emplId)) {
            Employee target = employeeRepository.findById(emplId)
                    .orElseThrow(() -> new IllegalArgumentException("Angajatul specificat nu exista."));
            if (!Objects.equals(current.getDeptId(), target.getDeptId())) {
                throw new AccessDeniedException("Nu puteti vizualiza cererile angajatilor din alte departamente.");
            }
        }
        return leaveRequestRepository.findByEmplId(emplId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<LeaveRequestDto> getRequestsByDepartment(Integer deptId) {
        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole())) {
            throw new AccessDeniedException("Acces interzis.");
        }
        if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !Objects.equals(current.getDeptId(), deptId)) {
            throw new AccessDeniedException("Nu puteti accesa cererile altui departament.");
        }

        List<Employee> deptEmployees = employeeRepository.findByDeptId(deptId);
        List<Integer> emplIds = deptEmployees.stream().map(Employee::getEmplId).collect(Collectors.toList());
        if (emplIds.isEmpty()) return Collections.emptyList();

        return leaveRequestRepository.findByEmplIdIn(emplIds).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public LeaveRequestDto getRequestById(Integer leaveRequestId) {
        LeaveRequest request = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Cererea de concediu nu a fost gasita: " + leaveRequestId));

        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
            throw new AccessDeniedException("Nu aveti permisiunea de a vizualiza aceasta cerere.");
        }
        if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
            Employee requester = employeeRepository.findById(request.getEmplId()).orElse(null);
            if (requester != null && !Objects.equals(current.getDeptId(), requester.getDeptId())) {
                throw new AccessDeniedException("Nu puteti vizualiza cererile angajatilor din alte departamente.");
            }
        }

        return convertToDto(request);
    }

    @Transactional
    public LeaveRequestDto createLeaveRequest(LeaveRequest leaveRequest, String initialStatus) {
        Employee current = securityUtils.getCurrentEmployee();

        // Enforce employee ownership unless admin
        if ("USER".equalsIgnoreCase(current.getRole()) || leaveRequest.getEmplId() == null) {
            leaveRequest.setEmplId(current.getEmplId());
        } else if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(leaveRequest.getEmplId())) {
            Employee target = employeeRepository.findById(leaveRequest.getEmplId())
                    .orElseThrow(() -> new IllegalArgumentException("Angajat inexistent"));
            if (!Objects.equals(current.getDeptId(), target.getDeptId())) {
                throw new AccessDeniedException("Nu puteti crea cereri pentru angajati din alt departament.");
            }
        }

        Employee empl = employeeRepository.findByIdWithLock(leaveRequest.getEmplId())
                .orElseThrow(() -> new IllegalArgumentException("Angajatul nu a fost gasit: " + leaveRequest.getEmplId()));
        LeaveType type = leaveTypeRepository.findById(leaveRequest.getLeaveTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Tipul de concediu nu a fost gasit: " + leaveRequest.getLeaveTypeId()));

        if (leaveRequest.getStartDate() == null || leaveRequest.getEndDate() == null) {
            throw new IllegalArgumentException("Data de inceput si data de sfarsit sunt obligatorii.");
        }
        if (leaveRequest.getEndDate().isBefore(leaveRequest.getStartDate())) {
            throw new IllegalArgumentException("Data de sfarsit nu poate fi anterioara datei de inceput.");
        }

        int workingDays = workingDaysCalculator.calculateWorkingDays(leaveRequest.getStartDate(), leaveRequest.getEndDate());
        if (workingDays <= 0) {
            throw new IllegalArgumentException("Perioada selectata nu contine zile lucratoare valide.");
        }

        // Validate available leave days if Paid & Annual leave (CO)
        if ("CO".equalsIgnoreCase(type.getCode()) && empl.getAvailableLeaveDays() < workingDays) {
            throw new IllegalArgumentException("Sold insuficient de zile de concediu! Disponibile: "
                    + empl.getAvailableLeaveDays() + ", Solicitate: " + workingDays);
        }

        String status = (initialStatus != null && !initialStatus.isBlank()) ? initialStatus.toUpperCase() : "PENDING";
        if (!"APPROVED".equalsIgnoreCase(status)) {
            status = "PENDING";
        }

        // Validate overlapping requests for the same employee
        validateNoOverlapForEmployee(leaveRequest.getEmplId(), leaveRequest.getStartDate(), leaveRequest.getEndDate(), leaveRequest.getLeaveRequestId());

        leaveRequest.setWorkingDays(workingDays);
        leaveRequest.setStatus(status);
        leaveRequest.setCreatedAt(LocalDateTime.now());

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        // Deduct available days if created directly as APPROVED with lock already held
        if ("APPROVED".equalsIgnoreCase(status)) {
            if ("CO".equalsIgnoreCase(type.getCode())) {
                if (empl.getAvailableLeaveDays() < workingDays) {
                    throw new IllegalStateException("Sold insuficient de zile de concediu! Disponibile: "
                            + empl.getAvailableLeaveDays() + ", Solicitate: " + workingDays);
                }
                empl.setAvailableLeaveDays(empl.getAvailableLeaveDays() - workingDays);
                employeeRepository.save(empl);
            }
        }

        // Record Workflow
        recordWorkflow(saved.getLeaveRequestId(), current.getEmplId(), null, status, "Cerere creata in sistem.");

        // Send Email Notification demo
        if ("PENDING".equals(status)) {
            notifyDepartmentManager(empl, saved, type);
        }

        return convertToDto(saved);
    }

    @Transactional
    public LeaveRequestDto processApproval(ApprovalDto approvalDto) {
        LeaveRequest request = leaveRequestRepository.findByIdWithLock(approvalDto.getLeaveRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Cererea nu exista: " + approvalDto.getLeaveRequestId()));

        Employee current = securityUtils.getCurrentEmployee();
        if (!securityUtils.isManager(current)) {
            throw new AccessDeniedException("Doar managerii de departament si administratorii pot aproba cereri.");
        }

        Employee requester = employeeRepository.findById(request.getEmplId())
                .orElseThrow(() -> new IllegalArgumentException("Angajatul solicitant nu exista."));

        if ("DEPT_RESP".equalsIgnoreCase(current.getRole())) {
            if (!Objects.equals(current.getDeptId(), requester.getDeptId())) {
                throw new AccessDeniedException("Nu puteti aproba sau respinge cereri din afara departamentului dumneavoastra.");
            }
        }

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Doar cererile in status PENDING pot fi aprobate sau respinse.");
        }

        String oldStatus = request.getStatus();
        String action = approvalDto.getAction().toUpperCase();
        Integer managerEmplId = current.getEmplId();

        if ("REJECT".equals(action) || "REJECTED".equals(action)) {
            if (approvalDto.getComment() == null || approvalDto.getComment().trim().isEmpty()) {
                throw new IllegalArgumentException("Comentariul este obligatoriu la respingerea unei cereri de concediu!");
            }
            request.setStatus("REJECTED");
            recordWorkflow(request.getLeaveRequestId(), managerEmplId, oldStatus, "REJECTED", approvalDto.getComment());

            notificationService.sendDemoEmail(
                    requester.getEmail(),
                    requester.getName(),
                    "Cerere respinsa #" + request.getLeaveRequestId(),
                    "Cererea ta de concediu din perioada " + request.getStartDate() + " - " + request.getEndDate() +
                            " a fost RESPINSA de catre " + current.getName() + ". Motiv: " + approvalDto.getComment(),
                    "REJECTED"
            );
        } else if ("APPROVE".equals(action) || "APPROVED".equals(action)) {
            // Deduct available days with pessimistic lock (SELECT FOR UPDATE) to prevent race conditions
            LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId()).orElse(null);
            if (leaveType != null && "CO".equalsIgnoreCase(leaveType.getCode())) {
                Employee lockedRequester = employeeRepository.findByIdWithLock(request.getEmplId())
                        .orElse(requester);
                if (lockedRequester.getAvailableLeaveDays() < request.getWorkingDays()) {
                    throw new IllegalStateException("Sold insuficient de zile de concediu ramase! Disponibile: "
                            + lockedRequester.getAvailableLeaveDays() + ", Solicitate: " + request.getWorkingDays());
                }
                lockedRequester.setAvailableLeaveDays(lockedRequester.getAvailableLeaveDays() - request.getWorkingDays());
                employeeRepository.save(lockedRequester);
            }

            request.setStatus("APPROVED");
            recordWorkflow(request.getLeaveRequestId(), managerEmplId, oldStatus, "APPROVED",
                    approvalDto.getComment() != null ? approvalDto.getComment() : "Cerere aprobata de catre " + current.getName());

            notificationService.sendDemoEmail(
                    requester.getEmail(),
                    requester.getName(),
                    "Cerere aprobata #" + request.getLeaveRequestId(),
                    "Cererea ta de concediu din perioada " + request.getStartDate() + " - " + request.getEndDate() +
                            " (" + request.getWorkingDays() + " zile) a fost APROBATA de catre " + current.getName() + ".",
                    "APPROVED"
            );
        } else {
            throw new IllegalArgumentException("Actiune invalida: " + approvalDto.getAction());
        }

        LeaveRequest updated = leaveRequestRepository.save(request);
        return convertToDto(updated);
    }

    @Transactional
    public LeaveRequestDto cancelRequest(Integer leaveRequestId, Integer employeeId) {
        LeaveRequest request = leaveRequestRepository.findByIdWithLock(leaveRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Cererea nu exista: " + leaveRequestId));

        Employee current = securityUtils.getCurrentEmployee();
        Employee employee = employeeRepository.findById(request.getEmplId()).orElse(null);

        if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
            throw new AccessDeniedException("Nu puteti anula cererea altui angajat.");
        }

        if ("CANCELLED".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Cererea este deja anulata.");
        }

        if ("APPROVED".equalsIgnoreCase(request.getStatus())) {
            if (!securityUtils.isAdmin(current) && !("DEPT_RESP".equalsIgnoreCase(current.getRole()) && employee != null && Objects.equals(current.getDeptId(), employee.getDeptId()))) {
                throw new IllegalStateException("Nu puteti anula o cerere care a fost deja aprobata fara acordul managerului sau administratorului.");
            }
            // Restore leave days for approved annual leave with pessimistic lock
            LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId()).orElse(null);
            if (leaveType != null && "CO".equalsIgnoreCase(leaveType.getCode()) && employee != null) {
                Employee lockedEmployee = employeeRepository.findByIdWithLock(request.getEmplId()).orElse(employee);
                lockedEmployee.setAvailableLeaveDays(Math.min(lockedEmployee.getAnnualLeaveDays(), lockedEmployee.getAvailableLeaveDays() + request.getWorkingDays()));
                employeeRepository.save(lockedEmployee);
            }
        }

        String oldStatus = request.getStatus();
        request.setStatus("CANCELLED");
        LeaveRequest updated = leaveRequestRepository.save(request);

        recordWorkflow(leaveRequestId, current.getEmplId(), oldStatus, "CANCELLED", "Cererea a fost anulata de catre " + current.getName() + ".");

        if (employee != null) {
            notificationService.sendDemoEmail(
                    employee.getEmail(),
                    employee.getName(),
                    "Anulare cerere concediu #" + request.getLeaveRequestId(),
                    "Cererea de concediu din perioada " + request.getStartDate() + " - " + request.getEndDate() + " a fost anulata.",
                    "CANCELLED"
            );
        }

        return convertToDto(updated);
    }

    public List<DepartmentOverlapDto> getDepartmentOverlapAnalysis(Integer deptId, LocalDate startDate, LocalDate endDate) {
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new IllegalArgumentException("Departament inexistent: " + deptId));

        List<Employee> deptEmployees = employeeRepository.findByDeptId(deptId);
        List<Integer> emplIds = deptEmployees.stream().map(Employee::getEmplId).collect(Collectors.toList());

        Map<Integer, String> emplNameMap = deptEmployees.stream()
                .collect(Collectors.toMap(Employee::getEmplId, Employee::getName));

        List<LeaveRequest> overlapping = emplIds.isEmpty()
                ? Collections.emptyList()
                : leaveRequestRepository.findOverlappingRequests(emplIds, startDate, endDate);

        List<DepartmentOverlapDto> analysis = new ArrayList<>();
        LocalDate curr = startDate;

        while (!curr.isAfter(endDate)) {
            final LocalDate date = curr;
            boolean isWorkDay = workingDaysCalculator.isWorkingDay(date);
            List<String> absentNames = new ArrayList<>();

            for (LeaveRequest req : overlapping) {
                if (!date.isBefore(req.getStartDate()) && !date.isAfter(req.getEndDate())) {
                    String name = emplNameMap.getOrDefault(req.getEmplId(), "Angajat #" + req.getEmplId());
                    if (!absentNames.contains(name)) {
                        absentNames.add(name);
                    }
                }
            }

            // Excludem weekendurile si sarbatorile legale din avertismentele de depasire a limitei
            boolean limitExceeded = isWorkDay && (absentNames.size() > dept.getMaxAbsentEmployees());
            analysis.add(new DepartmentOverlapDto(date, absentNames.size(), dept.getMaxAbsentEmployees(), limitExceeded, absentNames));

            curr = curr.plusDays(1);
        }

        return analysis;
    }

    public List<LeaveWorkflow> getWorkflowHistory(Integer leaveRequestId) {
        LeaveRequestDto request = getRequestById(leaveRequestId); // enforces read access check
        return leaveWorkflowRepository.findByLeaveRequestIdOrderByChangedAtAsc(request.getLeaveRequestId());
    }

    private void recordWorkflow(Integer requestId, Integer emplId, String oldStatus, String currentStatus, String comment) {
        LeaveWorkflow wf = new LeaveWorkflow();
        wf.setLeaveRequestId(requestId);
        wf.setEmplId(emplId);
        wf.setOldStatus(oldStatus);
        wf.setCurrentStatus(currentStatus);
        wf.setChangedAt(LocalDateTime.now());
        wf.setComment(comment);
        leaveWorkflowRepository.save(wf);
    }

    private void notifyDepartmentManager(Employee employee, LeaveRequest request, LeaveType leaveType) {
        if (employee == null || request == null || leaveType == null) {
            return;
        }

        if (employee.getDeptId() != null) {
            Department dept = departmentRepository.findById(employee.getDeptId()).orElse(null);
            if (dept != null && dept.getManagerId() != null) {
                Employee manager = employeeRepository.findById(dept.getManagerId()).orElse(null);
                if (manager != null && manager.getEmail() != null) {
                    notificationService.sendDemoEmail(
                            manager.getEmail(),
                            manager.getName(),
                            "Cerere noua de la " + employee.getName(),
                            "Angajatul " + employee.getName() + " a trimis o cerere de concediu (" + leaveType.getName() +
                                    ") pentru perioada " + request.getStartDate() + " - " + request.getEndDate() +
                                    " (" + request.getWorkingDays() + " zile lucratoare). Va rugam sa o analizati.",
                            "SUBMITTED"
                    );
                    return;
                }
            }
        }

        // Fallback: daca angajatul nu are departament sau manager alocat, notificam administratorii
        employeeRepository.findAll().stream()
                .filter(e -> e.getRole() != null && (e.getRole().equalsIgnoreCase("ADMIN") || e.getRole().equalsIgnoreCase("ROLE_ADMIN")))
                .filter(admin -> admin.getEmail() != null && !admin.getEmail().isBlank())
                .forEach(admin -> {
                    notificationService.sendDemoEmail(
                            admin.getEmail(),
                            admin.getName(),
                            "Cerere noua de la " + employee.getName() + " (Fara manager direct)",
                            "Angajatul " + employee.getName() + " (fara departament sau manager direct alocat) a trimis o cerere de concediu (" + leaveType.getName() +
                                    ") pentru perioada " + request.getStartDate() + " - " + request.getEndDate() +
                                    " (" + request.getWorkingDays() + " zile lucratoare). Va rugam sa o analizati.",
                            "SUBMITTED"
                    );
                });
    }

    public LeaveRequestDto convertToDto(LeaveRequest req) {
        Employee empl = employeeRepository.findById(req.getEmplId()).orElse(null);
        Department dept = (empl != null && empl.getDeptId() != null) ? departmentRepository.findById(empl.getDeptId()).orElse(null) : null;
        LeaveType type = leaveTypeRepository.findById(req.getLeaveTypeId()).orElse(null);

        String rejectionReason = null;
        if ("REJECTED".equalsIgnoreCase(req.getStatus())) {
            List<LeaveWorkflow> workflows = leaveWorkflowRepository.findByLeaveRequestIdOrderByChangedAtAsc(req.getLeaveRequestId());
            for (int i = workflows.size() - 1; i >= 0; i--) {
                LeaveWorkflow wf = workflows.get(i);
                if ("REJECTED".equalsIgnoreCase(wf.getCurrentStatus()) && wf.getComment() != null) {
                    rejectionReason = wf.getComment();
                    break;
                }
            }
        }

        List<Attachment> attachments = attachmentRepository.findByLeaveRequestId(req.getLeaveRequestId());
        Integer attachmentId = null;
        String attachmentName = null;
        if (attachments != null && !attachments.isEmpty()) {
            attachmentId = attachments.get(0).getAttachmentId();
            attachmentName = attachments.get(0).getFileName();
        }

        return new LeaveRequestDto(
                req.getLeaveRequestId(),
                req.getEmplId(),
                empl != null ? empl.getName() : "Necunoscut",
                empl != null ? empl.getEmail() : "",
                dept != null ? dept.getDeptId() : null,
                dept != null ? dept.getDepartmentName() : "N/A",
                (dept != null && dept.getDepartmentNameEn() != null && !dept.getDepartmentNameEn().isBlank()) ? dept.getDepartmentNameEn() : (dept != null ? dept.getDepartmentName() : "N/A"),
                req.getLeaveTypeId(),
                type != null ? type.getName() : "N/A",
                (type != null && type.getNameEn() != null && !type.getNameEn().isBlank()) ? type.getNameEn() : (type != null ? type.getName() : "N/A"),
                type != null ? type.getCode() : "N/A",
                type != null ? type.getRequiresAttachment() : false,
                req.getStartDate(),
                req.getEndDate(),
                req.getWorkingDays(),
                req.getStatus(),
                rejectionReason,
                attachmentId,
                attachmentName,
                req.getCreatedAt()
        );
    }

    private void validateNoOverlapForEmployee(Integer emplId, LocalDate startDate, LocalDate endDate, Integer currentRequestId) {
        List<LeaveRequest> overlaps = leaveRequestRepository.findEmployeeOverlappingRequests(emplId, startDate, endDate);
        for (LeaveRequest r : overlaps) {
            if (currentRequestId == null || !r.getLeaveRequestId().equals(currentRequestId)) {
                throw new IllegalArgumentException("Aveti deja o cerere de concediu activa (" + r.getStatus() + 
                        ") in perioada " + r.getStartDate() + " - " + r.getEndDate() + " (Cerere #" + r.getLeaveRequestId() + ")!");
            }
        }
    }
}
