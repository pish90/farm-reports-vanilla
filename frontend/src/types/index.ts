export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'WORKER';
}

export interface FarmConfig {
  name: string;
  currency: string;
  timezone: string;
}

export interface Worker {
  id: number;
  name: string;
  jobTitle: string | null;
  active: boolean;
}

export interface AttendanceRecord {
  id: number;
  workerId: number;
  workerName: string;
  date: string;
  present: boolean;
  notes: string | null;
}

export interface StockItem {
  id: number;
  categoryId: number;
  name: string;
  displayOrder: number;
  active: boolean;
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
  receiptUrl: string | null;
}

export interface ReportDto {
  id: number | null;
  year: number;
  month: number;
  status: 'DRAFT' | 'SUBMITTED';
  notes: string | null;
  attendance: {
    workingDays: number;
    totalPresent: number;
    totalAbsent: number;
    workers: { name: string; jobTitle: string | null; present: number; absent: number }[];
  };
  stock: { category: string; unit: string | null; items: { item: string; quantity: number; notes: string | null }[] }[];
  expenses: { category: string; subtotal: number; entries: { description: string | null; amount: number; date: string }[] }[];
  totalExpenses: number;
}

export interface DashboardDto {
  year: number;
  month: number;
  totalWorkers: number;
  presentToday: number;
  totalExpensesThisMonth: number;
  expensesByCategory: { category: string; total: number }[];
  stockSummary: { category: string; item: string; unit: string | null; quantity: number }[];
}
