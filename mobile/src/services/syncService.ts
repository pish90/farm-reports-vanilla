import { AppState, AppStateStatus } from 'react-native';
import {
  getLocalAttendanceForDate,
  getLocalStockRecords,
  getUnsyncedExpenses,
  getPendingSyncQueue,
  markSyncQueueEntryDone,
  updateExpenseServerId,
  markExpenseSynced,
  deleteLocalExpense,
} from '../db/repository';
import apiClient from './apiClient';

export type SyncStatus = 'idle' | 'syncing' | 'error';

let _status: SyncStatus = 'idle';
let _listeners: Array<(s: SyncStatus) => void> = [];

function setStatus(s: SyncStatus) {
  _status = s;
  _listeners.forEach(fn => fn(s));
}

export function getSyncStatus(): SyncStatus { return _status; }

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

async function syncAttendance(refKey: string): Promise<void> {
  const [y, m, d] = refKey.split('-').map(Number);
  const rows = await getLocalAttendanceForDate(y, m, d);
  if (rows.length === 0) return;
  await apiClient.post('/attendance/bulk', {
    date: refKey,
    records: rows.map(r => ({ workerId: r.worker_id, present: r.present === 1, notes: null })),
  });
}

async function syncStock(refKey: string): Promise<void> {
  const [y, m] = refKey.split('-').map(Number);
  const rows = await getLocalStockRecords(y, m);
  if (rows.length === 0) return;
  await apiClient.put('/stock/records', {
    year: y,
    month: m,
    entries: rows.map(r => ({ itemId: r.item_id, quantity: r.quantity, notes: r.notes ?? null })),
  });
}

async function syncExpenses(): Promise<void> {
  const expenses = await getUnsyncedExpenses();
  for (const e of expenses) {
    if (e.pending_op === 'create') {
      const res = await apiClient.post('/expenses', {
        expenseDate: e.expense_date,
        categoryId: e.category_id ?? null,
        description: e.description ?? null,
        amount: e.amount,
        supplierContractor: e.supplier_contractor ?? null,
        receiptNo: e.receipt_no ?? null,
      });
      await updateExpenseServerId(e.id, res.data.data.id as number);
    } else if (e.pending_op === 'update' && e.server_id) {
      await apiClient.put(`/expenses/${e.server_id}`, {
        expenseDate: e.expense_date,
        categoryId: e.category_id ?? null,
        description: e.description ?? null,
        amount: e.amount,
        supplierContractor: e.supplier_contractor ?? null,
        receiptNo: e.receipt_no ?? null,
      });
      await markExpenseSynced(e.id);
    } else if (e.pending_op === 'delete' && e.server_id) {
      await apiClient.delete(`/expenses/${e.server_id}`);
      await deleteLocalExpense(e.id);
    }
  }
}

export async function syncAllPending(): Promise<void> {
  if (_status === 'syncing') return;
  const queue = await getPendingSyncQueue();
  const hasExpenses = (await getUnsyncedExpenses()).length > 0;
  if (queue.length === 0 && !hasExpenses) return;

  setStatus('syncing');
  try {
    for (const entry of queue) {
      if (entry.section === 'attendance') await syncAttendance(entry.ref_key);
      if (entry.section === 'stock') await syncStock(entry.ref_key);
      await markSyncQueueEntryDone(entry.id);
    }
    await syncExpenses();
    setStatus('idle');
  } catch {
    setStatus('error');
  }
}

function trySubscribeNetInfo(): (() => void) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NetInfo = require('@react-native-community/netinfo').default;
    return NetInfo.addEventListener(
      (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
        if (state.isConnected && state.isInternetReachable) syncAllPending().catch(() => {});
      },
    );
  } catch {
    return null;
  }
}

export function initAutoSync(): () => void {
  const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') syncAllPending().catch(() => {});
  });
  const netInfoUnsub = trySubscribeNetInfo();
  const intervalId = setInterval(() => syncAllPending().catch(() => {}), 30_000);
  syncAllPending().catch(() => {});
  return () => {
    appStateSub.remove();
    netInfoUnsub?.();
    clearInterval(intervalId);
  };
}
