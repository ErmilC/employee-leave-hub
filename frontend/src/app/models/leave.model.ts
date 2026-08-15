export interface Employee {
  emplId: number;
  name: string;
  email: string;
  password?: string;
  role: 'USER' | 'DEPT_RESP' | 'ADMIN';
  deptId: number;
  annualLeaveDays: number;
  availableLeaveDays: number;
}

export interface Department {
  deptId: number;
  departmentName: string;
  departmentNameEn?: string;
  managerId: number;
  maxAbsentEmployees: number;
}

export interface LeaveType {
  leaveTypeId: number;
  name: string;
  nameEn?: string;
  code: string;
  requiresAttachment: boolean;
  paid: boolean;
}

export interface LeaveRequest {
  leaveRequestId?: number;
  emplId: number;
  employeeName?: string;
  employeeEmail?: string;
  deptId?: number;
  departmentName?: string;
  departmentNameEn?: string;
  leaveTypeId: number;
  leaveTypeName?: string;
  leaveTypeNameEn?: string;
  leaveTypeCode?: string;
  requiresAttachment?: boolean;
  startDate: string;
  endDate: string;
  workingDays?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  attachmentId?: number;
  attachmentName?: string;
  createdAt?: string;
}

export interface LeaveWorkflow {
  workflowId: number;
  leaveRequestId: number;
  emplId: number;
  oldStatus?: string;
  currentStatus: string;
  changedAt: string;
  comment?: string;
}

export interface DepartmentOverlap {
  date: string;
  absentCount: number;
  maxAllowed: number;
  limitExceeded: boolean;
  absentEmployeeNames: string[];
}

export interface Attachment {
  attachmentId: number;
  leaveRequestId: number;
  fileName: string;
  filePath: string;
  uploadedAt: string;
}

export interface DemoEmail {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  content: string;
  sentAt: string;
  type: string;
}
