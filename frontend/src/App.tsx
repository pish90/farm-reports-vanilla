import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AuthContext, parseToken } from './hooks/useAuth';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Login from './pages/Login';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Stock from './pages/Stock';
import type { AuthUser } from './types';

function initUser(): AuthUser | null {
  const t = localStorage.getItem('token');
  return t ? parseToken(t) : null;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(initUser);

  function login(token: string) {
    localStorage.setItem('token', token);
    setUser(parseToken(token));
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
