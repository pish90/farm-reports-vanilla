export type RootStackParamList = {
  Login: undefined;
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

export interface CurrentUser {
  userId: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'FARM_MANAGER' | 'OPS' | 'VIEWER' | 'MANAGER' | 'WORKER';
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
}

export interface SyncQueueRow {
  id: number;
  section: string;
  ref_key: string;
  synced: number;
  created_at: string;
}
