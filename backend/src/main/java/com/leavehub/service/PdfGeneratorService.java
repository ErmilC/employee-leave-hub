package com.leavehub.service;

import com.leavehub.dto.LeaveRequestDto;
import com.leavehub.entity.Department;
import com.leavehub.entity.Employee;
import com.leavehub.entity.LeaveType;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PdfGeneratorService {

    private static final Color TEXT_DARK = new Color(0, 0, 0);
    private static final Color TEXT_MUTED = new Color(100, 100, 100);
    private static final Color BORDER_COLOR = new Color(210, 210, 210);

    public byte[] generateLeaveRequestPdf(LeaveRequestDto leaveRequest, Employee employee, LeaveType leaveType, Department department) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 45, 45, 45, 45);
            PdfWriter.getInstance(document, out);
            document.open();

            // Header Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, TEXT_DARK);
            Paragraph title = new Paragraph("CERERE DE CONCEDIU", titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(4);
            document.add(title);

            // Subtitle / Info
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT_MUTED);
            Paragraph sub = new Paragraph("ID Cerere: #" + leaveRequest.getLeaveRequestId() + "  |  Data: " +
                    (leaveRequest.getCreatedAt() != null ? leaveRequest.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "-"), subTitleFont);
            sub.setAlignment(Element.ALIGN_LEFT);
            sub.setSpacingAfter(20);
            document.add(sub);

            // Table of Details
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setSpacingBefore(5);
            table.setSpacingAfter(25);
            table.setWidths(new float[]{35f, 65f});

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, TEXT_DARK);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT_DARK);

            addTableRow(table, "Nume Angajat:", employee != null ? sanitizeText(employee.getName()) : "N/A", headerFont, bodyFont);
            addTableRow(table, "Email:", employee != null ? employee.getEmail() : "N/A", headerFont, bodyFont);
            addTableRow(table, "Departament:", department != null ? sanitizeText(department.getDepartmentName()) : "N/A", headerFont, bodyFont);
            addTableRow(table, "Tip Concediu:", leaveType != null ? sanitizeText(leaveType.getName()) + " (" + leaveType.getCode() + ")" : "N/A", headerFont, bodyFont);
            addTableRow(table, "Perioada Solicitata:", leaveRequest.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " - " +
                    leaveRequest.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), headerFont, bodyFont);
            addTableRow(table, "Zile Lucratoare:", leaveRequest.getWorkingDays() + " zile", headerFont, bodyFont);
            addTableRow(table, "Status Cerere:", leaveRequest.getStatus(), headerFont, bodyFont);

            if (leaveRequest.getAttachmentName() != null && !leaveRequest.getAttachmentName().isBlank()) {
                addTableRow(table, "Document Atasat:", sanitizeText(leaveRequest.getAttachmentName()), headerFont, bodyFont);
            }

            if (leaveRequest.getRejectionReason() != null && !leaveRequest.getRejectionReason().isBlank()) {
                addTableRow(table, "Motiv Respingere:", sanitizeText(leaveRequest.getRejectionReason()), headerFont, bodyFont);
            }

            document.add(table);

            // Signatures block
            Paragraph sigBlock = new Paragraph("\n\n", bodyFont);
            document.add(sigBlock);

            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            sigTable.setWidths(new float[]{50f, 50f});

            PdfPCell c1 = new PdfPCell(new Phrase("Semnatura Angajat:\n\n___________________________", bodyFont));
            c1.setBorder(Rectangle.NO_BORDER);
            c1.setHorizontalAlignment(Element.ALIGN_LEFT);

            PdfPCell c2 = new PdfPCell(new Phrase("Aprobat:\n\n___________________________", bodyFont));
            c2.setBorder(Rectangle.NO_BORDER);
            c2.setHorizontalAlignment(Element.ALIGN_LEFT);

            sigTable.addCell(c1);
            sigTable.addCell(c2);
            document.add(sigTable);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Eroare la generarea documentului PDF pentru cererea de concediu", e);
        }
    }

    public byte[] generateDepartmentReportPdf(Department dept, List<LeaveRequestDto> requests, List<Employee> employees) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 35, 35, 35, 35);
            PdfWriter.getInstance(document, out);
            document.open();

            boolean isAllDepts = (dept == null || dept.getDeptId() == null || dept.getDeptId() == 0);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, TEXT_DARK);
            Paragraph title = new Paragraph(
                    isAllDepts ? "RAPORT CONCEDII: TOATE DEPARTAMENTELE (GENERAL)" : "RAPORT CONCEDII DEPARTAMENT: " + sanitizeText(dept.getDepartmentName().toUpperCase()),
                    titleFont
            );
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(4);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_MUTED);
            String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            String subInfo = isAllDepts
                    ? "Data generare: " + nowStr + "  |  Departament: Toate  |  Total cereri: " + requests.size()
                    : "Data generare: " + nowStr + "  |  Limita max. absenti simultan: " + (dept.getMaxAbsentEmployees() != null ? dept.getMaxAbsentEmployees() : 2) + " angajati  |  Total cereri: " + requests.size();
            Paragraph sub = new Paragraph(subInfo, subFont);
            sub.setAlignment(Element.ALIGN_LEFT);
            sub.setSpacingAfter(15);
            document.add(sub);

            // Details Table
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{8f, 22f, 18f, 13f, 13f, 10f, 16f});

            Font thFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
            Font tdFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);

            addHeaderCell(table, "ID", thFont);
            addHeaderCell(table, "Angajat", thFont);
            addHeaderCell(table, "Tip Concediu", thFont);
            addHeaderCell(table, "Data Inceput", thFont);
            addHeaderCell(table, "Data Sfarsit", thFont);
            addHeaderCell(table, "Zile", thFont);
            addHeaderCell(table, "Status", thFont);

            DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            for (LeaveRequestDto r : requests) {
                addBodyCell(table, "#" + r.getLeaveRequestId(), tdFont);
                addBodyCell(table, sanitizeText(r.getEmployeeName()), tdFont);
                addBodyCell(table, sanitizeText(r.getLeaveTypeName()) + " (" + r.getLeaveTypeCode() + ")", tdFont);
                addBodyCell(table, r.getStartDate() != null ? r.getStartDate().format(df) : "-", tdFont);
                addBodyCell(table, r.getEndDate() != null ? r.getEndDate().format(df) : "-", tdFont);
                addBodyCell(table, String.valueOf(r.getWorkingDays()), tdFont);
                addBodyCell(table, r.getStatus(), tdFont);
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Eroare la generarea raportului de departament PDF", e);
        }
    }

    public byte[] generateBalancesReportPdf(List<Employee> employees, List<Department> departments) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, TEXT_DARK);
            Paragraph title = new Paragraph("SITUATIA SOLDURILOR DE CONCEDIU", titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(4);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_MUTED);
            String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            Paragraph sub = new Paragraph("Data raport: " + nowStr + "  |  Total Angajati: " + employees.size(), subFont);
            sub.setAlignment(Element.ALIGN_LEFT);
            sub.setSpacingAfter(15);
            document.add(sub);

            Map<Integer, String> deptMap = departments.stream()
                    .collect(Collectors.toMap(Department::getDeptId, Department::getDepartmentName, (a, b) -> a));

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{10f, 26f, 24f, 13f, 13f, 14f});

            Font thFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
            Font tdFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);

            addHeaderCell(table, "ID", thFont);
            addHeaderCell(table, "Nume Angajat", thFont);
            addHeaderCell(table, "Departament", thFont);
            addHeaderCell(table, "Anual", thFont);
            addHeaderCell(table, "Disponibil", thFont);
            addHeaderCell(table, "Consumat", thFont);

            for (Employee emp : employees) {
                int annual = emp.getAnnualLeaveDays() != null ? emp.getAnnualLeaveDays() : 0;
                int avail = emp.getAvailableLeaveDays() != null ? emp.getAvailableLeaveDays() : 0;
                int used = Math.max(0, annual - avail);

                addBodyCell(table, "#" + emp.getEmplId(), tdFont);
                addBodyCell(table, sanitizeText(emp.getName()), tdFont);
                addBodyCell(table, sanitizeText(deptMap.getOrDefault(emp.getDeptId(), "N/A")), tdFont);
                addBodyCell(table, String.valueOf(annual), tdFont);
                addBodyCell(table, String.valueOf(avail), tdFont);
                addBodyCell(table, String.valueOf(used), tdFont);
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Eroare la generarea raportului de solduri PDF", e);
        }
    }

    public byte[] generatePendingRequestsReportPdf(List<LeaveRequestDto> pendingRequests) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, TEXT_DARK);
            Paragraph title = new Paragraph("CERERI DE CONCEDIU IN ASTEPTARE (PENDING)", titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(4);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_MUTED);
            String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            Paragraph sub = new Paragraph("Data raport: " + nowStr + "  |  Total cereri in asteptare: " + pendingRequests.size(), subFont);
            sub.setAlignment(Element.ALIGN_LEFT);
            sub.setSpacingAfter(15);
            document.add(sub);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{10f, 24f, 22f, 18f, 14f, 12f});

            Font thFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
            Font tdFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);

            addHeaderCell(table, "ID", thFont);
            addHeaderCell(table, "Angajat", thFont);
            addHeaderCell(table, "Departament", thFont);
            addHeaderCell(table, "Tip Concediu", thFont);
            addHeaderCell(table, "Perioada", thFont);
            addHeaderCell(table, "Zile Lucr.", thFont);

            DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            for (LeaveRequestDto r : pendingRequests) {
                String period = (r.getStartDate() != null ? r.getStartDate().format(df) : "") + " - " +
                        (r.getEndDate() != null ? r.getEndDate().format(df) : "");

                addBodyCell(table, "#" + r.getLeaveRequestId(), tdFont);
                addBodyCell(table, sanitizeText(r.getEmployeeName()), tdFont);
                addBodyCell(table, sanitizeText(r.getDepartmentName()), tdFont);
                addBodyCell(table, sanitizeText(r.getLeaveTypeName()) + " (" + r.getLeaveTypeCode() + ")", tdFont);
                addBodyCell(table, period, tdFont);
                addBodyCell(table, String.valueOf(r.getWorkingDays()), tdFont);
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Eroare la generarea raportului de cereri in asteptare PDF", e);
        }
    }

    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell1 = new PdfPCell(new Phrase(label, labelFont));
        cell1.setPadding(6);
        cell1.setBorderColor(BORDER_COLOR);

        PdfPCell cell2 = new PdfPCell(new Phrase(value != null ? value : "-", valueFont));
        cell2.setPadding(6);
        cell2.setBorderColor(BORDER_COLOR);

        table.addCell(cell1);
        table.addCell(cell2);
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6);
        cell.setBorderColor(BORDER_COLOR);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", font));
        cell.setPadding(5);
        cell.setBorderColor(BORDER_COLOR);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private String sanitizeText(String input) {
        if (input == null) return "";
        return input
                .replace("\u0103", "a").replace("\u00E2", "a").replace("\u00EE", "i").replace("\u0219", "s").replace("\u015F", "s").replace("\u021B", "t").replace("\u0163", "t")
                .replace("\u0102", "A").replace("\u00C2", "A").replace("\u00CE", "I").replace("\u0218", "S").replace("\u015E", "S").replace("\u021A", "T").replace("\u0162", "T");
    }
}
