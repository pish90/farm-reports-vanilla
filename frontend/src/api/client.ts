import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

export const getMe = () => api.get('/auth/me').then(r => r.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.put('/auth/password', { currentPassword, newPassword });

// ── Config ────────────────────────────────────────────────────────────────────
export const getConfig = () => api.get('/config').then(r => r.data);
export const updateConfig = (data: object) => api.put('/config', data).then(r => r.data);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/dashboard').then(r => r.data);

// ── Workers ───────────────────────────────────────────────────────────────────
export const getWorkers = () => api.get('/workers').then(r => r.data);
export const createWorker = (data: object) => api.post('/workers', data).then(r => r.data);
export const updateWorker = (id: number, data: object) => api.put(`/workers/${id}`, data).then(r => r.data);
export const deactivateWorker = (id: number) => api.delete(`/workers/${id}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendance = (year: number, month: number) =>
  api.get('/attendance', { params: { year, month } }).then(r => r.data);

export const saveAttendance = (date: string, records: object[]) =>
  api.post('/attendance/bulk', { date, records });

// ── Stock ─────────────────────────────────────────────────────────────────────
export const getStockCategories = () => api.get('/stock/categories').then(r => r.data);
export const createStockCategory = (data: object) => api.post('/stock/categories', data).then(r => r.data);
export const updateStockCategory = (id: number, data: object) => api.put(`/stock/categories/${id}`, data);
export const createStockItem = (categoryId: number, data: object) =>
  api.post(`/stock/categories/${categoryId}/items`, data).then(r => r.data);
export const updateStockItem = (id: number, data: object) => api.put(`/stock/items/${id}`, data);
export const getStockRecords = (year: number, month: number) =>
  api.get('/stock/records', { params: { year, month } }).then(r => r.data);
export const saveStockRecords = (data: object) => api.put('/stock/records', data);

// ── Expenses ──────────────────────────────────────────────────────────────────
export const getExpenseCategories = () => api.get('/expenses/categories').then(r => r.data);
export const createExpenseCategory = (data: object) => api.post('/expenses/categories', data).then(r => r.data);
export const updateExpenseCategory = (id: number, data: object) => api.put(`/expenses/categories/${id}`, data);
export const getExpenses = (year: number, month: number) =>
  api.get('/expenses', { params: { year, month } }).then(r => r.data);
export const createExpense = (data: object) => api.post('/expenses', data).then(r => r.data);
export const updateExpense = (id: number, data: object) => api.put(`/expenses/${id}`, data).then(r => r.data);
export const deleteExpense = (id: number) => api.delete(`/expenses/${id}`);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getReport = (year: number, month: number) =>
  api.get('/reports', { params: { year, month } }).then(r => r.data);
export const submitReport = (year: number, month: number) =>
  api.post(`/reports/${year}/${month}/submit`).then(r => r.data);
export const reopenReport = (year: number, month: number) =>
  api.post(`/reports/${year}/${month}/reopen`).then(r => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/users').then(r => r.data);
export const createUser = (data: object) => api.post('/users', data).then(r => r.data);
export const deactivateUser = (id: number) => api.put(`/users/${id}/deactivate`);
export const activateUser = (id: number) => api.put(`/users/${id}/activate`);
