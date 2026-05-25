import { getDb } from './database';
import type {
  LocalAttendanceRow,
  LocalExpenseRow,
  LocalStockRow,
  StockCategory,
  SyncQueueRow,
  Worker,
  ExpenseCategory,
} from '../types';

// ─── Workers cache ─────────────────────────────────────────────────────────────

export async function cacheWorkers(workers: Worker[]): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM workers_cache');
    for (const w of workers) {
      await db.runAsync(
        'INSERT INTO workers_cache (id, name, job_title, active) VALUES (?, ?, ?, ?)',
        [w.id, w.name, w.jobTitle ?? null, w.active ? 1 : 0],
      );
    }
  });
}

export async function getCachedWorkers(): Promise<Worker[]> {
  const rows = await getDb().getAllAsync<{ id: number; name: string; job_title: string | null; active: number }>(
    'SELECT id, name, job_title, active FROM workers_cache WHERE active = 1 ORDER BY name',
  );
  return rows.map(r => ({ id: r.id, name: r.name, jobTitle: r.job_title, active: r.active === 1 }));
}

// ─── Stock cache ───────────────────────────────────────────────────────────────

export async function cacheStockCategories(categories: StockCategory[]): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM stock_items_cache');
    await db.runAsync('DELETE FROM stock_categories_cache');
    for (const cat of categories) {
      await db.runAsync(
        'INSERT INTO stock_categories_cache (id, name, unit, display_order) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.unit ?? null, cat.displayOrder],
      );
      for (const item of cat.items) {
        await db.runAsync(
          'INSERT INTO stock_items_cache (id, category_id, name, display_order) VALUES (?, ?, ?, ?)',
          [item.id, cat.id, item.name, item.displayOrder],
        );
      }
    }
  });
}

export async function getCachedStockCategories(): Promise<StockCategory[]> {
  const db = getDb();
  const cats = await db.getAllAsync<{ id: number; name: string; unit: string | null; display_order: number }>(
    'SELECT id, name, unit, display_order FROM stock_categories_cache ORDER BY display_order',
  );
  const result: StockCategory[] = [];
  for (const cat of cats) {
    const items = await db.getAllAsync<{ id: number; name: string; display_order: number }>(
      'SELECT id, name, display_order FROM stock_items_cache WHERE category_id = ? ORDER BY display_order',
      [cat.id],
    );
    result.push({
      id: cat.id,
      name: cat.name,
      unit: cat.unit,
      displayOrder: cat.display_order,
      active: true,
      items: items.map(i => ({
        id: i.id,
        categoryId: cat.id,
        name: i.name,
        displayOrder: i.display_order,
        active: true,
        quantity: null,
        notes: null,
      })),
    });
  }
  return result;
}

// ─── Expense categories cache ──────────────────────────────────────────────────

export async function cacheExpenseCategories(cats: ExpenseCategory[]): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM expense_categories_cache');
    for (const c of cats) {
      await db.runAsync('INSERT INTO expense_categories_cache (id, name) VALUES (?, ?)', [c.id, c.name]);
    }
  });
}

export async function getCachedExpenseCategories(): Promise<ExpenseCategory[]> {
  const rows = await getDb().getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM expense_categories_cache ORDER BY name',
  );
  return rows.map(r => ({ id: r.id, name: r.name, active: true }));
}

// ─── Attendance ────────────────────────────────────────────────────────────────

export async function getLocalAttendance(year: number, month: number): Promise<LocalAttendanceRow[]> {
  return getDb().getAllAsync<LocalAttendanceRow>(
    'SELECT * FROM local_attendance WHERE year = ? AND month = ? ORDER BY day_of_month, worker_id',
    [year, month],
  );
}

export async function getLocalAttendanceForDate(
  year: number,
  month: number,
  day: number,
): Promise<LocalAttendanceRow[]> {
  return getDb().getAllAsync<LocalAttendanceRow>(
    'SELECT * FROM local_attendance WHERE year = ? AND month = ? AND day_of_month = ?',
    [year, month, day],
  );
}

export async function upsertAttendance(
  year: number,
  month: number,
  day: number,
  workerId: number,
  workerName: string,
  present: boolean,
): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO local_attendance (year, month, day_of_month, worker_id, worker_name, present)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (year, month, day_of_month, worker_id)
     DO UPDATE SET present = excluded.present`,
    [year, month, day, workerId, workerName, present ? 1 : 0],
  );
}

export async function loadAttendanceFromServer(records: Array<{
  workerId: number;
  workerName: string;
  date: string;
  present: boolean;
}>): Promise<void> {
  const db = getDb();
  for (const r of records) {
    const [y, m, d] = r.date.split('-').map(Number);
    await db.runAsync(
      `INSERT INTO local_attendance (year, month, day_of_month, worker_id, worker_name, present)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (year, month, day_of_month, worker_id)
       DO UPDATE SET present = excluded.present`,
      [y, m, d, r.workerId, r.workerName, r.present ? 1 : 0],
    );
  }
}

// ─── Stock records ─────────────────────────────────────────────────────────────

export async function getLocalStockRecords(year: number, month: number): Promise<LocalStockRow[]> {
  return getDb().getAllAsync<LocalStockRow>(
    'SELECT * FROM local_stock_records WHERE year = ? AND month = ?',
    [year, month],
  );
}

export async function upsertStockRecord(
  itemId: number,
  year: number,
  month: number,
  quantity: number,
  notes: string | null,
): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO local_stock_records (item_id, year, month, quantity, notes)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (item_id, year, month)
     DO UPDATE SET quantity = excluded.quantity, notes = excluded.notes`,
    [itemId, year, month, quantity, notes ?? null],
  );
}

export async function loadStockFromServer(records: Array<{
  itemId: number;
  year: number;
  month: number;
  quantity: number | null;
  notes: string | null;
}>): Promise<void> {
  for (const r of records) {
    if (r.quantity == null) continue;
    await getDb().runAsync(
      `INSERT INTO local_stock_records (item_id, year, month, quantity, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (item_id, year, month)
       DO UPDATE SET quantity = excluded.quantity, notes = excluded.notes`,
      [r.itemId, r.year, r.month, r.quantity, r.notes ?? null],
    );
  }
}

// ─── Expenses ──────────────────────────────────────────────────────────────────

export async function getLocalExpenses(year: number, month: number): Promise<LocalExpenseRow[]> {
  return getDb().getAllAsync<LocalExpenseRow>(
    `SELECT * FROM local_expenses
     WHERE year = ? AND month = ? AND NOT (pending_op = 'delete' AND synced = 0)
     ORDER BY expense_date DESC`,
    [year, month],
  );
}

export async function getUnsyncedExpenses(): Promise<LocalExpenseRow[]> {
  return getDb().getAllAsync<LocalExpenseRow>(
    'SELECT * FROM local_expenses WHERE synced = 0 ORDER BY id',
  );
}

export async function insertLocalExpense(
  year: number,
  month: number,
  expenseDate: string,
  categoryId: number | null,
  categoryName: string | null,
  description: string | null,
  amount: number,
): Promise<number> {
  const result = await getDb().runAsync(
    `INSERT INTO local_expenses (year, month, expense_date, category_id, category_name, description, amount, pending_op, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'create', 0)`,
    [year, month, expenseDate, categoryId ?? null, categoryName ?? null, description ?? null, amount],
  );
  return result.lastInsertRowId;
}

export async function updateLocalExpense(
  localId: number,
  expenseDate: string,
  categoryId: number | null,
  categoryName: string | null,
  description: string | null,
  amount: number,
): Promise<void> {
  const db = getDb();
  const row = await db.getFirstAsync<{ pending_op: string }>(
    'SELECT pending_op FROM local_expenses WHERE id = ?',
    [localId],
  );
  const newOp = row?.pending_op === 'create' ? 'create' : 'update';
  await db.runAsync(
    `UPDATE local_expenses
     SET expense_date = ?, category_id = ?, category_name = ?, description = ?, amount = ?,
         pending_op = ?, synced = 0
     WHERE id = ?`,
    [expenseDate, categoryId ?? null, categoryName ?? null, description ?? null, amount, newOp, localId],
  );
}

export async function markExpenseForDelete(localId: number): Promise<void> {
  const db = getDb();
  const row = await db.getFirstAsync<{ server_id: number | null; pending_op: string }>(
    'SELECT server_id, pending_op FROM local_expenses WHERE id = ?',
    [localId],
  );
  if (!row) return;
  if (row.server_id == null) {
    // Never reached server — delete locally without sync
    await db.runAsync('DELETE FROM local_expenses WHERE id = ?', [localId]);
  } else {
    await db.runAsync(
      'UPDATE local_expenses SET pending_op = ?, synced = 0 WHERE id = ?',
      ['delete', localId],
    );
  }
}

export async function updateExpenseServerId(localId: number, serverId: number): Promise<void> {
  await getDb().runAsync(
    'UPDATE local_expenses SET server_id = ?, synced = 1, pending_op = \'update\' WHERE id = ?',
    [serverId, localId],
  );
}

export async function markExpenseSynced(localId: number): Promise<void> {
  await getDb().runAsync('UPDATE local_expenses SET synced = 1 WHERE id = ?', [localId]);
}

export async function deleteLocalExpense(localId: number): Promise<void> {
  await getDb().runAsync('DELETE FROM local_expenses WHERE id = ?', [localId]);
}

export async function loadExpensesFromServer(
  expenses: Array<{
    id: number;
    categoryId: number | null;
    categoryName?: string | null;
    description: string | null;
    amount: number;
    expenseDate: string;
    year: number;
    month: number;
  }>,
): Promise<void> {
  const db = getDb();
  for (const e of expenses) {
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM local_expenses WHERE server_id = ?',
      [e.id],
    );
    if (!existing) {
      await db.runAsync(
        `INSERT INTO local_expenses
           (server_id, year, month, expense_date, category_id, category_name, description, amount, pending_op, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'update', 1)`,
        [e.id, e.year, e.month, e.expenseDate, e.categoryId ?? null,
          e.categoryName ?? null, e.description ?? null, e.amount],
      );
    }
  }
}

// ─── Sync queue (attendance + stock) ──────────────────────────────────────────

export async function markAttendanceDateDirty(year: number, month: number, day: number): Promise<void> {
  const refKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await getDb().runAsync(
    `INSERT INTO sync_queue (section, ref_key) VALUES ('attendance', ?)
     ON CONFLICT (section, ref_key) DO UPDATE SET synced = 0`,
    [refKey],
  );
}

export async function markStockMonthDirty(year: number, month: number): Promise<void> {
  const refKey = `${year}-${String(month).padStart(2, '0')}`;
  await getDb().runAsync(
    `INSERT INTO sync_queue (section, ref_key) VALUES ('stock', ?)
     ON CONFLICT (section, ref_key) DO UPDATE SET synced = 0`,
    [refKey],
  );
}

export async function getPendingSyncQueue(): Promise<SyncQueueRow[]> {
  return getDb().getAllAsync<SyncQueueRow>(
    'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id',
  );
}

export async function markSyncQueueEntryDone(id: number): Promise<void> {
  await getDb().runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [id]);
}
