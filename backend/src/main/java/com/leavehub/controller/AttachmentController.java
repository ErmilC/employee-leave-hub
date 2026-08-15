package com.leavehub.controller;

import com.leavehub.config.SecurityUtils;
import com.leavehub.entity.Attachment;
import com.leavehub.entity.Employee;
import com.leavehub.entity.LeaveRequest;
import com.leavehub.repository.AttachmentRepository;
import com.leavehub.repository.EmployeeRepository;
import com.leavehub.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final SecurityUtils securityUtils;
    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "doc", "docx"
    );

    @GetMapping("/leave-request/{leaveRequestId}")
    public ResponseEntity<List<Attachment>> getAttachmentsByLeaveRequest(@PathVariable Integer leaveRequestId) {
        LeaveRequest request = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Cererea nu exista: " + leaveRequestId));

        checkAccessToRequest(request);
        return ResponseEntity.ok(attachmentRepository.findByLeaveRequestId(leaveRequestId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Attachment> getAttachmentById(@PathVariable Integer id) {
        Attachment attachment = attachmentRepository.findById(id)
                .orElse(null);
        if (attachment == null) {
            return ResponseEntity.notFound().build();
        }

        LeaveRequest request = leaveRequestRepository.findById(attachment.getLeaveRequestId()).orElse(null);
        if (request != null) {
            checkAccessToRequest(request);
        }

        return ResponseEntity.ok(attachment);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadAttachment(
            @RequestParam("leaveRequestId") Integer leaveRequestId,
            @RequestParam("file") MultipartFile file) {

        LeaveRequest request = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Cererea nu exista: " + leaveRequestId));

        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
            throw new AccessDeniedException("Nu puteti adauga fisiere la cererea altui angajat.");
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fisierul incarcat este gol.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body("Dimensiunea fisierului depaseste limita maxima permisa de 10 MB.");
        }

        String rawName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String originalName = Paths.get(rawName).getFileName().toString();

        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex == -1 || dotIndex == originalName.length() - 1) {
            return ResponseEntity.badRequest().body("Fisierul nu are o extensie valida.");
        }

        String extension = originalName.substring(dotIndex + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.badRequest().body("Tip de fisier nepermis! Sunt acceptate doar fisiere: PDF, PNG, JPG, JPEG, DOC, DOCX.");
        }

        try {
            Path uploadRoot = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
            if (!Files.exists(uploadRoot)) {
                Files.createDirectories(uploadRoot);
            }

            String sanitized = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            String savedFileName = UUID.randomUUID().toString() + "_" + sanitized;
            Path targetPath = uploadRoot.resolve(savedFileName).normalize();

            if (!targetPath.startsWith(uploadRoot)) {
                return ResponseEntity.badRequest().body("Nume de fisier invalid.");
            }

            Files.write(targetPath, file.getBytes());

            Attachment attachment = new Attachment(
                    null,
                    leaveRequestId,
                    originalName,
                    targetPath.toString(),
                    LocalDateTime.now()
            );

            Attachment saved = attachmentRepository.save(attachment);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Eroare la salvarea fisierului pe server: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Integer id) {
        Attachment attachment = attachmentRepository.findById(id).orElse(null);
        if (attachment == null) {
            return ResponseEntity.notFound().build();
        }

        LeaveRequest request = leaveRequestRepository.findById(attachment.getLeaveRequestId()).orElse(null);
        if (request != null) {
            checkAccessToRequest(request);
        }

        try {
            Path uploadRoot = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
            Path path = Paths.get(attachment.getFilePath()).toAbsolutePath().normalize();

            byte[] data;
            if (path.startsWith(uploadRoot) && Files.exists(path)) {
                data = Files.readAllBytes(path);
            } else {
                data = ("Document demonstrativ: " + attachment.getFileName()).getBytes();
            }

            ByteArrayResource resource = new ByteArrayResource(data);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFileName() + "\"")
                    .body((Resource) resource);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<Resource>build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Integer id) {
        Attachment attachment = attachmentRepository.findById(id).orElse(null);
        if (attachment == null) {
            return ResponseEntity.notFound().build();
        }

        LeaveRequest request = leaveRequestRepository.findById(attachment.getLeaveRequestId()).orElse(null);
        if (request != null) {
            Employee current = securityUtils.getCurrentEmployee();
            if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
                throw new AccessDeniedException("Nu aveti permisiunea de a sterge acest atasament.");
            }
            if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
                Employee requester = employeeRepository.findById(request.getEmplId()).orElse(null);
                if (requester != null && !Objects.equals(current.getDeptId(), requester.getDeptId())) {
                    throw new AccessDeniedException("Nu puteti sterge atasamente din alt departament.");
                }
            }
        }

        // Delete physical file from filesystem
        if (attachment.getFilePath() != null && !attachment.getFilePath().isBlank()) {
            try {
                Path uploadRoot = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
                Path filePath = Paths.get(attachment.getFilePath()).toAbsolutePath().normalize();
                if (filePath.startsWith(uploadRoot) && Files.exists(filePath)) {
                    Files.deleteIfExists(filePath);
                }
            } catch (IOException ignored) {
                // Ignore or log if file cannot be deleted
            }
        }

        attachmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void checkAccessToRequest(LeaveRequest request) {
        Employee current = securityUtils.getCurrentEmployee();
        if ("USER".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
            throw new AccessDeniedException("Acces neautorizat la atasamentele acestei cereri.");
        }
        if ("DEPT_RESP".equalsIgnoreCase(current.getRole()) && !current.getEmplId().equals(request.getEmplId())) {
            Employee requester = employeeRepository.findById(request.getEmplId()).orElse(null);
            if (requester != null && !Objects.equals(current.getDeptId(), requester.getDeptId())) {
                throw new AccessDeniedException("Nu puteti accesa atasamente din alt departament.");
            }
        }
    }
}
