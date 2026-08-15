import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LeaveService } from '../../services/leave.service';
import { AuthService, AuthUser } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { Employee, Department, LeaveType, LeaveRequest } from '../../models/leave.model';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="main-container">

      <!-- Subnavigatie Interna Admin -->
      <div class="subnav-bar">
        <button class="subnav-btn" [class.active]="activeSubtab === 'depts'" (click)="activeSubtab = 'depts'">
          <i class="fa-solid fa-sitemap"></i> <span>{{ t('subAdminDepts') }}</span>
        </button>
        <button class="subnav-btn" [class.active]="activeSubtab === 'employees'" (click)="activeSubtab = 'employees'">
          <i class="fa-solid fa-users"></i> <span>{{ t('subAdminUsers') }}</span>
        </button>
        <button class="subnav-btn" [class.active]="activeSubtab === 'types'" (click)="activeSubtab = 'types'">
          <i class="fa-solid fa-list-check"></i> <span>{{ t('subAdminTypes') }}</span>
        </button>
        <button class="subnav-btn" [class.active]="activeSubtab === 'stats'" (click)="activeSubtab = 'stats'">
          <i class="fa-solid fa-chart-pie"></i> <span>{{ t('subAdminStats') }}</span>
        </button>
      </div>

      <!-- SECTIUNEA 1: DEPARTAMENTE -->
      <div *ngIf="activeSubtab === 'depts'" class="panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('adminDeptsTitle') }}</span>
          <button class="btn btn-primary btn-sm" (click)="openAddDeptModal()">
            <i class="fa-solid fa-plus"></i> {{ t('btnAddDept') }}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('thId') }}</th>
              <th>{{ t('thDeptName') }}</th>
              <th>{{ t('thDeptManager') }}</th>
              <th>{{ t('thDeptLimit') }}</th>
              <th>{{ t('thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of departments">
              <td><strong>#{{ d.deptId }}</strong></td>
              <td><strong>{{ getDeptName(d.deptId) }}</strong></td>
              <td>{{ getManagerName(d.managerId) }}</td>
              <td>
                <strong>{{ d.maxAbsentEmployees }}</strong> {{ t('unitEmployees') }}
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-default btn-sm" (click)="openEditDeptModal(d)">
                    <i class="fa-solid fa-pen"></i> {{ t('btnEdit') }}
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="deleteDept(d)">
                    <i class="fa-solid fa-trash"></i> {{ t('btnDelete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTIUNEA 2: ANGAJATI -->
      <div *ngIf="activeSubtab === 'employees'" class="panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('adminEmployeesTitle') }}</span>
          <button class="btn btn-primary btn-sm" (click)="openAddEmployeeModal()">
            <i class="fa-solid fa-user-plus"></i> {{ t('btnAddEmployee') }}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('thId') }}</th>
              <th>{{ t('thEmpName') }}</th>
              <th>{{ t('thEmpEmail') }}</th>
              <th>{{ t('thEmpRole') }}</th>
              <th>{{ t('thEmpDept') }}</th>
              <th>{{ t('thAnnualDays') }}</th>
              <th>{{ t('thUsedDays') }}</th>
              <th>{{ t('thAvailableDays') }}</th>
              <th>{{ t('thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of employees">
              <td><strong>#{{ emp.emplId }}</strong></td>
              <td><strong>{{ emp.name }}</strong></td>
              <td>{{ emp.email }}</td>
              <td><span class="badge badge-grey">{{ emp.role }}</span></td>
              <td>{{ getDeptName(emp.deptId) }}</td>
              <td>{{ emp.annualLeaveDays }} {{ t('unitDays') }}</td>
              <td>{{ getConsumedDays(emp) }} {{ t('unitDays') }}</td>
              <td><strong style="color:#059669;">{{ emp.availableLeaveDays }} {{ t('unitDays') }}</strong></td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-default btn-sm" (click)="openEditEmployeeModal(emp)">
                    <i class="fa-solid fa-user-pen"></i> {{ t('btnEdit') }}
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="deleteEmployee(emp)">
                    <i class="fa-solid fa-trash"></i> {{ t('btnDelete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTIUNEA 3: TIPURI DE CONCEDIU -->
      <div *ngIf="activeSubtab === 'types'" class="panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('adminTypesTitle') }}</span>
          <button class="btn btn-primary btn-sm" (click)="openAddLeaveTypeModal()">
            <i class="fa-solid fa-plus"></i> {{ t('btnAddLeaveType') }}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('thId') }}</th>
              <th>{{ t('thType') }}</th>
              <th>{{ t('thTypeCode') }}</th>
              <th>{{ t('thRequiresAttach') }}</th>
              <th>{{ t('thIsPaid') }}</th>
              <th>{{ t('thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let lt of leaveTypes">
              <td><strong>#{{ lt.leaveTypeId }}</strong></td>
              <td><strong>{{ getTypeName(lt) }}</strong></td>
              <td><span class="badge badge-indigo">{{ lt.code }}</span></td>
              <td>
                <span *ngIf="lt.requiresAttachment" style="color:#dc2626; font-weight:600;">
                  <i class="fa-solid fa-check-circle"></i> {{ t('optYesMandatory') }}
                </span>
                <span *ngIf="!lt.requiresAttachment" style="color:var(--text-muted);">
                  {{ t('optNo') }}
                </span>
              </td>
              <td>
                <span *ngIf="lt.paid" style="color:#059669; font-weight:600;">
                  <i class="fa-solid fa-check"></i> {{ t('optYesPaid') }}
                </span>
                <span *ngIf="!lt.paid" style="color:#dc2626; font-weight:600;">
                  {{ t('optNoUnpaid') }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-default btn-sm" (click)="openEditLeaveTypeModal(lt)">
                    <i class="fa-solid fa-pen"></i> {{ t('btnEdit') }}
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="deleteLeaveType(lt)">
                    <i class="fa-solid fa-trash"></i> {{ t('btnDelete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTIUNEA 4: STATISTICI & RAPOARTE -->
      <div *ngIf="activeSubtab === 'stats'" class="panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('adminStatsTitle') }}</span>
          <button class="btn btn-primary btn-sm" (click)="downloadBalancesReport()">
            <i class="fa-solid fa-file-pdf"></i> {{ t('btnExportBalancesReport') }}
          </button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          <div *ngFor="let dept of departments" style="background:var(--bg-page); border:1px solid var(--border-color); padding:16px; border-radius:8px;">
            <h4 style="font-size:15px; font-weight:700; margin-bottom:8px; color:var(--primary-color);">
              {{ getDeptName(dept.deptId) }}
            </h4>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">
              {{ t('statEmpCount') }} <strong>{{ getDeptEmployeeCount(dept.deptId) }}</strong>
            </p>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">
              {{ t('statTotalRequests') }} <strong>{{ getDeptRequestCount(dept.deptId) }}</strong>
            </p>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">
              {{ t('statTotalUsed') }} <strong style="color:#059669;">{{ getDeptTotalUsedDays(dept.deptId) }} {{ t('unitDays') }}</strong>
            </p>
            <p style="font-size:13px; color:var(--text-muted);">
              {{ t('statMaxLimit') }} <strong>{{ dept.maxAbsentEmployees }} {{ t('unitEmployees') }}</strong>
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL DEPARTAMENT -->
    <div class="modal-overlay" *ngIf="isDeptModalOpen" [class.active]="isDeptModalOpen" (click)="isDeptModalOpen = false">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <strong>{{ editDeptId ? t('modalEditDeptTitle') : t('modalAddDeptTitle') }}</strong>
          <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="isDeptModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form (ngSubmit)="saveDept()">
          <div class="form-group">
            <label class="form-label">{{ t('labelDeptNameRo') }}</label>
            <input type="text" class="form-control" [(ngModel)]="deptForm.departmentName" name="departmentName" required [placeholder]="t('deptNameRoPlaceholder')">
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelDeptNameEn') }}</label>
            <input type="text" class="form-control" [(ngModel)]="deptForm.departmentNameEn" name="departmentNameEn" required [placeholder]="t('deptNameEnPlaceholder')">
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelManager') }}</label>
            <select class="form-control" [(ngModel)]="deptForm.managerId" name="managerId">
              <option *ngFor="let e of employees" [value]="e.emplId">{{ e.name }} ({{ e.email }})</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelMaxAbsent') }}</label>
            <input type="number" class="form-control" [(ngModel)]="deptForm.maxAbsentEmployees" name="maxAbsentEmployees" min="1" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
            <button type="button" class="btn btn-default" (click)="isDeptModalOpen = false">{{ t('btnModalCancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ t('btnSave') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL ANGAJAT -->
    <div class="modal-overlay" *ngIf="isEmpModalOpen" [class.active]="isEmpModalOpen" (click)="isEmpModalOpen = false">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <strong>{{ editEmpId ? t('modalEditEmpTitle') : t('modalAddEmpTitle') }}</strong>
          <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="isEmpModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form (ngSubmit)="saveEmployee()">
          <div class="form-group">
            <label class="form-label">{{ t('labelEmpName') }}</label>
            <input type="text" class="form-control" [(ngModel)]="empForm.name" name="name" required>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelEmpEmail') }}</label>
            <input type="email" class="form-control" [(ngModel)]="empForm.email" name="email" required placeholder="exemplu@test.ro">
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelEmpPassword') }}</label>
            <input type="password" class="form-control" [(ngModel)]="empForm.password" name="password" [placeholder]="editEmpId ? t('placeholderEditPassword') : t('placeholderEmpPassword')">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-label">{{ t('labelEmpRole') }}</label>
              <select class="form-control" [(ngModel)]="empForm.role" name="role">
                <option value="USER">USER (Angajat / Employee)</option>
                <option value="DEPT_RESP">DEPT_RESP (Manager)</option>
                <option value="ADMIN">ADMIN (Administrator)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('labelEmpDept') }}</label>
              <select class="form-control" [(ngModel)]="empForm.deptId" name="deptId">
                <option *ngFor="let d of departments" [value]="d.deptId">{{ getDeptName(d.deptId) }}</option>
              </select>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-label">{{ t('labelAnnualDays') }}</label>
              <input type="number" class="form-control" [(ngModel)]="empForm.annualLeaveDays" name="annualLeaveDays" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('labelAvailableDays') }}</label>
              <input type="number" class="form-control" [(ngModel)]="empForm.availableLeaveDays" name="availableLeaveDays" min="0" required>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
            <button type="button" class="btn btn-default" (click)="isEmpModalOpen = false">{{ t('btnModalCancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ t('btnSave') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL TIP CONCEDIU -->
    <div class="modal-overlay" *ngIf="isTypeModalOpen" [class.active]="isTypeModalOpen" (click)="isTypeModalOpen = false">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <strong>{{ editTypeId ? t('modalEditTypeTitle') : t('modalAddTypeTitle') }}</strong>
          <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="isTypeModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form (ngSubmit)="saveLeaveType()">
          <div class="form-group">
            <label class="form-label">{{ t('labelTypeNameRo') }}</label>
            <input type="text" class="form-control" [(ngModel)]="typeForm.name" name="name" required [placeholder]="t('typeNameRoPlaceholder')">
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelTypeNameEn') }}</label>
            <input type="text" class="form-control" [(ngModel)]="typeForm.nameEn" name="nameEn" required [placeholder]="t('typeNameEnPlaceholder')">
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('labelTypeCode') }}</label>
            <input type="text" class="form-control" [(ngModel)]="typeForm.code" name="code" required placeholder="ex: CO, CM, FP, SPECIAL">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-label">{{ t('labelRequiresAttach') }}</label>
              <select class="form-control" [(ngModel)]="typeForm.requiresAttachment" name="requiresAttachment">
                <option [ngValue]="false">{{ t('optNo') }}</option>
                <option [ngValue]="true">{{ t('optYesMandatory') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('labelPaid') }}</label>
              <select class="form-control" [(ngModel)]="typeForm.paid" name="paid">
                <option [ngValue]="true">{{ t('optYesPaid') }}</option>
                <option [ngValue]="false">{{ t('optNoUnpaid') }}</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
            <button type="button" class="btn btn-default" (click)="isTypeModalOpen = false">{{ t('btnModalCancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ t('btnSave') }}</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  activeSubtab: 'depts' | 'employees' | 'types' | 'stats' = 'depts';

  departments: Department[] = [];
  employees: Employee[] = [];
  leaveTypes: LeaveType[] = [];
  allRequests: LeaveRequest[] = [];
  private destroy$ = new Subject<void>();

  // Modale & Formulare
  isDeptModalOpen = false;
  editDeptId: number | null = null;
  deptForm: Partial<Department> = { departmentName: '', maxAbsentEmployees: 2 };

  isEmpModalOpen = false;
  editEmpId: number | null = null;
  empForm: Partial<Employee> = { name: '', email: '', role: 'USER', annualLeaveDays: 24, availableLeaveDays: 24 };

  isTypeModalOpen = false;
  editTypeId: number | null = null;
  typeForm: Partial<LeaveType> = { name: '', code: '', requiresAttachment: false, paid: true };

  constructor(
    public leaveService: LeaveService,
    public authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.isDeptModalOpen = false;
    this.isEmpModalOpen = false;
    this.isTypeModalOpen = false;
  }

  loadData(): void {
    this.leaveService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({ next: d => this.departments = d });
    this.leaveService.getEmployees().pipe(takeUntil(this.destroy$)).subscribe({ next: e => this.employees = e });
    this.leaveService.getLeaveTypes().pipe(takeUntil(this.destroy$)).subscribe({ next: lt => this.leaveTypes = lt });
    this.leaveService.getAllLeaveRequests().pipe(takeUntil(this.destroy$)).subscribe({ next: r => this.allRequests = r });
  }

  getManagerName(managerId?: number): string {
    if (!managerId) return '-';
    const emp = this.employees.find(e => e.emplId === managerId);
    return emp ? `${emp.name} (${emp.email})` : `#${managerId}`;
  }

  getDeptName(deptId?: number): string {
    if (!deptId) return '-';
    const d = this.departments.find(x => x.deptId === deptId);
    if (!d) return `#${deptId}`;
    return (this.translationService.currentLang === 'en' && d.departmentNameEn) ? d.departmentNameEn : d.departmentName;
  }

  getConsumedDays(emp: Employee): number {
    const annual = emp.annualLeaveDays || 24;
    const available = emp.availableLeaveDays !== undefined ? emp.availableLeaveDays : annual;
    return Math.max(0, annual - available);
  }

  getDeptEmployeeCount(deptId?: number): number {
    return this.employees.filter(e => e.deptId === deptId).length;
  }

  getDeptRequestCount(deptId?: number): number {
    const deptEmpIds = this.employees.filter(e => e.deptId === deptId).map(e => e.emplId);
    return this.allRequests.filter(r => r.emplId && deptEmpIds.includes(r.emplId)).length;
  }

  getDeptTotalUsedDays(deptId?: number): number {
    const deptEmpIds = this.employees.filter(e => e.deptId === deptId).map(e => e.emplId);
    return this.allRequests
      .filter(r => r.emplId && deptEmpIds.includes(r.emplId) && r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.workingDays || 0), 0);
  }

  downloadBalancesReport(): void {
    this.leaveService.generateBalancesReportPdf(this.employees, this.departments);
  }

  // OPERATIUNI DEPARTAMENTE
  openAddDeptModal(): void {
    this.editDeptId = null;
    this.deptForm = {
      departmentName: '',
      departmentNameEn: '',
      managerId: this.employees[0]?.emplId,
      maxAbsentEmployees: 2
    };
    this.isDeptModalOpen = true;
  }

  openEditDeptModal(d: Department): void {
    this.editDeptId = d.deptId;
    this.deptForm = { ...d, departmentNameEn: d.departmentNameEn || d.departmentName };
    this.isDeptModalOpen = true;
  }

  saveDept(): void {
    if (!this.deptForm.departmentName?.trim()) {
      alert('Denumirea in limba romana este obligatorie.');
      return;
    }
    if (!this.deptForm.departmentNameEn?.trim()) {
      alert('Denumirea in limba engleza este obligatorie.');
      return;
    }
    this.deptForm.departmentName = this.deptForm.departmentName.trim();
    this.deptForm.departmentNameEn = this.deptForm.departmentNameEn.trim();

    if (this.editDeptId) {
      this.leaveService.updateDepartment(this.editDeptId, this.deptForm).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isDeptModalOpen = false;
          this.loadData();
          alert('Departamentul a fost actualizat!');
        },
        error: (err) => alert(err?.error?.message || err?.error || 'Eroare la actualizarea departamentului.')
      });
    } else {
      this.leaveService.saveDepartment(this.deptForm).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isDeptModalOpen = false;
          this.loadData();
          alert('Departamentul a fost creat!');
        },
        error: (err) => alert(err?.error?.message || err?.error || 'Eroare la crearea departamentului.')
      });
    }
  }

  deleteDept(d: Department): void {
    const assignedEmployees = this.employees.filter(e => e.deptId === d.deptId);
    if (assignedEmployees.length > 0) {
      alert(`Nu se poate sterge departamentul "${d.departmentName}" deoarece are ${assignedEmployees.length} angajati asociati. Reasignati angajatii inainte de stergere.`);
      return;
    }
    if (!confirm(`Esti sigur ca doresti sa stergi departamentul "${d.departmentName}"?`)) return;
    this.leaveService.deleteDepartment(d.deptId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err?.error?.message || err?.error || 'Eroare la stergerea departamentului.')
    });
  }

  // OPERATIUNI ANGAJATI
  openAddEmployeeModal(): void {
    this.editEmpId = null;
    this.empForm = {
      name: '',
      email: '',
      password: '',
      role: 'USER',
      deptId: this.departments[0]?.deptId,
      annualLeaveDays: 24,
      availableLeaveDays: 24
    };
    this.isEmpModalOpen = true;
  }

  openEditEmployeeModal(emp: Employee): void {
    this.editEmpId = emp.emplId;
    this.empForm = { ...emp, password: '' };
    this.isEmpModalOpen = true;
  }

  saveEmployee(): void {
    if (!this.empForm.name?.trim()) {
      alert('Numele angajatului este obligatoriu.');
      return;
    }
    const rawEmail = this.empForm.email?.trim();
    if (!rawEmail) {
      alert('Adresa de email este obligatorie.');
      return;
    }

    const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(rawEmail)) {
      alert('Adresa de email este invalida! Introduceti un format valid (ex: nume@domeniu.ro).');
      return;
    }

    const cleanEmail = rawEmail.toLowerCase();
    this.empForm.email = cleanEmail;
    this.empForm.name = this.empForm.name.trim();

    if (this.editEmpId) {
      this.leaveService.updateEmployee(this.editEmpId, this.empForm).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isEmpModalOpen = false;
          this.loadData();
          alert('Datele angajatului au fost actualizate!');
        },
        error: (err) => alert(err?.error?.message || err?.error || 'Eroare la actualizarea angajatului.')
      });
    } else {
      this.leaveService.saveEmployee(this.empForm).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isEmpModalOpen = false;
          this.loadData();
          alert('Angajatul a fost creat cu succes!');
        },
        error: (err) => alert(err?.error?.message || err?.error || 'Eroare la crearea angajatului.')
      });
    }
  }

  deleteEmployee(emp: Employee): void {
    const managedDept = this.departments.find(d => d.managerId === emp.emplId);
    if (managedDept) {
      alert(`Nu se poate sterge angajatul "${emp.name}" deoarece este desemnat responsabil/manager al departamentului "${managedDept.departmentName}". Desemnati un alt manager inainte de stergere.`);
      return;
    }
    if (!confirm(`Esti sigur ca doresti sa stergi angajatul "${emp.name}"?`)) return;
    this.leaveService.deleteEmployee(emp.emplId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err?.error?.message || err?.error || 'Eroare la stergerea angajatului.')
    });
  }

  getTypeName(lt?: LeaveType | null): string {
    if (!lt) return '-';
    return (this.translationService.currentLang === 'en' && lt.nameEn) ? lt.nameEn : lt.name;
  }

  // OPERATIUNI TIPURI CONCEDIU
  openAddLeaveTypeModal(): void {
    this.editTypeId = null;
    this.typeForm = { name: '', nameEn: '', code: '', requiresAttachment: false, paid: true };
    this.isTypeModalOpen = true;
  }

  openEditLeaveTypeModal(lt: LeaveType): void {
    this.editTypeId = lt.leaveTypeId;
    this.typeForm = { ...lt, nameEn: lt.nameEn || lt.name };
    this.isTypeModalOpen = true;
  }

  saveLeaveType(): void {
    if (!this.typeForm.name?.trim()) {
      alert('Denumirea in limba romana este obligatorie.');
      return;
    }
    if (!this.typeForm.nameEn?.trim()) {
      alert('Denumirea in limba engleza este obligatorie.');
      return;
    }
    if (!this.typeForm.code?.trim()) {
      alert('Codul tipului de concediu este obligatoriu.');
      return;
    }

    this.typeForm.name = this.typeForm.name.trim();
    this.typeForm.nameEn = this.typeForm.nameEn.trim();
    this.typeForm.code = this.typeForm.code.toUpperCase().trim();

    if (this.editTypeId) {
      this.leaveService.updateLeaveType(this.editTypeId, this.typeForm).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isTypeModalOpen = false;
          this.loadData();
          alert('Tipul de concediu a fost actualizat!');
        },
        error: (err) => alert(err?.error?.message || err?.error || 'Eroare la actualizarea tipului de concediu.')
      });
    } else {
      this.leaveService.saveLeaveType(this.typeForm).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isTypeModalOpen = false;
          this.loadData();
          alert('Tipul de concediu a fost adaugat cu succes!');
        },
        error: (err) => alert(err?.error?.message || err?.error || 'Eroare la crearea tipului de concediu.')
      });
    }
  }

  deleteLeaveType(lt: LeaveType): void {
    if (!confirm(`Esti sigur ca doresti sa stergi tipul de concediu "${this.getTypeName(lt)}" (${lt.code})?`)) return;
    this.leaveService.deleteLeaveType(lt.leaveTypeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err?.error?.message || err?.error || 'Eroare la stergerea tipului de concediu.')
    });
  }

  t(key: string): string {
    return this.translationService.t(key);
  }
}
