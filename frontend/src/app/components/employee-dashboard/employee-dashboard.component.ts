import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, AuthUser } from '../../services/auth.service';
import { LeaveService } from '../../services/leave.service';
import { TranslationService } from '../../services/translation.service';
import { LeaveRequest, LeaveType, LeaveWorkflow } from '../../models/leave.model';

export interface PickerCalendarCell {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isHoverRange: boolean;
  existingStatus?: 'APPROVED' | 'PENDING';
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="main-container">
      
      <!-- Cadrane Statistici Solduri Angajat -->
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-label">{{ t('statAvailable') }}</div>
          <div class="stat-value" style="color:#059669;">
            {{ netAvailableDays }} {{ t('unitDays') }}
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('statUsed') }}</div>
          <div class="stat-value">
            {{ usedDays }} {{ t('unitDays') }}
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">{{ t('statPending') }}</div>
          <div class="stat-value" style="color:#d97706;">
            {{ pendingCoDays }} {{ t('unitDays') }}
          </div>
        </div>
      </div>

      <!-- Panoul cu Lista Cererilor Mele -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">{{ t('panelMyRequestsTitle') }}</span>
          <button class="btn btn-primary" (click)="openNewRequestModal()">
            <i class="fa-solid fa-plus"></i> <span>{{ t('btnAddRequest') }}</span>
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>{{ t('thId') }}</th>
              <th>{{ t('thType') }}</th>
              <th>{{ t('thPeriod') }}</th>
              <th>{{ t('thWorkingDays') }}</th>
              <th>{{ t('thCreatedAt') }}</th>
              <th>{{ t('thStatusDetails') }}</th>
              <th>{{ t('thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let req of myRequests">
              <td><strong>#{{ req.leaveRequestId }}</strong></td>
              <td>{{ getReqTypeName(req) }}</td>
              <td>{{ formatDate(req.startDate) }} - {{ formatDate(req.endDate) }}</td>
              <td>{{ req.workingDays }} {{ t('unitDays') }}</td>
              <td>{{ req.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span [class]="getStatusBadgeClass(req.status)">{{ req.status }}</span>
                
                <!-- Atasament indicator -->
                <div *ngIf="req.attachmentName" style="margin-top: 4px;">
                  <button type="button" class="btn btn-default btn-sm" (click)="downloadAttachment(req)" title="Descarca documentul justificativ" style="padding:2px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
                    <i class="fa-solid fa-paperclip" style="color:var(--primary-color);"></i>
                    <span style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ req.attachmentName }}</span>
                  </button>
                </div>

                <!-- Caseta motiv respingere -->
                <div *ngIf="req.status === 'REJECTED' && req.rejectionReason" class="rejection-box">
                  <i class="fa-solid fa-circle-exclamation"></i> <strong>{{ t('reasonLabel') }}</strong> {{ req.rejectionReason }}
                </div>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-default btn-sm" (click)="downloadPDF(req)" title="Descarca Cererea PDF">
                    <i class="fa-solid fa-file-pdf"></i> {{ t('btnPdf') }}
                  </button>
                  <button class="btn btn-default btn-sm" (click)="openWorkflowModal(req)" title="Vezi istoricul">
                    <i class="fa-solid fa-history"></i> {{ t('btnHistory') }}
                  </button>

                  <!-- Optiuni In Asteptare (PENDING) -->
                  <button *ngIf="req.status === 'PENDING'" class="btn btn-danger btn-sm" (click)="cancelRequest(req)" title="Anuleaza cererea">
                    {{ t('btnCancel') }}
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="myRequests.length === 0">
              <td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">
                {{ t('noRequestsText') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- MODAL 1: Creare Cerere Noua cu Calendar Vizual Interactiv -->
    <div class="modal-overlay" *ngIf="isRequestModalOpen" [class.active]="isRequestModalOpen" (click)="closeRequestModal()">
      <div class="modal-box modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-calendar-plus" style="color:var(--primary-color); font-size:18px;"></i>
            <strong>{{ t('modalNewTitle') }}</strong>
          </div>
          <button style="border:none; background:none; cursor:pointer; color:var(--text-main); font-size:16px;" (click)="closeRequestModal()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form (ngSubmit)="$event.preventDefault()">
          <div class="form-group">
            <label class="form-label">{{ t('labelType') }}</label>
            <select class="form-control" [(ngModel)]="formRequest.leaveTypeId" name="leaveTypeId" (change)="onLeaveTypeChange()" required>
              <option *ngFor="let lt of leaveTypes" [ngValue]="lt.leaveTypeId">
                {{ getTypeName(lt) }} ({{ lt.code }}) {{ lt.requiresAttachment ? ' *Document' : '' }}
              </option>
            </select>
          </div>

          <!-- CALENDAR VIZUAL INTERACTIV PENTRU SELECTIE PERIOADA -->
          <div class="picker-cal-wrap">
            <div class="picker-cal-header">
              <div class="picker-cal-title">
                <i class="fa-regular fa-calendar-days" style="color:var(--primary-color); margin-right:6px;"></i>
                <span>{{ getPickerMonthName() }} {{ pickerYear }}</span>
              </div>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="picker-cal-nav-btn" (click)="todayPickerMonth()" title="Luna curenta">
                  <i class="fa-solid fa-calendar-day"></i>
                </button>
                <button type="button" class="picker-cal-nav-btn" (click)="prevPickerMonth()" title="Luna precedenta">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button type="button" class="picker-cal-nav-btn" (click)="nextPickerMonth()" title="Luna urmatoare">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>

            <!-- Antet Zile Saptamana -->
            <div class="picker-cal-grid" style="margin-bottom:4px;">
              <div class="picker-cal-weekday">Lu</div>
              <div class="picker-cal-weekday">Ma</div>
              <div class="picker-cal-weekday">Mi</div>
              <div class="picker-cal-weekday">Jo</div>
              <div class="picker-cal-weekday">Vi</div>
              <div class="picker-cal-weekday weekend">Sâ</div>
              <div class="picker-cal-weekday weekend">Du</div>
            </div>

            <!-- Grila Zile Interactive -->
            <div class="picker-cal-grid" (mouseleave)="onPickerDayLeave()">
              <div *ngFor="let c of pickerCells"
                   class="picker-cal-day"
                   [class.other-month]="!c.isCurrentMonth"
                   [class.weekend]="c.isWeekend"
                   [class.holiday]="c.isHoliday"
                   [class.is-today]="c.isToday"
                   [class.is-start]="c.isStart"
                   [class.is-end]="c.isEnd"
                   [class.in-range]="c.isInRange"
                   [class.hover-range]="c.isHoverRange"
                   (click)="onPickerDayClick(c)"
                   (mouseenter)="onPickerDayHover(c.dateStr)"
                   [title]="c.holidayName || (c.existingStatus ? ('Cerere ' + c.existingStatus) : (c.isWeekend ? 'Weekend' : c.dateStr))">
                <span class="picker-cal-num">{{ c.day }}</span>
                <span *ngIf="c.holidayName" class="picker-badge-indicator picker-badge-holiday">Libere</span>
                <span *ngIf="c.existingStatus === 'APPROVED'" class="picker-badge-indicator picker-badge-booked">Aprobat</span>
                <span *ngIf="c.existingStatus === 'PENDING'" class="picker-badge-indicator picker-badge-pending">Pending</span>
              </div>
            </div>

            <!-- Presetari Rapide -->
            <div class="picker-quick-presets">
              <span style="font-size:11px; color:var(--text-muted); align-self:center; margin-right:4px;">Selectie rapida:</span>
              <button type="button" class="picker-preset-btn" (click)="setQuickRange('today')">Astazi</button>
              <button type="button" class="picker-preset-btn" (click)="setQuickRange('thisWeek')">Saptamana curenta (Lu-Vi)</button>
              <button type="button" class="picker-preset-btn" (click)="setQuickRange('nextWeek')">Saptamana viitoare (Lu-Vi)</button>
            </div>
          </div>

          <!-- Campuri de Data Sincronizate -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-label">{{ t('labelStart') }}</label>
              <input type="date" class="form-control" [(ngModel)]="formRequest.startDate" name="startDate" (change)="onStartDateChange()" required>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('labelEnd') }}</label>
              <input type="date" class="form-control" [class.is-invalid]="dateError" [min]="formRequest.startDate" [(ngModel)]="formRequest.endDate" name="endDate" (change)="onEndDateChange()" required>
            </div>
          </div>

          <!-- Caseta Calcul Zile Lucratoare & Sumar Excluderi -->
          <div style="background:var(--bg-page); padding:10px 12px; border-radius:6px; margin-bottom:12px; font-size:13px; border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span>{{ t('calcText') }}</span>
                <strong style="color:var(--primary-color); margin-left:6px; font-size:14px;">{{ calculatedDays }} {{ calculatedDays === 1 ? t('unitDaySingular') : t('unitDays') }}</strong>
              </div>
              <span style="color:var(--text-muted); font-size:12px;" *ngIf="formRequest.startDate && formRequest.endDate && calculatedDays > 0">
                ({{ getNonWorkingDaysCount() }} zile libere / weekend excluse)
              </span>
            </div>
          </div>

          <!-- Mesaj Eroare Date Invalide -->
          <div *ngIf="dateError" style="background:var(--badge-red-bg); color:var(--badge-red-text); padding:8px 10px; border-radius:6px; margin-bottom:12px; font-size:12px; font-weight:500;">
            <i class="fa-solid fa-circle-exclamation"></i> <span>{{ t('dateErrText') }}</span>
          </div>

          <!-- Camp Document Atasat Obligatoriu/Optional -->
          <div class="form-group" *ngIf="selectedLeaveType?.requiresAttachment">
            <label class="form-label" style="margin-bottom:2px;">{{ t('labelAttach') }}</label>
            <div style="color:var(--text-muted); font-size:11px; margin-bottom:6px;">(Max. 10 MB: PDF, PNG, JPG, DOC, DOCX)</div>
            <input type="file" class="form-control" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx">
            <small *ngIf="currentAttachmentNotice" style="color:var(--primary-color); display:block; margin-top:4px; font-size:12px;">
              <i class="fa-solid fa-paperclip"></i> {{ currentAttachmentNotice }}
            </small>
            <small *ngIf="showMissingFileError" style="color:var(--text-main); display:block; margin-top:6px; font-size:12px; font-weight:500;">
              <i class="fa-solid fa-circle-exclamation"></i> Incarcarea documentului justificativ (ex: certificat de concediu medical) este obligatorie.
            </small>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; gap:8px;">
            <button type="button" class="btn btn-default" (click)="closeRequestModal()">
              {{ t('btnModalCancel') }}
            </button>
            <button type="button" class="btn btn-primary" (click)="submitRequest()" [disabled]="calculatedDays <= 0 || dateError || !formRequest.leaveTypeId">
              <i class="fa-solid fa-paper-plane"></i> {{ t('btnModalSubmit') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: Istoric Workflow Status -->
    <div class="modal-overlay" *ngIf="isWorkflowModalOpen" [class.active]="isWorkflowModalOpen" (click)="closeWorkflowModal()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <strong>{{ t('modalWorkflowTitle') }}</strong>
            <span *ngIf="selectedWorkflowRequest" style="font-size:12px; color:var(--text-muted); margin-left:8px;">
              (#{{ selectedWorkflowRequest.leaveRequestId }} - {{ selectedWorkflowRequest.leaveTypeName }})
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
          <div style="color:var(--text-muted); font-size:12px; margin-top:2px;">
            {{ t('modifiedBy') }} <strong>{{ step.emplId === user?.emplId ? user?.name : 'Manager / Admin' }}</strong>
          </div>
          <div style="background:var(--bg-page); padding:6px 10px; border-radius:4px; margin-top:4px; font-size:12px; border:1px solid var(--border-color);">
            {{ step.comment || '-' }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  myRequests: LeaveRequest[] = [];
  leaveTypes: LeaveType[] = [];
  private destroy$ = new Subject<void>();

  // Statistici calculate
  usedDays = 0;
  pendingCoDays = 0;
  netAvailableDays = 0;

  // Stare Formular / Modale
  isRequestModalOpen = false;
  isWorkflowModalOpen = false;
  workflowHistory: LeaveWorkflow[] = [];
  selectedWorkflowRequest: LeaveRequest | null = null;

  editRequestId: number | null = null;
  formRequest: Partial<LeaveRequest> = {
    startDate: '',
    endDate: ''
  };

  selectedLeaveType: LeaveType | null = null;
  calculatedDays = 0;
  dateError = false;
  selectedFile: File | null = null;
  currentAttachmentNotice = '';
  showMissingFileError = false;

  // Calendar Vizual Interactiv pentru selectie perioada
  pickerYear = new Date().getFullYear();
  pickerMonth = new Date().getMonth();
  hoverDate: string | null = null;
  pickerCells: Array<{
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string;
    isToday: boolean;
    isStart: boolean;
    isEnd: boolean;
    isInRange: boolean;
    isHoverRange: boolean;
    existingStatus?: 'APPROVED' | 'PENDING';
  }> = [];

  private monthNamesRo = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  private monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  private loadedEmplId: number | null = null;

  constructor(
    public authService: AuthService,
    public leaveService: LeaveService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser$().pipe(takeUntil(this.destroy$)).subscribe(u => {
      const isNewUser = u && this.loadedEmplId !== u.emplId;
      this.user = u;
      if (isNewUser) {
        this.loadedEmplId = u.emplId;
        this.loadData();
      } else if (u) {
        this.calculateBalances();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isRequestModalOpen) {
      this.closeRequestModal();
    }
    if (this.isWorkflowModalOpen) {
      this.closeWorkflowModal();
    }
  }

  loadData(): void {
    if (!this.user) return;

    this.leaveService.getLeaveTypes().pipe(takeUntil(this.destroy$)).subscribe({
      next: types => {
        this.leaveTypes = types;
        if (types.length > 0 && !this.isRequestModalOpen) {
          if (!this.formRequest.leaveTypeId || !types.some(t => t.leaveTypeId === Number(this.formRequest.leaveTypeId))) {
            this.formRequest.leaveTypeId = types[0].leaveTypeId;
            this.selectedLeaveType = types[0];
          }
        }
      }
    });

    this.leaveService.getLeaveRequestsByEmployee(this.user.emplId).pipe(takeUntil(this.destroy$)).subscribe({
      next: reqs => {
        this.myRequests = reqs;
        this.calculateBalances();
        if (this.isRequestModalOpen) {
          this.renderPickerCalendar();
        }
      }
    });
  }

  calculateBalances(): void {
    if (!this.user) return;

    // Calcul zile PENDING pentru concediu de odihna (CO)
    this.pendingCoDays = this.myRequests
      .filter(r => r.status === 'PENDING' && (r.leaveTypeCode === 'CO' || (r.leaveTypeName && r.leaveTypeName.toLowerCase().includes('odihna'))))
      .reduce((sum, r) => sum + (r.workingDays || 0), 0);

    const totalAnnual = this.user.annualLeaveDays || 24;
    const available = this.user.availableLeaveDays || 0;
    this.usedDays = Math.max(0, totalAnnual - available);
    this.netAvailableDays = Math.max(0, available - this.pendingCoDays);
  }

  openNewRequestModal(): void {
    const defaultType = this.leaveTypes.length > 0 ? this.leaveTypes[0] : null;
    this.formRequest = {
      leaveTypeId: defaultType ? defaultType.leaveTypeId : undefined,
      startDate: '',
      endDate: ''
    };
    this.selectedLeaveType = defaultType;
    this.calculatedDays = 0;
    this.dateError = false;
    this.selectedFile = null;
    this.currentAttachmentNotice = '';
    this.showMissingFileError = false;
    this.hoverDate = null;

    const now = new Date();
    this.pickerYear = now.getFullYear();
    this.pickerMonth = now.getMonth();
    this.renderPickerCalendar();

    this.isRequestModalOpen = true;
  }

  closeRequestModal(): void {
    this.isRequestModalOpen = false;
    this.showMissingFileError = false;
    this.hoverDate = null;
  }

  onLeaveTypeChange(): void {
    this.selectedLeaveType = this.leaveTypes.find(t => t.leaveTypeId === Number(this.formRequest.leaveTypeId)) || null;
    this.showMissingFileError = false;
  }

  // --- CALENDAR VIZUAL INTERACTIV & RANGE PICKER LOGIC ---

  getPickerMonthName(): string {
    const list = this.translationService.currentLang === 'en' ? this.monthNamesEn : this.monthNamesRo;
    return list[this.pickerMonth] || '';
  }

  prevPickerMonth(): void {
    if (this.pickerMonth === 0) {
      this.pickerMonth = 11;
      this.pickerYear--;
    } else {
      this.pickerMonth--;
    }
    this.renderPickerCalendar();
  }

  nextPickerMonth(): void {
    if (this.pickerMonth === 11) {
      this.pickerMonth = 0;
      this.pickerYear++;
    } else {
      this.pickerMonth++;
    }
    this.renderPickerCalendar();
  }

  todayPickerMonth(): void {
    const now = new Date();
    this.pickerYear = now.getFullYear();
    this.pickerMonth = now.getMonth();
    this.renderPickerCalendar();
  }

  renderPickerCalendar(): void {
    const year = this.pickerYear;
    const month = this.pickerMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const lang = this.translationService.currentLang === 'en' ? 'en' : 'ro';

    let startingDay = firstDay.getDay() - 1; // Luni = 0
    if (startingDay < 0) startingDay = 6;

    this.pickerCells = [];

    // Zile din luna precedenta
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dNum);
      const prevMm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevDd = String(dNum).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${prevMm}-${prevDd}`;
      const isWeekend = (prevDate.getDay() === 0 || prevDate.getDay() === 6);

      this.pickerCells.push({
        day: dNum,
        dateStr: dateStr,
        isCurrentMonth: false,
        isWeekend: isWeekend,
        isHoliday: false,
        isToday: false,
        isStart: this.formRequest.startDate === dateStr,
        isEnd: this.formRequest.endDate === dateStr,
        isInRange: this.isDateInRange(dateStr),
        isHoverRange: this.isDateInHoverRange(dateStr)
      });
    }

    // Zile din luna curenta
    for (let day = 1; day <= numDays; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dateObj = new Date(year, month, day);
      const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
      const holidayName = this.leaveService.getHolidayName(dateStr, lang);
      const isHoliday = !!holidayName;
      const isToday = (dateStr === todayStr);

      // Verificare daca exista deja o cerere depusa pentru aceasta zi
      let existingStatus: 'APPROVED' | 'PENDING' | undefined;
      const matchedReq = this.myRequests.find(r => {
        if ((r.status === 'APPROVED' || r.status === 'PENDING') && r.startDate && r.endDate) {
          const s = r.startDate.split('T')[0];
          const e = r.endDate.split('T')[0];
          return dateStr >= s && dateStr <= e;
        }
        return false;
      });
      if (matchedReq) {
        existingStatus = matchedReq.status as 'APPROVED' | 'PENDING';
      }

      this.pickerCells.push({
        day: day,
        dateStr: dateStr,
        isCurrentMonth: true,
        isWeekend: isWeekend,
        isHoliday: isHoliday,
        holidayName: holidayName || undefined,
        isToday: isToday,
        isStart: this.formRequest.startDate === dateStr,
        isEnd: this.formRequest.endDate === dateStr,
        isInRange: this.isDateInRange(dateStr),
        isHoverRange: this.isDateInHoverRange(dateStr),
        existingStatus: existingStatus
      });
    }

    // Zile din luna urmatoare pentru a completa grila de 7 coloane
    const totalRendered = this.pickerCells.length;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const nextMm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextDd = String(i).padStart(2, '0');
      const dateStr = `${nextDate.getFullYear()}-${nextMm}-${nextDd}`;
      const isWeekend = (nextDate.getDay() === 0 || nextDate.getDay() === 6);

      this.pickerCells.push({
        day: i,
        dateStr: dateStr,
        isCurrentMonth: false,
        isWeekend: isWeekend,
        isHoliday: false,
        isToday: false,
        isStart: this.formRequest.startDate === dateStr,
        isEnd: this.formRequest.endDate === dateStr,
        isInRange: this.isDateInRange(dateStr),
        isHoverRange: this.isDateInHoverRange(dateStr)
      });
    }
  }

  private isDateInRange(dateStr: string): boolean {
    const s = this.formRequest.startDate;
    const e = this.formRequest.endDate;
    if (!s || !e) return false;
    return dateStr >= s && dateStr <= e;
  }

  private isDateInHoverRange(dateStr: string): boolean {
    const s = this.formRequest.startDate;
    const e = this.formRequest.endDate;
    const h = this.hoverDate;
    if (!s || e || !h) return false;
    return dateStr >= s && dateStr <= h;
  }

  onPickerDayClick(cell: PickerCalendarCell): void {
    if (!cell.isCurrentMonth) {
      const clickedDate = new Date(cell.dateStr);
      this.pickerYear = clickedDate.getFullYear();
      this.pickerMonth = clickedDate.getMonth();
    }

    const clicked = cell.dateStr;
    const s = this.formRequest.startDate;
    const e = this.formRequest.endDate;

    if (!s || (s && e)) {
      this.formRequest.startDate = clicked;
      this.formRequest.endDate = '';
    } else if (clicked >= s) {
      this.formRequest.endDate = clicked;
      this.hoverDate = null;
    } else {
      this.formRequest.startDate = clicked;
      this.formRequest.endDate = '';
      this.hoverDate = null;
    }

    this.calcDays();
    this.renderPickerCalendar();
  }

  onPickerDayHover(dateStr: string): void {
    if (this.formRequest.startDate && !this.formRequest.endDate && dateStr >= this.formRequest.startDate) {
      this.hoverDate = dateStr;
      this.updateHoverRanges();
    }
  }

  onPickerDayLeave(): void {
    if (this.hoverDate) {
      this.hoverDate = null;
      this.updateHoverRanges();
    }
  }

  private updateHoverRanges(): void {
    for (const c of this.pickerCells) {
      c.isHoverRange = this.isDateInHoverRange(c.dateStr);
    }
  }

  setQuickRange(preset: 'today' | 'thisWeek' | 'nextWeek'): void {
    const now = new Date();
    const toDateString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === 'today') {
      const todayStr = toDateString(now);
      this.formRequest.startDate = todayStr;
      this.formRequest.endDate = todayStr;
      this.pickerYear = now.getFullYear();
      this.pickerMonth = now.getMonth();
    } else if (preset === 'thisWeek') {
      const dayOfWeek = now.getDay(); // 0 Duminica, 1 Luni
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      this.formRequest.startDate = toDateString(monday);
      this.formRequest.endDate = toDateString(friday);
      this.pickerYear = monday.getFullYear();
      this.pickerMonth = monday.getMonth();
    } else if (preset === 'nextWeek') {
      const dayOfWeek = now.getDay();
      const nextMonOffset = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + nextMonOffset);
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);

      this.formRequest.startDate = toDateString(nextMon);
      this.formRequest.endDate = toDateString(nextFri);
      this.pickerYear = nextMon.getFullYear();
      this.pickerMonth = nextMon.getMonth();
    }

    this.calcDays();
    this.renderPickerCalendar();
  }

  getNonWorkingDaysCount(): number {
    const s = this.formRequest.startDate;
    const e = this.formRequest.endDate;
    if (!s || !e || e < s) return 0;

    const start = new Date(s);
    const end = new Date(e);
    let totalCalendarDays = 0;
    const cur = new Date(start);

    while (cur <= end) {
      totalCalendarDays++;
      cur.setDate(cur.getDate() + 1);
    }

    return Math.max(0, totalCalendarDays - this.calculatedDays);
  }

  onStartDateChange(): void {
    if (this.formRequest.startDate && this.formRequest.endDate && this.formRequest.endDate < this.formRequest.startDate) {
      this.formRequest.endDate = this.formRequest.startDate;
    }
    if (this.formRequest.startDate) {
      const d = new Date(this.formRequest.startDate);
      this.pickerYear = d.getFullYear();
      this.pickerMonth = d.getMonth();
    }
    this.calcDays();
    this.renderPickerCalendar();
  }

  onEndDateChange(): void {
    this.calcDays();
    this.renderPickerCalendar();
  }

  calcDays(): void {
    const s = this.formRequest.startDate;
    const e = this.formRequest.endDate;

    if (!s || !e) {
      this.dateError = false;
      this.calculatedDays = 0;
      return;
    }

    if (e < s) {
      this.dateError = true;
      this.calculatedDays = 0;
      return;
    }

    this.dateError = false;
    this.calculatedDays = this.leaveService.calculateWorkingDays(s, e);
  }

  onFileSelected(event: any): void {
    this.showMissingFileError = false;
    if (event.target.files && event.target.files.length > 0) {
      const file: File = event.target.files[0];
      const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedExtensions.includes(extension)) {
        alert('Tip de fisier nepermis! Sunt acceptate doar documente si imagini: PDF, PNG, JPG, JPEG, DOC, DOCX.');
        event.target.value = '';
        this.selectedFile = null;
        return;
      }

      const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSizeBytes) {
        alert('Fisierul depaseste dimensiunea maxima permisa de 10 MB.');
        event.target.value = '';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
    }
  }

  submitRequest(): void {
    if (!this.user || !this.formRequest.startDate || !this.formRequest.endDate) return;

    if (this.calculatedDays <= 0) {
      alert(this.t('dateErrText'));
      return;
    }

    // Validare sold CO
    const code = this.selectedLeaveType?.code || 'CO';
    if (code === 'CO' && this.calculatedDays > this.netAvailableDays) {
      alert(`Sold insuficient de zile de concediu disponibile! (Disponibil net: ${this.netAvailableDays} zile, solicitate: ${this.calculatedDays} zile)`);
      return;
    }

    // Validare document atasat obligatoriu pentru tipuri care il cer
    if (this.selectedLeaveType?.requiresAttachment && !this.selectedFile && !this.currentAttachmentNotice) {
      this.showMissingFileError = true;
      return;
    }

    // Validare suprapunere cereri proprii active (PENDING sau APPROVED)
    const s = this.formRequest.startDate;
    const e = this.formRequest.endDate;
    const overlapping = this.myRequests.find(r => 
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      r.startDate && r.endDate &&
      !(r.endDate.split('T')[0] < s || r.startDate.split('T')[0] > e)
    );

    if (overlapping) {
      alert(`Aveti deja o cerere activa (${overlapping.status}) in perioada ${overlapping.startDate.split('T')[0]} - ${overlapping.endDate.split('T')[0]} (Cererea #${overlapping.leaveRequestId})!`);
      return;
    }

    const payload = {
      emplId: this.user.emplId,
      leaveTypeId: Number(this.formRequest.leaveTypeId),
      startDate: this.formRequest.startDate,
      endDate: this.formRequest.endDate,
      workingDays: this.calculatedDays,
      status: 'PENDING'
    };

    this.leaveService.createLeaveRequest(payload, 'PENDING').pipe(takeUntil(this.destroy$)).subscribe({
      next: created => {
        if (this.selectedFile && created.leaveRequestId) {
          this.leaveService.uploadAttachment(created.leaveRequestId, this.selectedFile).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.closeRequestModal();
              this.loadData();
              this.authService.refreshUser();
              alert('Cererea si documentul justificativ au fost trimise cu succes spre aprobare!');
            },
            error: (err) => alert(err?.error?.message || err?.error || 'Eroare la incarcarea fisierului.')
          });
        } else {
          this.closeRequestModal();
          this.loadData();
          this.authService.refreshUser();
          alert('Cererea a fost trimisa cu succes spre aprobare!');
        }
      },
      error: (err) => alert(err?.error?.message || err?.error || 'Eroare la trimiterea cererii.')
    });
  }

  downloadAttachment(req: LeaveRequest): void {
    if (!req.attachmentId) {
      alert('Nu exista niciun document atasat pentru aceasta cerere.');
      return;
    }
    this.leaveService.downloadAttachmentFile(req.attachmentId, req.attachmentName);
  }

  cancelRequest(req: LeaveRequest): void {
    if (!req.leaveRequestId || !this.user) return;
    if (!confirm('Esti sigur ca doresti sa anulezi cererea?')) return;

    this.leaveService.cancelLeaveRequest(req.leaveRequestId, this.user.emplId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadData();
        this.authService.refreshUser();
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

  t(key: string): string {
    return this.translationService.t(key);
  }
}
