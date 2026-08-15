import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, Department, LeaveType, LeaveRequest, LeaveWorkflow, DemoEmail } from '../models/leave.model';

declare var window: any;

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private apiUrl = (typeof window !== 'undefined' && window.location.port === '4200' && window.location.hostname === 'localhost')
    ? 'http://localhost:8080/api'
    : '/api';

  // Fixed Romanian Public Holidays (MM-DD) with descriptions in RO and EN
  private readonly fixedHolidayDefinitions: Array<{ monthDay: string; nameRo: string; nameEn: string }> = [
    { monthDay: '01-01', nameRo: 'Anul Nou', nameEn: "New Year's Day" },
    { monthDay: '01-02', nameRo: 'Anul Nou (A doua zi)', nameEn: "Day after New Year's Day" },
    { monthDay: '01-06', nameRo: 'Boboteaza (Botezul Domnului)', nameEn: 'Epiphany' },
    { monthDay: '01-07', nameRo: 'Sfântul Ioan Botezătorul', nameEn: 'St. John the Baptist' },
    { monthDay: '01-24', nameRo: 'Ziua Unirii Principatelor Române', nameEn: 'Union of Romanian Principalities' },
    { monthDay: '05-01', nameRo: 'Ziua Muncii', nameEn: 'Labour Day' },
    { monthDay: '06-01', nameRo: 'Ziua Copilului', nameEn: "Children's Day" },
    { monthDay: '08-15', nameRo: 'Adormirea Maicii Domnului (Sf. Maria)', nameEn: 'Dormition of the Theotokos' },
    { monthDay: '11-30', nameRo: 'Sfântul Apostol Andrei', nameEn: "St. Andrew's Day" },
    { monthDay: '12-01', nameRo: 'Ziua Națională a României', nameEn: 'National Day of Romania' },
    { monthDay: '12-25', nameRo: 'Crăciunul (Prima zi)', nameEn: 'Christmas Day' },
    { monthDay: '12-26', nameRo: 'Crăciunul (A doua zi)', nameEn: 'Second Day of Christmas' }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Calculates mobile Orthodox Easter holidays for ANY given Gregorian year:
   * - Vinerea Mare (Good Friday = Easter - 2 days)
   * - Paștele Ortodox (Easter Sunday)
   * - Lunea Paștelui / A doua zi de Paști (Easter Monday = Easter + 1 day)
   * - Rusaliile (Pentecost Sunday = Easter + 49 days)
   * - Lunea Rusaliilor / A doua zi de Rusalii (Pentecost Monday = Easter + 50 days)
   */
  public getOrthodoxEasterDates(year: number): Array<{ date: string; nameRo: string; nameEn: string }> {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;

    // Julian date converted to Gregorian (+13 days for 1900-2099)
    const julianDate = new Date(year, month - 1, day, 12, 0, 0);
    const orthodoxEaster = new Date(julianDate.getTime() + 13 * 24 * 60 * 60 * 1000);

    const formatDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    const goodFriday = new Date(orthodoxEaster.getTime() - 2 * 24 * 60 * 60 * 1000);
    const easterMonday = new Date(orthodoxEaster.getTime() + 1 * 24 * 60 * 60 * 1000);
    const pentecostSunday = new Date(orthodoxEaster.getTime() + 49 * 24 * 60 * 60 * 1000);
    const pentecostMonday = new Date(orthodoxEaster.getTime() + 50 * 24 * 60 * 60 * 1000);

    return [
      { date: formatDate(goodFriday), nameRo: 'Vinerea Mare', nameEn: 'Good Friday' },
      { date: formatDate(orthodoxEaster), nameRo: 'Paștele Ortodox (Prima zi)', nameEn: 'Orthodox Easter Sunday' },
      { date: formatDate(easterMonday), nameRo: 'A doua zi de Paști (Lunea Paștelui)', nameEn: 'Easter Monday' },
      { date: formatDate(pentecostSunday), nameRo: 'Rusaliile (Prima zi)', nameEn: 'Pentecost Sunday' },
      { date: formatDate(pentecostMonday), nameRo: 'A doua zi de Rusalii (Lunea Rusaliilor)', nameEn: 'Pentecost Monday' }
    ];
  }

  public getOrthodoxEasterHolidays(year: number): Set<string> {
    const dates = this.getOrthodoxEasterDates(year);
    return new Set(dates.map(d => d.date));
  }

  /**
   * Returns holiday name if the date is a legal public holiday in Romania, otherwise null.
   */
  getHolidayName(dateStr: string, lang: 'ro' | 'en' = 'ro'): string | null {
    if (!dateStr || dateStr.length < 10) return null;
    const cleanDate = dateStr.substring(0, 10);
    const parts = cleanDate.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
    const [year, month, day] = parts;

    const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const normalizedDate = `${year}-${monthDay}`;

    // 1. Check fixed holidays
    const fixed = this.fixedHolidayDefinitions.find(f => f.monthDay === monthDay);
    if (fixed) {
      return lang === 'en' ? fixed.nameEn : fixed.nameRo;
    }

    // 2. Check mobile Easter holidays
    const mobileDates = this.getOrthodoxEasterDates(year);
    const mobile = mobileDates.find(m => m.date === normalizedDate);
    if (mobile) {
      return lang === 'en' ? mobile.nameEn : mobile.nameRo;
    }

    return null;
  }

  /**
   * Checks whether a given date is a Romanian legal public holiday in ANY year.
   */
  isHoliday(dateStr: string): boolean {
    return this.getHolidayName(dateStr) !== null;
  }

  /**
   * Returns a complete, sorted list of all Romanian legal holidays for the specified year.
   */
  getAllHolidaysForYear(year: number, lang: 'ro' | 'en' = 'ro'): Array<{ date: string; name: string; isMobile: boolean; dayOfWeekName: string }> {
    const list: Array<{ date: string; name: string; isMobile: boolean; dayOfWeekName: string }> = [];

    const roDays = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Add fixed holidays
    this.fixedHolidayDefinitions.forEach(f => {
      const dateStr = `${year}-${f.monthDay}`;
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayIndex = new Date(y, m - 1, d, 12, 0, 0).getDay();
      list.push({
        date: dateStr,
        name: lang === 'en' ? f.nameEn : f.nameRo,
        isMobile: false,
        dayOfWeekName: lang === 'en' ? enDays[dayIndex] : roDays[dayIndex]
      });
    });

    // Add mobile Easter holidays
    const mobileDates = this.getOrthodoxEasterDates(year);
    mobileDates.forEach(m => {
      const [y, mon, d] = m.date.split('-').map(Number);
      const dayIndex = new Date(y, mon - 1, d, 12, 0, 0).getDay();
      list.push({
        date: m.date,
        name: lang === 'en' ? m.nameEn : m.nameRo,
        isMobile: true,
        dayOfWeekName: lang === 'en' ? enDays[dayIndex] : roDays[dayIndex]
      });
    });

    // Sort chronologically by date
    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }

  calculateWorkingDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const s = startDate.substring(0, 10);
    const e = endDate.substring(0, 10);
    if (e < s) return 0;

    const [sY, sM, sD] = s.split('-').map(Number);
    const [eY, eM, eD] = e.split('-').map(Number);

    let cur = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);

    let count = 0;
    while (cur.getTime() <= end.getTime()) {
      const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
      const curStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !this.isHoliday(curStr)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // Employee API
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees`);
  }


  saveEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/employees`, employee);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/employees/${id}`, employee);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/employees/${id}`);
  }

  // Department API
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments`);
  }

  saveDepartment(department: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.apiUrl}/departments`, department);
  }

  updateDepartment(id: number, department: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/departments/${id}`, department);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departments/${id}`);
  }

  // Leave Type API
  getLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(`${this.apiUrl}/leave-types`);
  }

  saveLeaveType(leaveType: Partial<LeaveType>): Observable<LeaveType> {
    return this.http.post<LeaveType>(`${this.apiUrl}/leave-types`, leaveType);
  }

  updateLeaveType(id: number, leaveType: Partial<LeaveType>): Observable<LeaveType> {
    return this.http.put<LeaveType>(`${this.apiUrl}/leave-types/${id}`, leaveType);
  }

  deleteLeaveType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/leave-types/${id}`);
  }

  // Leave Request API
  getAllLeaveRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/leave-requests`);
  }

  getLeaveRequestsByDepartment(deptId: number): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/leave-requests/department/${deptId}`);
  }

  getLeaveRequestsByEmployee(emplId: number): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/leave-requests/employee/${emplId}`);
  }


  createLeaveRequest(request: any, status: string = 'PENDING'): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/leave-requests?status=${status}`, request);
  }

  approveOrRejectRequest(leaveRequestId: number, managerEmplId: number, action: 'APPROVE' | 'REJECT', comment: string): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/leave-requests/approval`, {
      leaveRequestId,
      managerEmplId,
      action,
      comment
    });
  }

  cancelLeaveRequest(leaveRequestId: number, emplId: number): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/leave-requests/${leaveRequestId}/cancel?emplId=${emplId}`, {});
  }

  getWorkflowHistory(leaveRequestId: number): Observable<LeaveWorkflow[]> {
    return this.http.get<LeaveWorkflow[]>(`${this.apiUrl}/leave-requests/${leaveRequestId}/workflow`);
  }

  // Attachment API
  uploadAttachment(leaveRequestId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('leaveRequestId', leaveRequestId.toString());
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/attachments/upload`, formData);
  }

  getAttachmentDownload(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/attachments/${attachmentId}/download`, { responseType: 'blob' });
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/attachments/${attachmentId}`);
  }

  downloadAttachmentFile(attachmentId: number, fileName?: string): void {
    this.getAttachmentDownload(attachmentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `document_${attachmentId}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Nu s-a putut descarca fisierul atasat.');
      }
    });
  }

  // Demo Notifications API
  getNotifications(email?: string): Observable<DemoEmail[]> {
    if (email) {
      return this.http.get<DemoEmail[]>(`${this.apiUrl}/notifications/user?email=${encodeURIComponent(email)}`);
    }
    return this.http.get<DemoEmail[]>(`${this.apiUrl}/notifications/user`);
  }

  // PDF Download Helper using Authenticated HttpClient Blob
  downloadPdfBlob(endpointUrl: string, defaultFileName: string): void {
    this.http.get(endpointUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Eroare la descarcarea PDF-ului:', err);
        alert('Nu s-a putut descarca documentul PDF. Va rugam sa reincercati.');
      }
    });
  }

  // PDF Download helpers (Browser jsPDF with Backend OpenPDF Authenticated Fallback)
  generateClientLeavePdf(req: LeaveRequest): void {
    if (typeof window === 'undefined' || !window.jspdf) {
      this.downloadPdfBlob(`${this.apiUrl}/pdf/leave-request/${req.leaveRequestId}`, `Cerere_Concediu_${req.leaveRequestId}.pdf`);
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      doc.setTextColor(0, 0, 0);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.text("CERERE DE CONCEDIU", 20, 25);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`ID Cerere: #${req.leaveRequestId}  |  Data: ${req.createdAt || new Date().toLocaleDateString('ro-RO')}`, 20, 32);

      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(20, 36, 190, 36);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const formatDate = (str?: string) => {
        if (!str) return '';
        const parts = str.split('T')[0].split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str;
      };

      const items = [
        ["Nume Angajat:", `${req.employeeName || 'N/A'}`],
        ["Email:", `${req.employeeEmail || 'N/A'}`],
        ["Tip Concediu:", `${req.leaveTypeName || 'Concediu'} (${req.leaveTypeCode || 'CO'})`],
        ["Perioada Solicitata:", `${formatDate(req.startDate)} - ${formatDate(req.endDate)}`],
        ["Zile Lucratoare:", `${req.workingDays || 0} zile`],
        ["Status Cerere:", `${req.status || 'PENDING'}`]
      ];

      if (req.attachmentName) {
        items.push(["Document Atasat:", `${req.attachmentName}`]);
      }
      if (req.rejectionReason) {
        items.push(["Motiv Respingere:", `${req.rejectionReason}`]);
      }

      let yPos = 48;
      items.forEach(([label, value]) => {
        doc.setFont("Helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("Helvetica", "normal");
        doc.text(value, 75, yPos);
        yPos += 9;
      });

      yPos += 15;
      doc.setDrawColor(210, 210, 210);
      doc.line(20, yPos, 190, yPos);

      yPos += 16;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Semnatura Angajat:", 25, yPos);
      doc.text("Aprobat:", 115, yPos);

      yPos += 16;
      doc.setFont("Helvetica", "normal");
      doc.text("___________________________", 25, yPos);
      doc.text("___________________________", 115, yPos);

      doc.save(`Cerere_Concediu_${req.leaveRequestId}.pdf`);
    } catch {
      this.downloadPdfBlob(`${this.apiUrl}/pdf/leave-request/${req.leaveRequestId}`, `Cerere_Concediu_${req.leaveRequestId}.pdf`);
    }
  }

  generateDepartmentReportPdf(dept: Department, requests: LeaveRequest[]): void {
    if (typeof window === 'undefined' || !window.jspdf) {
      if (dept.deptId && dept.deptId > 0) {
        this.downloadPdfBlob(`${this.apiUrl}/pdf/department-report/${dept.deptId}`, `Raport_Departament_${dept.deptId}.pdf`);
      } else {
        this.downloadPdfBlob(`${this.apiUrl}/pdf/department-report/0`, 'Raport_Toate_Departamentele.pdf');
      }
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setTextColor(0, 0, 0);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      const isSingleDept = (dept.deptId && dept.deptId > 0);
      const headerTitle = isSingleDept
        ? "RAPORT CONCEDII DEPARTAMENT: " + dept.departmentName.toUpperCase()
        : "RAPORT CONCEDII: TOATE DEPARTAMENTELE (GENERAL)";
      doc.text(headerTitle, 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const subInfo = isSingleDept
        ? "Data generare: " + new Date().toLocaleDateString('ro-RO') + "  |  Limita max. absenti simultan: " + (dept.maxAbsentEmployees || 2) + " angajati  |  Total cereri: " + requests.length
        : "Data generare: " + new Date().toLocaleDateString('ro-RO') + "  |  Departament: Toate  |  Total cereri: " + requests.length;
      doc.text(subInfo, 15, 26);

      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(15, 30, 282, 30);

      let y = 38;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("ID", 15, y);
      doc.text("Angajat", 30, y);
      doc.text("Departament", 85, y);
      doc.text("Tip Concediu", 130, y);
      doc.text("Perioada", 175, y);
      doc.text("Zile", 230, y);
      doc.text("Status", 255, y);

      y += 3;
      doc.line(15, y, 282, y);
      y += 6;

      doc.setFont("Helvetica", "normal");
      if (requests.length === 0) {
        doc.text("Nu exista cereri conform filtrelor selectate.", 15, y);
      } else {
        requests.forEach(r => {
          if (y > 185) {
            doc.addPage();
            y = 20;
          }
          doc.text("#" + r.leaveRequestId, 15, y);
          doc.text(r.employeeName || "Angajat", 30, y);
          doc.text(r.departmentName || "General", 85, y);
          doc.text((r.leaveTypeName || "Concediu") + " (" + (r.leaveTypeCode || "CO") + ")", 130, y);
          doc.text((r.startDate || '') + " - " + (r.endDate || ''), 175, y);
          doc.text((r.workingDays || 0) + " zile", 230, y);
          doc.text(r.status || 'PENDING', 255, y);
          y += 7;
        });
      }

      const fileName = isSingleDept
        ? `Raport_Departament_${dept.deptId}.pdf`
        : `Raport_Toate_Departamentele.pdf`;
      doc.save(fileName);
    } catch {
      if (dept.deptId && dept.deptId > 0) {
        this.downloadPdfBlob(`${this.apiUrl}/pdf/department-report/${dept.deptId}`, `Raport_Departament_${dept.deptId}.pdf`);
      } else {
        this.downloadPdfBlob(`${this.apiUrl}/pdf/department-report/0`, 'Raport_Toate_Departamentele.pdf');
      }
    }
  }

  generatePendingReportPdf(pending: LeaveRequest[]): void {
    if (typeof window === 'undefined' || !window.jspdf) {
      this.downloadPdfBlob(`${this.apiUrl}/pdf/pending-report`, 'Raport_Cereri_In_Asteptare.pdf');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setTextColor(0, 0, 0);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("CERERI DE CONCEDIU IN ASTEPTARE (PENDING)", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Data raport: " + new Date().toLocaleDateString('ro-RO') + "  |  Total in asteptare: " + pending.length, 15, 26);

      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(15, 30, 195, 30);

      let y = 38;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("ID", 15, y);
      doc.text("Angajat", 30, y);
      doc.text("Tip Concediu", 85, y);
      doc.text("Perioada", 130, y);
      doc.text("Zile", 175, y);

      y += 3;
      doc.line(15, y, 195, y);
      y += 6;

      doc.setFont("Helvetica", "normal");
      if (pending.length === 0) {
        doc.text("Nu exista cereri in asteptare.", 15, y);
      } else {
        pending.forEach(r => {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text("#" + r.leaveRequestId, 15, y);
          doc.text(r.employeeName || "Angajat", 30, y);
          doc.text((r.leaveTypeCode || "CO"), 85, y);
          doc.text((r.startDate || '') + " - " + (r.endDate || ''), 130, y);
          doc.text((r.workingDays || 0) + " zile", 175, y);
          y += 7;
        });
      }

      doc.save("Raport_Cereri_In_Asteptare.pdf");
    } catch {
      this.downloadPdfBlob(`${this.apiUrl}/pdf/pending-report`, 'Raport_Cereri_In_Asteptare.pdf');
    }
  }

  generateBalancesReportPdf(employees: Employee[], departments: Department[]): void {
    if (typeof window === 'undefined' || !window.jspdf) {
      this.downloadPdfBlob(`${this.apiUrl}/pdf/balances-report`, 'Raport_Situatie_Solduri.pdf');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setTextColor(0, 0, 0);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("SITUATIA SOLDURILOR DE CONCEDIU", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Data raport: " + new Date().toLocaleDateString('ro-RO') + "  |  Total Angajati: " + employees.length, 15, 26);

      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(15, 30, 195, 30);

      let y = 38;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("ID", 15, y);
      doc.text("Nume Angajat", 30, y);
      doc.text("Departament", 85, y);
      doc.text("Anual", 140, y);
      doc.text("Disponibil", 160, y);
      doc.text("Consumat", 180, y);

      y += 3;
      doc.line(15, y, 195, y);
      y += 6;

      doc.setFont("Helvetica", "normal");
      employees.forEach(emp => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        const dept = departments.find(d => d.deptId === emp.deptId);
        const used = Math.max(0, (emp.annualLeaveDays || 0) - (emp.availableLeaveDays || 0));

        doc.text("#" + emp.emplId, 15, y);
        doc.text(emp.name || "N/A", 30, y);
        doc.text(dept ? dept.departmentName : "N/A", 85, y);
        doc.text((emp.annualLeaveDays || 0) + " z", 140, y);
        doc.text((emp.availableLeaveDays || 0) + " z", 160, y);
        doc.text(used + " z", 180, y);
        y += 7;
      });

      doc.save("Situatie_Solduri.pdf");
    } catch {
      this.downloadPdfBlob(`${this.apiUrl}/pdf/balances-report`, 'Raport_Situatie_Solduri.pdf');
    }
  }
}
