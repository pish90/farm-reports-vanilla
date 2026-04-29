import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  activateUser, changePassword, createExpenseCategory, createStockCategory,
  createStockItem, createUser, createWorker, deactivateUser, deactivateWorker,
  getConfig, getExpenseCategories, getStockCategories, getUsers, getWorkers,
  updateConfig,
} from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { ExpenseCategory, StockCategory, UserDto, Worker } from '../types';

interface UserDto { id: number; name: string; email: string; role: string; active: boolean; }

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [tab, setTab] = useState<'farm'|'workers'|'stock'|'expenses'|'users'|'password'>('farm');

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      <div className="flex gap-2 flex-wrap">
        {(['farm','workers','stock','expenses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => setTab('users')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === 'users' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Users
          </button>
        )}
        <button onClick={() => setTab('password')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === 'password' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Password
        </button>
      </div>

      {tab === 'farm'     && <FarmConfigTab isAdmin={isAdmin} />}
      {tab === 'workers'  && <WorkersTab />}
      {tab === 'stock'    && <StockTab isAdmin={isAdmin} />}
      {tab === 'expenses' && <ExpenseCategoriesTab isAdmin={isAdmin} />}
      {tab === 'users'    && isAdmin && <UsersTab />}
      {tab === 'password' && <PasswordTab />}
    </div>
  );
}

// ── Farm Config ───────────────────────────────────────────────────────────────
function FarmConfigTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['config'], queryFn: getConfig });
  const [form, setForm] = useState({ name: '', currency: '', timezone: '' });
  const [loaded, setLoaded] = useState(false);

  if (data && !loaded) {
    setForm({ name: data.name, currency: data.currency, timezone: data.timezone });
    setLoaded(true);
  }

  const mutation = useMutation({
    mutationFn: () => updateConfig(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md space-y-4">
      <h2 className="font-semibold text-gray-800">Farm Configuration</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
        <input value={form.name} disabled={!isAdmin} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
        <input value={form.currency} disabled={!isAdmin} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <input value={form.timezone} disabled={!isAdmin} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50" />
      </div>
      {isAdmin && (
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      )}
    </div>
  );
}

// ── Workers ───────────────────────────────────────────────────────────────────
function WorkersTab() {
  const qc = useQueryClient();
  const { data: workers = [] } = useQuery<Worker[]>({ queryKey: ['workers'], queryFn: getWorkers });
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const addMutation = useMutation({
    mutationFn: () => createWorker({ name, jobTitle: jobTitle || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workers'] }); setName(''); setJobTitle(''); },
  });

  const removeMutation = useMutation({
    mutationFn: deactivateWorker,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
      <h2 className="font-semibold text-gray-800">Workers</h2>
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Worker name"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title (optional)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <button onClick={() => addMutation.mutate()} disabled={!name || addMutation.isPending}
          className="flex items-center gap-1 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          <Plus size={15} /> Add
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {workers.map(w => (
          <li key={w.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <span className="font-medium text-gray-800">{w.name}</span>
              {w.jobTitle && <span className="text-gray-400 ml-2">{w.jobTitle}</span>}
            </div>
            <button onClick={() => removeMutation.mutate(w.id)} className="text-gray-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Stock Categories ──────────────────────────────────────────────────────────
function StockTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery<StockCategory[]>({
    queryKey: ['stock-categories'],
    queryFn: getStockCategories,
  });
  const [catName, setCatName] = useState('');
  const [catUnit, setCatUnit] = useState('');
  const [newItems, setNewItems] = useState<Record<number, string>>({});

  const addCatMutation = useMutation({
    mutationFn: () => createStockCategory({ name: catName, unit: catUnit || null, displayOrder: 0, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-categories'] }); setCatName(''); setCatUnit(''); },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ catId, name }: { catId: number; name: string }) =>
      createStockItem(catId, { name, displayOrder: 0, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-categories'] }); },
  });

  return (
    <div className="space-y-5 max-w-lg">
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Add Stock Category</h2>
          <div className="flex gap-2">
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name (e.g. Cattle)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input value={catUnit} onChange={e => setCatUnit(e.target.value)} placeholder="Unit (e.g. head)"
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={() => addCatMutation.mutate()} disabled={!catName}
              className="flex items-center gap-1 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">{cat.name}</h3>
            {cat.unit && <span className="text-xs text-gray-500">Unit: {cat.unit}</span>}
          </div>
          <ul className="text-sm divide-y divide-gray-100">
            {cat.items.map(item => (
              <li key={item.id} className="py-1.5 text-gray-700">{item.name}</li>
            ))}
          </ul>
          {isAdmin && (
            <div className="flex gap-2 pt-1">
              <input
                value={newItems[cat.id] ?? ''}
                onChange={e => setNewItems(p => ({ ...p, [cat.id]: e.target.value }))}
                placeholder="New item name…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => { addItemMutation.mutate({ catId: cat.id, name: newItems[cat.id] }); setNewItems(p => ({ ...p, [cat.id]: '' })); }}
                disabled={!newItems[cat.id]}
                className="flex items-center gap-1 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                <Plus size={14} /> Add Item
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Expense Categories ────────────────────────────────────────────────────────
function ExpenseCategoriesTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: getExpenseCategories,
  });
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: () => createExpenseCategory({ name, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-categories'] }); setName(''); },
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md space-y-4">
      <h2 className="font-semibold text-gray-800">Expense Categories</h2>
      {isAdmin && (
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="New category name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}
            className="flex items-center gap-1 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
            <Plus size={15} /> Add
          </button>
        </div>
      )}
      <ul className="divide-y divide-gray-100">
        {cats.map(c => (
          <li key={c.id} className="py-2 text-sm text-gray-800">{c.name}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery<UserDto[]>({ queryKey: ['users'], queryFn: getUsers });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MANAGER' });

  const addMutation = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setForm({ name: '', email: '', password: '', role: 'MANAGER' }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (u: UserDto) => u.active ? deactivateUser(u.id) : activateUser(u.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Add User</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['name','email','password'] as const).map(field => (
            <input key={field} type={field === 'password' ? 'password' : 'text'}
              value={form[field]} placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          ))}
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="WORKER">Worker</option>
          </select>
        </div>
        <button onClick={() => addMutation.mutate()} disabled={!form.name || !form.email || !form.password}
          className="flex items-center gap-1 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          <Plus size={15} /> Create User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Role</th>
              <th className="px-5 py-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={`border-b border-gray-50 ${!u.active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-2 text-sm font-medium text-gray-800">{u.name}</td>
                <td className="px-5 py-2 text-sm text-gray-500">{u.email}</td>
                <td className="px-5 py-2 text-sm text-gray-600">{u.role}</td>
                <td className="px-5 py-2 text-right">
                  <button onClick={() => toggleMutation.mutate(u)}
                    className="text-xs text-gray-400 hover:text-gray-700 underline">
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────
function PasswordTab() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState('');

  const mutation = useMutation({
    mutationFn: () => changePassword(form.current, form.next),
    onSuccess: () => { setMsg('Password changed successfully.'); setForm({ current: '', next: '', confirm: '' }); },
    onError: () => setMsg('Current password is incorrect.'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) { setMsg('New passwords do not match.'); return; }
    if (form.next.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    setMsg('');
    mutation.mutate();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm space-y-4">
      <h2 className="font-semibold text-gray-800">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {(['current','next','confirm'] as const).map(f => (
          <div key={f}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {f === 'current' ? 'Current password' : f === 'next' ? 'New password' : 'Confirm new password'}
            </label>
            <input type="password" value={form[f]} required
              onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        ))}
        {msg && <p className={`text-sm ${msg.includes('successfully') ? 'text-primary-600' : 'text-red-600'}`}>{msg}</p>}
        <button type="submit" disabled={mutation.isPending}
          className="w-full bg-primary-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
