import { useAuth } from '../store/AuthContext';
import type { CurrentUser } from '../types';

type Role = CurrentUser['role'];

const MANAGE_ROLES: Role[] = ['ADMIN', 'FARM_MANAGER', 'MANAGER'];
const EXPENSE_CREATE_ROLES: Role[] = ['ADMIN', 'FARM_MANAGER', 'MANAGER', 'OPS'];

export interface Permissions {
  role: Role;
  isAdmin: boolean;
  /** Can add / edit / delete workers */
  canManageWorkers: boolean;
  /** Can toggle attendance cells */
  canMarkAttendance: boolean;
  /** Can edit stock quantities */
  canUpdateStock: boolean;
  /** Can create new expenses */
  canAddExpense: boolean;
  /** Can edit or delete existing expenses */
  canEditExpense: boolean;
  /** Can manage expense & stock categories */
  canManageCategories: boolean;
  /** Can create / deactivate users */
  canManageUsers: boolean;
  /** Can submit / reopen monthly reports */
  canSubmitReport: boolean;
  // ── Settings tab visibility ────────────────────────────────────────────────
  showWorkersSettingsTab: boolean;
  showStockSettingsTab: boolean;
  showExpenseCatsTab: boolean;
  showUsersTab: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const role: Role = user?.role ?? 'VIEWER';
  const hasManageRole = MANAGE_ROLES.includes(role);

  return {
    role,
    isAdmin: role === 'ADMIN',
    canManageWorkers: hasManageRole,
    canMarkAttendance: hasManageRole,
    canUpdateStock: hasManageRole,
    canAddExpense: EXPENSE_CREATE_ROLES.includes(role),
    canEditExpense: hasManageRole,
    canManageCategories: role === 'ADMIN',
    canManageUsers: role === 'ADMIN',
    canSubmitReport: hasManageRole,
    showWorkersSettingsTab: hasManageRole,
    showStockSettingsTab: role === 'ADMIN',
    showExpenseCatsTab: role === 'ADMIN',
    showUsersTab: role === 'ADMIN',
  };
}
