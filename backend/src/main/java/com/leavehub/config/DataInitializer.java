package com.leavehub.config;

import com.leavehub.entity.*;
import com.leavehub.repository.*;
import com.leavehub.service.WorkingDaysCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveWorkflowRepository leaveWorkflowRepository;
    private final AttachmentRepository attachmentRepository;
    private final WorkingDaysCalculator workingDaysCalculator;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed / Ensure Departments (Bilingual RO / EN)
        Department itDept;
        Department hrDept;
        Department salesDept;

        if (departmentRepository.count() == 0) {
            itDept = departmentRepository.save(new Department(null, "IT & Software Development", "IT & Software Development", null, 2));
            hrDept = departmentRepository.save(new Department(null, "Resurse Umane", "Human Resources", null, 1));
            salesDept = departmentRepository.save(new Department(null, "Vanzari & Marketing", "Sales & Marketing", null, 2));
        } else {
            itDept = departmentRepository.findAll().stream().findFirst().orElse(null);
            hrDept = itDept;
            salesDept = itDept;
        }

        // 2. Seed / Ensure Leave Types (Bilingual RO / EN)
        LeaveType coType;
        LeaveType cmType;
        LeaveType fpType;
        LeaveType specType;

        if (leaveTypeRepository.count() == 0) {
            coType = leaveTypeRepository.save(new LeaveType(null, "Concediu de odihna", "Annual Leave", "CO", false, true));
            cmType = leaveTypeRepository.save(new LeaveType(null, "Concediu medical", "Medical Leave", "CM", true, true));
            fpType = leaveTypeRepository.save(new LeaveType(null, "Concediu fara plata", "Unpaid Leave", "FP", false, false));
            specType = leaveTypeRepository.save(new LeaveType(null, "Evenimente speciale", "Special Events", "SPECIAL", true, true));
        } else {
            coType = leaveTypeRepository.findAll().stream().filter(t -> "CO".equalsIgnoreCase(t.getCode())).findFirst().orElse(null);
            cmType = leaveTypeRepository.findAll().stream().filter(t -> "CM".equalsIgnoreCase(t.getCode())).findFirst().orElse(null);
            specType = leaveTypeRepository.findAll().stream().filter(t -> "SPECIAL".equalsIgnoreCase(t.getCode())).findFirst().orElse(null);
        }

        // 3. Seed / Ensure Employees with BCrypt encoded passwords
        String defaultPasswordHash = passwordEncoder.encode("password");

        Employee managerIT = employeeRepository.findByEmail("alex.popescu@test.ro").orElse(null);
        if (managerIT == null) {
            managerIT = employeeRepository.save(new Employee(null, "Alexandru Popescu", "alex.popescu@test.ro", defaultPasswordHash, "DEPT_RESP", itDept != null ? itDept.getDeptId() : null, 25, 20));
        } else if (managerIT.getPassword() == null || !managerIT.getPassword().startsWith("$2")) {
            managerIT.setPassword(defaultPasswordHash);
            employeeRepository.save(managerIT);
        }

        Employee dev1 = employeeRepository.findByEmail("elena.ionescu@test.ro").orElse(null);
        if (dev1 == null) {
            dev1 = employeeRepository.save(new Employee(null, "Elena Ionescu", "elena.ionescu@test.ro", defaultPasswordHash, "USER", itDept != null ? itDept.getDeptId() : null, 24, 18));
        } else if (dev1.getPassword() == null || !dev1.getPassword().startsWith("$2")) {
            dev1.setPassword(defaultPasswordHash);
            employeeRepository.save(dev1);
        }

        Employee dev2 = employeeRepository.findByEmail("mihai.radu@test.ro").orElse(null);
        if (dev2 == null) {
            dev2 = employeeRepository.save(new Employee(null, "Mihai Radu", "mihai.radu@test.ro", defaultPasswordHash, "USER", itDept != null ? itDept.getDeptId() : null, 21, 18));
        } else if (dev2.getPassword() == null || !dev2.getPassword().startsWith("$2")) {
            dev2.setPassword(defaultPasswordHash);
            employeeRepository.save(dev2);
        }

        Employee admin = employeeRepository.findByEmail("admin@test.ro").orElse(null);
        if (admin == null) {
            admin = employeeRepository.save(new Employee(null, "Ana Maria Stan", "admin@test.ro", defaultPasswordHash, "ADMIN", hrDept != null ? hrDept.getDeptId() : null, 25, 22));
        } else if (admin.getPassword() == null || !admin.getPassword().startsWith("$2")) {
            admin.setPassword(defaultPasswordHash);
            employeeRepository.save(admin);
        }

        // Set manager ID
        if (itDept != null && itDept.getManagerId() == null) {
            itDept.setManagerId(managerIT.getEmplId());
            departmentRepository.save(itDept);
        }

        if (hrDept != null && hrDept.getManagerId() == null) {
            hrDept.setManagerId(admin.getEmplId());
            departmentRepository.save(hrDept);
        }

        // 4. Seed Sample Leave Requests if none exist
        if (leaveRequestRepository.count() == 0 && coType != null && cmType != null && specType != null) {
            LocalDate req1Start = LocalDate.now().plusDays(5);
            LocalDate req1End = LocalDate.now().plusDays(9);
            int req1Days = workingDaysCalculator.calculateWorkingDays(req1Start, req1End);
            LeaveRequest req1 = leaveRequestRepository.save(new LeaveRequest(null, dev1.getEmplId(), coType.getLeaveTypeId(),
                    req1Start, req1End, req1Days, "PENDING", LocalDateTime.now()));
            recordWorkflow(req1.getLeaveRequestId(), dev1.getEmplId(), null, "PENDING", "Cerere creata in sistem.");

            LocalDate req2Start = LocalDate.now().minusDays(10);
            LocalDate req2End = LocalDate.now().minusDays(8);
            int req2Days = workingDaysCalculator.calculateWorkingDays(req2Start, req2End);
            LeaveRequest req2 = leaveRequestRepository.save(new LeaveRequest(null, dev2.getEmplId(), cmType.getLeaveTypeId(),
                    req2Start, req2End, req2Days, "APPROVED", LocalDateTime.now()));
            recordWorkflow(req2.getLeaveRequestId(), dev2.getEmplId(), null, "APPROVED", "Cerere aprobata.");
            attachmentRepository.save(new Attachment(null, req2.getLeaveRequestId(), "adeverinta_medicala.pdf", "/uploads/adeverinta_medicala.pdf", LocalDateTime.now()));

            LocalDate req3Start = LocalDate.now().plusDays(20);
            LocalDate req3End = LocalDate.now().plusDays(21);
            int req3Days = workingDaysCalculator.calculateWorkingDays(req3Start, req3End);
            LeaveRequest req3 = leaveRequestRepository.save(new LeaveRequest(null, dev1.getEmplId(), specType.getLeaveTypeId(),
                    req3Start, req3End, req3Days, "PENDING", LocalDateTime.now()));
            recordWorkflow(req3.getLeaveRequestId(), dev1.getEmplId(), null, "PENDING", "Cerere creata in sistem.");
            attachmentRepository.save(new Attachment(null, req3.getLeaveRequestId(), "certificat_casatorie.pdf", "/uploads/certificat_casatorie.pdf", LocalDateTime.now()));
        } else {
            // Update existing demo attachment name if it was previously seeded as adeverinta_medica.pdf
            attachmentRepository.findAll().forEach(att -> {
                if ("adeverinta_medica.pdf".equalsIgnoreCase(att.getFileName())) {
                    att.setFileName("adeverinta_medicala.pdf");
                    att.setFilePath("/uploads/adeverinta_medicala.pdf");
                    attachmentRepository.save(att);
                }
            });
        }

        System.out.println(">>> DataInitializer: Datele demo au fost populate cu succes in Baza de Date!");
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
}
