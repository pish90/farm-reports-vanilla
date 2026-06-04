export type RootStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Stock: undefined;
  Expenses: undefined;
  Reports: undefined;
  Settings: undefined;
};

// Stack param lists for nested navigators
export type AttendanceStackParamList = {
  AttendanceLanding: undefined;
  AttendanceHome: undefined;
  Workers: undefined;
  CasualHome: undefined;
  CreateWorkSession: { session?: CasualWorkSessionDto; selectedCasuals?: { id: number; name: string; rateOverride?: number }[] } | undefined;
  SelectCasuals: { currentSelection: { id: number; rateOverride?: number }[]; defaultRate: number };
  CasualReport: undefined;
};

export type ExpensesStackParamList = {
  ExpensesHome: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  AuditLog: undefined;
};

export type ReportsStackParamList = {
  ReportsHome: undefined;
  Summary: { year: number; month: number };
};

export interface CurrentUser {
  userId: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'FARM_MANAGER' | 'OPS' | 'VIEWER' | 'MANAGER' | 'WORKER';
  mustChangePassword?: boolean;
}

// ─── API response types ────────────────────────────────────────────────────────

export interface Worker {
  id: number;
  name: string;
  jobTitle: string | null;
  active: boolean;
}

export interface StockItem {
  id: number;
  categoryId: number;
  name: string;
  displayOrder: number;
  active: boolean;
  quantity: number | null;
  notes: string | null;
}

export interface StockCategory {
  id: number;
  name: string;
  unit: string | null;
  displayOrder: number;
  active: boolean;
  items: StockItem[];
}

export interface ExpenseCategory {
  id: number;
  name: string;
  active: boolean;
}

export interface Expense {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  amount: number;
  expenseDate: string;
  year: number;
  month: number;
}

export interface DashboardData {
  year: number;
  month: number;
  totalWorkers: number;
  presentToday: number;
  totalExpensesThisMonth: number;
  expensesByCategory: Array<{ category: string; total: number }>;
  stockSummary: Array<{ category: string; item: string; unit: string | null; quantity: number }>;
}

export interface AttendanceRecord {
  id: number;
  workerId: number;
  workerName: string;
  date: string;
  present: boolean;
  notes: string | null;
}

export interface ReportDto {
  id: number | null;
  year: number;
  month: number;
  status: 'DRAFT' | 'SUBMITTED';
  notes: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  attendance: {
    workingDays: number;
    totalPresent: number;
    totalAbsent: number;
    workers: Array<{ name: string; jobTitle: string | null; present: number; absent: number }>;
  };
  stock: Array<{
    category: string;
    unit: string | null;
    items: Array<{ item: string; quantity: number | null; notes: string | null }>;
  }>;
  expenses: Array<{
    category: string;
    subtotal: number;
    entries: Array<{ description: string | null; amount: number; date: string }>;
  }>;
  totalExpenses: number;
}

export interface FarmConfig {
  name: string;
  currency: string;
  timezone: string;
}

// ─── Local DB row types ────────────────────────────────────────────────────────

export interface LocalAttendanceRow {
  id: number;
  year: number;
  month: number;
  day_of_month: number;
  worker_id: number;
  worker_name: string;
  present: number;
  status: string | null;   // 'P' | 'A' | 'AL' | 'SL' | 'PL' — null for legacy rows
}

export interface LocalAttendanceNoteRow {
  id: number;
  year: number;
  month: number;
  worker_id: number;
  note: string;
}

export interface LocalStockRow {
  id: number;
  item_id: number;
  year: number;
  month: number;
  quantity: number;
  notes: string | null;
}

export interface LocalExpenseRow {
  id: number;
  server_id: number | null;
  year: number;
  month: number;
  expense_date: string;
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  amount: number;
  pending_op: 'create' | 'update' | 'delete';
  synced: number;
  // Extended fields (added via migration)
  entry_no: number;
  supplier_contractor: string | null;
  receipt_no: string | null;
}

export interface SyncQueueRow {
  id: number;
  section: string;
  ref_key: string;
  synced: number;
  created_at: string;
}

// ─── Casual labour ────────────────────────────────────────────────────────────

export interface CasualLabourerDto {
  id: number;
  name: string;
  phone: string | null;
  active: boolean;
}

export interface CasualWorkEntryDto {
  id: number;
  casualLabourerId: number;
  labourerName: string;
  rateOverride: number | null;
  effectiveRate: number;
}

export interface CasualWorkSessionDto {
  id: number;
  sessionDate: string;
  activity: string;
  defaultDailyRate: number;
  entries: CasualWorkEntryDto[];
}

export interface CasualLabourerReportDto {
  labourerId: number;
  name: string;
  phone: string | null;
  allTimeEarned: number;
  allTimePaid: number;
  balance: number;
  workEntries: { sessionId: number; sessionDate: string; activity: string; amount: number }[];
}

export interface CreateWorkSessionRequest {
  sessionDate: string;
  activity: string;
  defaultDailyRate: number;
  entries: { casualLabourerId: number; rateOverride?: number }[];
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export type AuditActionType =
  | 'LOGIN' | 'LOGIN_FAILED' | 'PASSWORD_CHANGED'
  | 'REPORT_SUBMITTED' | 'REPORT_REOPENED' | 'REPORT_CREATED'
  | 'ATTENDANCE_UPDATED' | 'EXPENSES_UPDATED' | 'STOCK_UPDATED'
  | 'WORKER_ADDED' | 'WORKER_DEACTIVATED'
  | 'CASUAL_LABOURER_ADDED' | 'CASUAL_LABOURER_DEACTIVATED'
  | 'CASUAL_SESSION_CREATED' | 'CASUAL_SESSION_UPDATED' | 'CASUAL_SESSION_DELETED'
  | 'CASUAL_PAYMENT_RECORDED';

export interface AuditLog {
  id: number;
  action: AuditActionType;
  userId: number | null;
  userName: string | null;
  userRole: string | null;
  description: string | null;
  entityType: string | null;
  entityId: number | null;
  ipAddress: string | null;
  timestamp: string;
}

export interface AuditLogPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  page: number;
}
