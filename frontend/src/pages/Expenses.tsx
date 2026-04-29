import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  createExpense, deleteExpense, getExpenseCategories, getExpenses, updateExpense,
} from '../api/client';
import type { Expense, ExpenseCategory } from '../types';

interface FormState {
  categoryId: string;
  description: string;
  amount: string;
  expenseDate: string;
}

const EMPTY: FormState = { categoryId: '', description: '', amount: '', expenseDate: '' };

export default function Expenses() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [modal, setModal] = useState<{ open: boolean; editing: Expense | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(EMPTY);
  const qc = useQueryClient();

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses', year, month],
    queryFn: () => getExpenses(year, month),
  });
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: getExpenseCategories,
  });

  const saveMutation = useMutation({
    mutationFn: (data: object) =>
      modal.editing ? updateExpense(modal.editing!.id, data) : createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', year, month] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setModal({ open: false, editing: null });
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', year, month] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  function openCreate() {
    setForm({ ...EMPTY, expenseDate: `${year}-${String(month).padStart(2, '0')}-01` });
    setModal({ open: true, editing: null });
  }

  function openEdit(e: Expense) {
    setForm({
      categoryId: String(e.categoryId ?? ''),
      description: e.description ?? '',
      amount: String(e.amount),
      expenseDate: e.expenseDate,
    });
    setModal({ open: true, editing: e });
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    saveMutation.mutate({
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      description: form.description || null,
      amount: parseFloat(form.amount),
      expenseDate: form.expenseDate,
    });
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <span className="text-sm font-semibold w-32 text-center">
              {format(new Date(year, month - 1), 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary-700"
          >
            <Plus size={15} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Date</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Category</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Description</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Amount</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 text-sm text-gray-600">
                  {format(new Date(e.expenseDate), 'dd MMM')}
                </td>
                <td className="px-5 py-3 text-sm text-gray-800">{e.categoryName ?? '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{e.description ?? '—'}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">
                  {Number(e.amount).toLocaleString()}
                </td>
                <td className="px-5 py-3 flex gap-2 justify-end">
                  <button onClick={() => openEdit(e)} className="text-gray-400 hover:text-primary-600">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(e.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  No expenses this month.
                </td>
              </tr>
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                  {total.toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">
              {modal.editing ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={form.expenseDate}
                  onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" required min="0.01" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saveMutation.isPending}
                  className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {saveMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setModal({ open: false, editing: null })}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
