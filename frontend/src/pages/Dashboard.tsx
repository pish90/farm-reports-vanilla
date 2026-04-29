import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DollarSign, Package, Users } from 'lucide-react';
import { getDashboard } from '../api/client';
import type { DashboardDto } from '../types';

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className="bg-primary-100 rounded-lg p-3">
        <Icon size={22} className="text-primary-700" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardDto>({ queryKey: ['dashboard'], queryFn: getDashboard });

  if (isLoading) return <div className="text-gray-500 text-sm">Loading…</div>;
  if (!data) return null;

  const monthLabel = format(new Date(data.year, data.month - 1), 'MMMM yyyy');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{monthLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Workers present today"
          value={`${data.presentToday} / ${data.totalWorkers}`} />
        <StatCard icon={DollarSign} label="Expenses this month"
          value={Number(data.totalExpensesThisMonth).toLocaleString()} />
        <StatCard icon={Package} label="Stock categories tracked"
          value={new Set(data.stockSummary.map(s => s.category)).size} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by category */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Expenses by Category</h2>
          {data.expensesByCategory.length === 0
            ? <p className="text-sm text-gray-400">No expenses recorded this month.</p>
            : <div className="space-y-3">
                {data.expensesByCategory.map(e => (
                  <div key={e.category} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{e.category}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Number(e.total).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Stock snapshot */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Stock Snapshot</h2>
          {data.stockSummary.length === 0
            ? <p className="text-sm text-gray-400">No stock recorded this month.</p>
            : <div className="space-y-2">
                {data.stockSummary.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{s.category} — {s.item}</span>
                    <span className="font-medium text-gray-900">
                      {Number(s.quantity).toLocaleString()} {s.unit ?? ''}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}
