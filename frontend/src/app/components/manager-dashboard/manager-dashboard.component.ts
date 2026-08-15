import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';
import { LeaveService } from '../../services/leave.service';
import { TranslationService } from '../../services/translation.service';
import { LeaveRequest, LeaveType, LeaveWorkflow, Department } from '../../models/leave.model';

export interface CalendarLeaveEntry {
  employeeName: string;
  request: LeaveRequest;
}

interface CalendarDay {
  day: number;
  dateStr: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isToday?: boolean;
  isCurrentMonth: boolean;
  isOverLimit: boolean;
  absentEntries: CalendarLeaveEntry[];
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="main-container">

      <!-- Navigare Tab-uri Manager (Aprobari / Calendar) -->
      <div style="display:flex; gap:12px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
        <button class="tab-item" [class.active]="activeTab === 'requests'" (click)="activeTab = 'requests'" style="font-size:15px;">
          <i class="fa-solid fa-tasks"></i> {{ t('tabApprovals') }}
        </button>
        <button class="tab-item" [class.active]="activeTab === 'calendar'" (click)="activeTab = 'calendar'" style="font-size:15px;">
          <i class="fa-regular fa-calendar-alt"></i> {{ t('tabCalendar') }}
        </button>
      </div>

      <!-- VEDEREA 1: APROBARI CERERI -->
      <div *ngIf="activeTab === 'requests'">
        
        <!-- Cadrane Statistici Sintetice Manager -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-label">{{ t('mstatTotal') }}</div>
            <div class="stat-value">{{ filteredDeptRequests.length }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">{{ t('mstatPending') }}</div>
            <div class="stat-value" style="color:#d97706;">{{ pendingCount }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">{{ t('mstatApproved') }}</div>
            <div class="stat-value" style="color:#059669;">{{ approvedCount }}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">{{ t('mstatRejected') }}</div>
            <div class="stat-value" style="color:#dc2626;">{{ rejectedCount }}</div>
          </div>
        </div>

        <!-- Panou Cereri cu Filtre & Exporturi PDF -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">{{ t('panelManagerTitle') }}</span>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-default btn-sm" (click)="downloadDeptReport()" title="Exporta Raport PDF Departament">
                <i class="fa-solid fa-file-pdf" style="color:#dc2626;"></i> {{ t('btnExportDeptReport') }}
              </button>
              <button class="btn btn-default btn-sm" (click)="downloadPendingReport()" title="Exporta Cereri in Asteptare">
                <i class="fa-solid fa-file-lines" style="color:#d97706;"></i> {{ t('btnExportPendingReport') }}
              </button>
              <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">
                {{ t('showingRequestsText').replace('{count}', '' + filteredRequests.length) }}
              </span>
            </div>
          </div>

          <!-- BARA DE FILTRE PENTRU MANAGER & ADMIN -->
          <div class="filter-box">
            <div class="filter-grid">
              <div class="filter-group">
                <label class="filter-label">{{ t('flabelSearch') }}</label>
                <input type="text" class="form-control" [(ngModel)]="filters.search" (input)="applyFilters()" [placeholder]="t('searchEmpPlaceholder')">
              </div>

              <div class="filter-group">
                <label class="filter-label">{{ t('flabelStatus') }}</label>
                <select class="form-control" [(ngModel)]="filters.status" (change)="applyFilters()">
                  <option value="ALL">{{ t('allStatuses') }}</option>
                  <option value="PENDING">In asteptare (PENDING)</option>
                  <option value="APPROVED">Aprobata (APPROVED)</option>
                  <option value="REJECTED">Respinsa (REJECTED)</option>
                  <option value="CANCELLED">Anulata (CANCELLED)</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">{{ t('flabelDept') }}</label>
                <select class="form-control" [(ngModel)]="filters.deptId" (change)="applyFilters()" [disabled]="user?.role === 'DEPT_RESP'">
                  <option value="ALL" *ngIf="user?.role === 'ADMIN'">{{ t('allDepts') }}</option>
                  <option *ngFor="let d of departments" [value]="d.deptId">{{ getDeptName(d.deptId) }}</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">{{ t('flabelType') }}</label>
                <select class="form-control" [(ngModel)]="filters.typeCode" (change)="applyFilters()">
                  <option value="ALL">{{ t('allTypes') }}</option>
                  <option *ngFor="let t of leaveTypes" [value]="t.code">{{ getTypeName(t) }} ({{ t.code }})</option>
                </select>
              </div>

              <div class="filter-group">
                <label class="filter-label">{{ t('flabelStart') }}</label>
                <input type="date" class="form-control" [(ngModel)]="filters.startDate" (change)="applyFilters()">
              </div>

              <div class="filter-group">
                <label class="filter-label">{{ t('flabelEnd') }}</label>
                <input type="date" class="form-control" [(ngModel)]="filters.endDate" (change)="applyFilters()">
              </div>

              <div class="filter-group" style="justify-content:flex-end;">
                <button class="btn btn-default" (click)="resetFilters()">
                  <i class="fa-solid fa-rotate-left"></i> {{ t('btnResetFilters') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Tabel Cereri Departament -->
          <table>
            <thead>
              <tr>
                <th>{{ t('mthId') }}</th>
                <th>{{ t('mthName') }}</th>
                <th>{{ t('mthType') }}</th>
                <th>{{ t('mthPeriod') }}</th>
                <th>{{ t('mthWorkingDays') }}</th>
                <th>{{ t('mthStatus') }}</th>
                <th>{{ t('mthActions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of filteredRequests">
                <td><strong>#{{ req.leaveRequestId }}</strong></td>
                <td>
                  <strong>{{ req.employeeName }}</strong><br>
                  <small style="color:var(--text-muted);">{{ req.employeeEmail }}</small><br>
                  <span class="badge badge-grey" style="font-size:10px;">{{ getReqDeptName(req) }}</span>
                </td>
                <td>{{ getReqTypeName(req) }}</td>
                <td>{{ formatDate(req.startDate) }} - {{ formatDate(req.endDate) }}</td>
                <td>{{ req.workingDays }} {{ t('unitDays') }}</td>
                <td>
                  <span [class]="getStatusBadgeClass(req.status)">{{ req.status }}</span>
                  <div *ngIf="req.attachmentName" style="margin-top:4px;">
                    <button type="button" class="btn btn-default btn-sm" (click)="downloadAttachment(req)" title="Descarca documentul justificativ al angajatului" style="padding:2px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
                      <i class="fa-solid fa-paperclip" style="color:var(--primary-color);"></i>
                      <span style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ req.attachmentName }}</span>
                    </button>
                  </div>
                  <div *ngIf="req.status === 'REJECTED' && req.rejectionReason" class="rejection-box">
                    <i class="fa-solid fa-circle-exclamation"></i> {{ req.rejectionReason }}
                  </div>
                </td>
                <td>
                  <div class="action-btns">
                    <!-- Butoane Aprobare / Respingere -->
                    <ng-container *ngIf="req.status === 'PENDING'">
                      <button class="btn btn-success btn-sm" (click)="approveRequest(req)" title="Aproba cererea">
                        <i class="fa-solid fa-check"></i> {{ t('btnApprove') }}
                      </button>
                      <button class="btn btn-danger btn-sm" (click)="openRejectModal(req)" title="Respinge cererea">
                        <i class="fa-solid fa-xmark"></i> {{ t('btnReject') }}
                      </button>
                    </ng-container>

                    <span *ngIf="req.status !== 'PENDING'" style="color:var(--text-muted); font-size:12px;">
                      {{ t('processedText') }}
                    </span>

                    <button class="btn btn-default btn-sm" (click)="openWorkflowModal(req)" title="Istoric">
                      <i class="fa-solid fa-history"></i> {{ t('btnHistory') }}
                    </button>
                    <button class="btn btn-default btn-sm" (click)="downloadPDF(req)" title="PDF">
                      <i class="fa-solid fa-file-pdf"></i> {{ t('btnPdf') }}
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredRequests.length === 0">
                <td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">
                  {{ t('noRequestsText') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VEDEREA 2: CALENDAR DEPARTAMENT & SUPRAPUNERI -->
      <div *ngIf="activeTab === 'calendar'">
        
        <!-- Alerta Avertizare Suprapuneri Depasite -->
        <div class="alert-warning" *ngIf="maxOverlapCount > maxAllowedLimit">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:16px;"></i>
          <span>
            {{ getOverlapWarningText() }}
          </span>
        </div>

        <div class="panel">
          <div class="panel-header" style="flex-wrap:wrap; gap:12px;">
            <!-- Controale Navigare Luna, An & Astazi -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <!-- Luna -->
              <div style="display:inline-flex; align-items:center; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); overflow:hidden;">
                <button class="btn btn-default btn-sm" (click)="changeMonth(-1)" title="{{ t('prevMonth') }}" style="border:none; border-radius:0; padding:6px 10px;">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span style="font-weight:600; font-size:14px; min-width:110px; text-align:center; padding:0 6px;">
                  {{ getMonthName() }}
                </span>
                <button class="btn btn-default btn-sm" (click)="changeMonth(1)" title="{{ t('nextMonth') }}" style="border:none; border-radius:0; padding:6px 10px;">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>

              <!-- Selector An -->
              <div style="display:inline-flex; align-items:center; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-card); overflow:hidden;">
                <button class="btn btn-default btn-sm" (click)="changeYear(-1)" title="{{ t('prevYear') }}" style="border:none; border-radius:0; padding:6px 10px;">
                  <i class="fa-solid fa-angles-left"></i>
                </button>
                <select [(ngModel)]="currentYear" (change)="onYearChange()" style="border:none; background:transparent; font-weight:700; font-size:14px; padding:6px 8px; cursor:pointer; color:var(--text-main); outline:none;">
                  <option *ngFor="let y of availableYears" [value]="y">{{ y }}</option>
                </select>
                <button class="btn btn-default btn-sm" (click)="changeYear(1)" title="{{ t('nextYear') }}" style="border:none; border-radius:0; padding:6px 10px;">
                  <i class="fa-solid fa-angles-right"></i>
                </button>
              </div>

              <!-- Buton Astazi -->
              <button class="btn btn-default btn-sm" (click)="goToToday()" title="Mergi la luna si anul curent">
                <i class="fa-regular fa-clock" style="color:var(--primary-color);"></i> {{ t('todayBtn') }}
              </button>

              <!-- Buton Toggle Sarbatori Legale Anuale -->
              <button class="btn btn-default btn-sm" [class.btn-primary]="showHolidaysList" (click)="toggleHolidaysList()" title="Vezi lista sarbatorilor legale din {{ currentYear }}">
                <i class="fa-solid fa-calendar-check" [style.color]="showHolidaysList ? '#fff' : '#dc2626'"></i>
                <span>{{ t('holidayBadge') }} {{ currentYear }} ({{ getYearHolidaysCount() }})</span>
              </button>
            </div>

            <!-- Filtru Departament & Limita Overlap -->
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <div *ngIf="user?.role === 'ADMIN'" style="display:flex; align-items:center; gap:6px;">
                <label class="filter-label" style="margin:0;">{{ t('flabelDept') }}</label>
                <select class="form-control" style="width:auto; padding:4px 8px;" [(ngModel)]="calendarDeptId" (change)="onCalendarDeptChange()">
                  <option *ngFor="let d of departments" [value]="d.deptId">{{ getDeptName(d.deptId) }}</option>
                </select>
              </div>

              <span style="font-size:13px; color:var(--text-muted);">
                {{ t('maxAbsentLabel') }} <strong>{{ maxAllowedLimit }}</strong>
              </span>
            </div>
          </div>

          <!-- Panou Detaliat Pliabil cu Toate Sarbatorile Legale ale Anului -->
          <div *ngIf="showHolidaysList" style="margin:12px 0 16px 0; padding:14px; background:var(--bg-page); border:1px solid var(--border-color); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div>
                <strong style="font-size:14px; color:var(--text-main);">
                  <i class="fa-solid fa-calendar-day" style="color:#dc2626; margin-right:6px;"></i>
                  {{ t('holidaysListTitle') }} {{ currentYear }}
                </strong>
                <div style="font-size:11px; color:var(--text-muted);">
                  {{ t('holidaysListSubtitle') }}
                </div>
              </div>
              <button class="btn btn-default btn-sm" (click)="showHolidaysList = false" style="padding:2px 8px; font-size:11px;">
                <i class="fa-solid fa-xmark"></i> {{ t('toggleHolidaysHide') }}
              </button>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
              <div *ngFor="let h of getCurrentYearHolidays()" 
                   style="background:var(--bg-card); border:1px solid var(--border-color); border-left:3px solid #dc2626; padding:8px 10px; border-radius:6px; display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:700; font-size:12px; color:var(--primary-color);">{{ formatHolidayDate(h.date) }}</span>
                  <span class="badge" [ngStyle]="{'background': h.isMobile ? '#fef3c7' : '#fee2e2', 'color': h.isMobile ? '#b45309' : '#b91c1c', 'font-size':'10px'}">
                    {{ h.isMobile ? t('holidayTypeMobile') : t('holidayTypeFixed') }}
                  </span>
                </div>
                <div style="font-weight:600; font-size:12px; color:var(--text-main);">{{ h.name }}</div>
                <div style="font-size:11px; color:var(--text-muted);">{{ h.dayOfWeekName }}</div>
              </div>
            </div>
          </div>

          <!-- Grila Calendar 7 Zile -->
          <div class="cal-grid">
            <div class="cal-header">{{ t('calMon') }}</div>
            <div class="cal-header">{{ t('calTue') }}</div>
            <div class="cal-header">{{ t('calWed') }}</div>
            <div class="cal-header">{{ t('calThu') }}</div>
            <div class="cal-header">{{ t('calFri') }}</div>
            <div class="cal-header">{{ t('calSat') }}</div>
            <div class="cal-header">{{ t('calSun') }}</div>
          </div>

          <div class="cal-grid">
            <div *ngFor="let cell of calendarCells" 
                 class="cal-cell"
                 [class.weekend]="cell.isWeekend"
                 [class.holiday]="cell.isHoliday"
                 [class.today-cell]="cell.isToday"
                 [class.over-limit]="cell.isOverLimit"
                 [class.other-month]="!cell.isCurrentMonth">
              <div class="cal-num" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <span [class.today-circle]="cell.isToday">{{ cell.day }}</span>
              </div>

              <!-- Badge Sarbatoare Legala cu Nume -->
              <div *ngIf="cell.isHoliday" class="cal-holiday-pill" [title]="cell.holidayName || t('holidayBadge')">
                <i class="fa-solid fa-flag" style="font-size:9px; margin-right:2px;"></i>
                <span>{{ cell.holidayName || t('holidayBadge') }}</span>
              </div>

              <div *ngFor="let entry of cell.absentEntries" 
                   class="cal-chip" 
                   (click)="openWorkflowModal(entry.request)"
                   [title]="entry.employeeName + ' - Click pentru istoric & PDF'">
                <i class="fa-solid fa-user"></i> {{ entry.employeeName }}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- MODAL RESPINGERE CU COMENTARIU OBLIGATORIU -->
    <div class="modal-overlay" *ngIf="isRejectModalOpen" [class.active]="isRejectModalOpen" (click)="closeRejectModal()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <strong style="color:var(--badge-red-text);">{{ t('modalRejectTitle') }}</strong>
          <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="closeRejectModal()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('labelRejectReason') }}</label>
          <textarea class="form-control" [(ngModel)]="rejectionComment" rows="3" [placeholder]="t('placeholderReject')" required></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-default" (click)="closeRejectModal()">{{ t('btnRejectCancel') }}</button>
          <button class="btn btn-danger" (click)="confirmReject()" [disabled]="!rejectionComment.trim()">{{ t('btnRejectConfirm') }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL WORKFLOW ISTORIC -->
    <div class="modal-overlay" *ngIf="isWorkflowModalOpen" [class.active]="isWorkflowModalOpen" (click)="closeWorkflowModal()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <strong>{{ t('modalWorkflowTitle') }}</strong>
            <span *ngIf="selectedWorkflowRequest" style="font-size:12px; color:var(--text-muted); margin-left:8px;">
              (#{{ selectedWorkflowRequest.leaveRequestId }} - {{ selectedWorkflowRequest.employeeName }})
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button *ngIf="selectedWorkflowRequest?.attachmentName" class="btn btn-default btn-sm" (click)="downloadAttachment(selectedWorkflowRequest!)" title="Descarca documentul justificativ" style="display:inline-flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-paperclip" style="color:var(--primary-color);"></i> {{ selectedWorkflowRequest?.attachmentName }}
            </button>
            <button *ngIf="selectedWorkflowRequest" class="btn btn-default btn-sm" (click)="downloadPDF(selectedWorkflowRequest)" [title]="t('btnPdf')" style="display:inline-flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-file-pdf" style="color:#dc2626;"></i> {{ t('btnPdf') }}
            </button>
            <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="closeWorkflowModal()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div *ngIf="workflowHistory.length === 0" style="color:var(--text-muted); font-size:13px; padding:12px 0;">
          Niciun istoric disponibil.
        </div>
        <div *ngFor="let step of workflowHistory" style="border-left:3px solid var(--primary-color); padding-left:12px; margin-bottom:12px;">
          <div style="font-weight:600; font-size:13px; color:var(--text-main);">
            <span [class]="getStatusBadgeClass(step.currentStatus)">{{ step.currentStatus }}</span>
            <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">{{ step.changedAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <div style="background:var(--bg-page); padding:6px 10px; border-radius:4px; margin-top:4px; font-size:12px; border:1px solid var(--border-color);">
            {{ step.comment || '-' }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  activeTab: 'requests' | 'calendar' = 'requests';
  allRequests: LeaveRequest[] = [];
  filteredRequests: LeaveRequest[] = [];
  filteredDeptRequests: LeaveRequest[] = [];
  departments: Department[] = [];
  leaveTypes: LeaveType[] = [];
  private destroy$ = new Subject<void>();

  // Filtre
  filters = {
    search: '',
    status: 'ALL',
    deptId: 'ALL',
    typeCode: 'ALL',
    startDate: '',
    endDate: ''
  };

  // Statistici
  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;

  // Calendar
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  calendarDeptId: number = 0;
  maxAllowedLimit = 2;
  maxOverlapCount = 0;
  calendarCells: CalendarDay[] = [];
  showHolidaysList = false;
  availableYears: number[] = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];

  // Modale
  isRejectModalOpen = false;
  pendingRejectRequest: LeaveRequest | null = null;
  rejectionComment = '';

  isWorkflowModalOpen = false;
  workflowHistory: LeaveWorkflow[] = [];
  selectedWorkflowRequest: LeaveRequest | null = null;

  private loadedEmplId: number | null = null;

  constructor(
    public authService: AuthService,
    public leaveService: LeaveService,
    public translationService: TranslationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.getUser$().pipe(takeUntil(this.destroy$)).subscribe(u => {
      const isNewUser = u && this.loadedEmplId !== u.emplId;
      this.user = u;
      if (isNewUser) {
        this.loadedEmplId = u.emplId;
        if (u.role === 'DEPT_RESP' && u.deptId) {
          this.filters.deptId = String(u.deptId);
          this.calendarDeptId = u.deptId;
        }
        this.loadInitialData();
      }
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['tab'] === 'calendar') {
        this.activeTab = 'calendar';
      } else if (params['tab'] === 'requests') {
        this.activeTab = 'requests';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isRejectModalOpen) {
      this.closeRejectModal();
    }
    if (this.isWorkflowModalOpen) {
      this.closeWorkflowModal();
    }
    if (this.showHolidaysList) {
      this.showHolidaysList = false;
    }
  }

  loadInitialData(): void {
    this.leaveService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe(depts => {
      this.departments = depts;
      if (this.departments && this.departments.length > 0) {
        const curDept = this.departments.find(d => d.deptId === Number(this.calendarDeptId));
        if (curDept) {
          this.calendarDeptId = curDept.deptId;
          this.maxAllowedLimit = curDept.maxAbsentEmployees || 2;
        } else {
          // If previous calendarDeptId does not exist or wasn't set, pick the first valid department
          this.calendarDeptId = this.departments[0].deptId;
          this.maxAllowedLimit = this.departments[0].maxAbsentEmployees || 2;
        }
      }
      this.renderCalendar();
    });

    this.leaveService.getLeaveTypes().pipe(takeUntil(this.destroy$)).subscribe(types => {
      this.leaveTypes = types;
    });

    this.loadRequests();
  }

  loadRequests(): void {
    if (this.user?.role === 'DEPT_RESP' && this.user.deptId) {
      this.leaveService.getLeaveRequestsByDepartment(this.user.deptId).pipe(takeUntil(this.destroy$)).subscribe({
        next: reqs => {
          this.allRequests = reqs;
          this.applyFilters();
          this.renderCalendar();
        },
        error: () => {
          this.allRequests = [];
          this.applyFilters();
        }
      });
    } else {
      this.leaveService.getAllLeaveRequests().pipe(takeUntil(this.destroy$)).subscribe({
        next: reqs => {
          this.allRequests = reqs;
          this.applyFilters();
          this.renderCalendar();
        },
        error: () => {
          this.allRequests = [];
          this.applyFilters();
        }
      });
    }
  }

  applyFilters(): void {
    const s = this.filters.search.toLowerCase().trim();

    this.filteredDeptRequests = this.allRequests;

    this.pendingCount = this.filteredDeptRequests.filter(r => r.status === 'PENDING').length;
    this.approvedCount = this.filteredDeptRequests.filter(r => r.status === 'APPROVED').length;
    this.rejectedCount = this.filteredDeptRequests.filter(r => r.status === 'REJECTED').length;

    this.filteredRequests = this.filteredDeptRequests.filter(r => {
      if (this.filters.status !== 'ALL' && r.status !== this.filters.status) {
        return false;
      }

      if (this.filters.deptId !== 'ALL' && r.deptId && r.deptId !== Number(this.filters.deptId)) {
        return false;
      }

      if (this.filters.typeCode !== 'ALL' && r.leaveTypeCode !== this.filters.typeCode) {
        return false;
      }

      if (s) {
        const matchName = (r.employeeName || '').toLowerCase().includes(s);
        const matchEmail = (r.employeeEmail || '').toLowerCase().includes(s);
        if (!matchName && !matchEmail) return false;
      }

      if (this.filters.startDate && r.endDate && r.endDate < this.filters.startDate) return false;
      if (this.filters.endDate && r.startDate && r.startDate > this.filters.endDate) return false;

      return true;
    });
  }

  resetFilters(): void {
    this.filters.search = '';
    this.filters.status = 'ALL';
    this.filters.typeCode = 'ALL';
    this.filters.startDate = '';
    this.filters.endDate = '';
    if (this.user?.role !== 'DEPT_RESP') {
      this.filters.deptId = 'ALL';
    }
    this.applyFilters();
  }

  approveRequest(req: LeaveRequest): void {
    if (!req.leaveRequestId || !this.user) return;

    this.leaveService.approveOrRejectRequest(req.leaveRequestId, this.user.emplId, 'APPROVE', 'Aprobat de manager').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadRequests();
        alert(`Cererea #${req.leaveRequestId} a fost aprobata cu succes!`);
      }
    });
  }

  openRejectModal(req: LeaveRequest): void {
    this.pendingRejectRequest = req;
    this.rejectionComment = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.pendingRejectRequest = null;
    this.rejectionComment = '';
  }

  confirmReject(): void {
    if (!this.pendingRejectRequest?.leaveRequestId || !this.user || !this.rejectionComment.trim()) return;

    this.leaveService.approveOrRejectRequest(this.pendingRejectRequest.leaveRequestId, this.user.emplId, 'REJECT', this.rejectionComment).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.closeRejectModal();
        this.loadRequests();
        alert('Cererea a fost respinsa, iar motivul a fost transmis angajatului.');
      }
    });
  }

  openWorkflowModal(req: LeaveRequest): void {
    if (!req.leaveRequestId) return;
    this.selectedWorkflowRequest = req;
    this.leaveService.getWorkflowHistory(req.leaveRequestId).pipe(takeUntil(this.destroy$)).subscribe({
      next: history => {
        this.workflowHistory = history;
        this.isWorkflowModalOpen = true;
      }
    });
  }

  closeWorkflowModal(): void {
    this.isWorkflowModalOpen = false;
    this.selectedWorkflowRequest = null;
  }

  downloadPDF(req: LeaveRequest): void {
    this.leaveService.generateClientLeavePdf(req);
  }

  downloadAttachment(req: LeaveRequest): void {
    if (!req.attachmentId) {
      alert('Nu exista niciun document atasat pentru aceasta cerere.');
      return;
    }
    this.leaveService.downloadAttachmentFile(req.attachmentId, req.attachmentName);
  }

  downloadDeptReport(): void {
    let selectedDept: Department | null = null;

    if (this.user?.role === 'DEPT_RESP' && this.user.deptId) {
      selectedDept = this.departments.find(d => d.deptId === this.user!.deptId) || null;
    } else if (this.filters.deptId && this.filters.deptId !== 'ALL') {
      selectedDept = this.departments.find(d => d.deptId === Number(this.filters.deptId)) || null;
    }

    const deptToReport: Department = selectedDept ? selectedDept : {
      deptId: 0,
      departmentName: 'Toate Departamentele',
      managerId: 0,
      maxAbsentEmployees: 0
    };

    this.leaveService.generateDepartmentReportPdf(deptToReport, this.filteredRequests);
  }

  downloadPendingReport(): void {
    const pending = this.allRequests.filter(r => r.status === 'PENDING');
    this.leaveService.generatePendingReportPdf(pending);
  }

  // CALENDAR LOGIC
  onCalendarDeptChange(): void {
    const curDept = this.departments.find(d => d.deptId === Number(this.calendarDeptId));
    if (curDept) {
      this.maxAllowedLimit = curDept.maxAbsentEmployees;
    }
    this.renderCalendar();
  }

  changeMonth(delta: number): void {
    this.currentMonth += delta;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.renderCalendar();
  }

  changeYear(delta: number): void {
    this.currentYear = Number(this.currentYear) + delta;
    this.renderCalendar();
  }

  onYearChange(): void {
    this.currentYear = Number(this.currentYear);
    this.renderCalendar();
  }

  goToToday(): void {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.renderCalendar();
  }

  toggleHolidaysList(): void {
    this.showHolidaysList = !this.showHolidaysList;
  }

  getYearHolidaysCount(): number {
    return this.getCurrentYearHolidays().length;
  }

  getCurrentYearHolidays(): Array<{ date: string; name: string; isMobile: boolean; dayOfWeekName: string }> {
    const lang = (this.translationService.currentLang === 'en' ? 'en' : 'ro');
    return this.leaveService.getAllHolidaysForYear(this.currentYear, lang);
  }

  formatHolidayDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  getMonthName(): string {
    const monthNamesRo = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const names = this.translationService.currentLang === 'ro' ? monthNamesRo : monthNamesEn;
    return names[this.currentMonth];
  }

  getMonthYearTitle(): string {
    return `${this.getMonthName()} ${this.currentYear}`;
  }

  renderCalendar(): void {
    const year = this.currentYear;
    const month = this.currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const lang = (this.translationService.currentLang === 'en' ? 'en' : 'ro');

    // Luni = 0, Duminica = 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    this.calendarCells = [];
    let maxOverlap = 0;

    // Zile din luna precedenta pentru aliniere
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      this.calendarCells.push({
        day: dayNum,
        dateStr: '',
        isWeekend: false,
        isHoliday: false,
        isCurrentMonth: false,
        isOverLimit: false,
        absentEntries: []
      });
    }

    // Zile din luna curenta
    for (let day = 1; day <= numDays; day++) {
      const mm = (month + 1) < 10 ? '0' + (month + 1) : (month + 1);
      const dd = day < 10 ? '0' + day : day;
      const dateStr = `${year}-${mm}-${dd}`;
      const dateObj = new Date(year, month, day);
      const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
      const holidayName = this.leaveService.getHolidayName(dateStr, lang);
      const isHoliday = !!holidayName;
      const isToday = (dateStr === todayStr);

      const absentEntries: CalendarLeaveEntry[] = [];
      this.allRequests.forEach(r => {
        if ((r.status === 'APPROVED' || r.status === 'PENDING') && r.startDate && r.endDate) {
          const s = r.startDate.split('T')[0];
          const e = r.endDate.split('T')[0];
          if (dateStr >= s && dateStr <= e) {
            if (!this.calendarDeptId || !r.deptId || r.deptId === Number(this.calendarDeptId)) {
              if (r.employeeName && !absentEntries.some(entry => entry.request.leaveRequestId === r.leaveRequestId)) {
                absentEntries.push({
                  employeeName: r.employeeName,
                  request: r
                });
              }
            }
          }
        }
      });

      const isWorkingDay = !isWeekend && !isHoliday;
      if (isWorkingDay && absentEntries.length > maxOverlap) {
        maxOverlap = absentEntries.length;
      }
      const isOverLimit = isWorkingDay && (absentEntries.length > this.maxAllowedLimit);

      this.calendarCells.push({
        day: day,
        dateStr: dateStr,
        isWeekend: isWeekend,
        isHoliday: isHoliday,
        holidayName: holidayName || undefined,
        isToday: isToday,
        isCurrentMonth: true,
        isOverLimit: isOverLimit,
        absentEntries: absentEntries
      });
    }

    this.maxOverlapCount = maxOverlap;
  }

  getOverlapWarningText(): string {
    const raw = this.t('overlapWarning');
    return raw.replace('{count}', String(this.maxOverlapCount)).replace('{limit}', String(this.maxAllowedLimit));
  }

  getDeptName(deptId?: number): string {
    const d = this.departments.find(x => x.deptId === deptId);
    if (!d) return 'General';
    return (this.translationService.currentLang === 'en' && d.departmentNameEn) ? d.departmentNameEn : d.departmentName;
  }

  getReqDeptName(req: LeaveRequest): string {
    if (this.translationService.currentLang === 'en' && req.departmentNameEn) {
      return req.departmentNameEn;
    }
    if (req.deptId) {
      return this.getDeptName(req.deptId);
    }
    return req.departmentName || 'General';
  }

  getTypeName(lt?: LeaveType | null): string {
    if (!lt) return '-';
    return (this.translationService.currentLang === 'en' && lt.nameEn) ? lt.nameEn : lt.name;
  }

  getReqTypeName(req: LeaveRequest): string {
    if (this.translationService.currentLang === 'en' && req.leaveTypeNameEn) {
      return req.leaveTypeNameEn;
    }
    if (req.leaveTypeId) {
      const type = this.leaveTypes.find(t => t.leaveTypeId === req.leaveTypeId);
      if (type) return this.getTypeName(type);
    }
    return req.leaveTypeName || 'N/A';
  }

  formatDate(str?: string): string {
    if (!str) return '';
    const parts = str.split('T')[0].split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str;
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'APPROVED': return 'badge badge-approved';
      case 'PENDING': return 'badge badge-pending';
      case 'REJECTED': return 'badge badge-rejected';
      case 'CANCELLED': return 'badge badge-cancelled';
      default: return 'badge badge-grey';
    }
  }

  t(key: string): string {
    return this.translationService.t(key);
  }
}
