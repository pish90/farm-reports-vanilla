import { BarChart3, ClipboardList, DollarSign, LayoutDashboard, Package, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getConfig } from '../../api/client';

const nav = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/attendance', label: 'Attendance', icon: Users },
  { to: '/stock',      label: 'Stock',      icon: Package },
  { to: '/expenses',   label: 'Expenses',   icon: DollarSign },
  { to: '/reports',    label: 'Reports',    icon: BarChart3 },
  { to: '/settings',   label: 'Settings',   icon: Settings },
];

export default function Sidebar() {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig });

  return (
    <aside className="w-56 bg-primary-800 flex flex-col">
      <div className="px-4 py-5 border-b border-primary-700">
        <p className="text-xs font-semibold text-primary-200 uppercase tracking-wider">Farm Reports</p>
        <p className="text-white font-bold text-lg truncate mt-0.5">{config?.name ?? '…'}</p>
      </div>
      <nav className="flex-1 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-100 hover:bg-primary-700/50 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
