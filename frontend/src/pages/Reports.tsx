import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { getReport, reopenReport, submitReport } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { ReportDto } from '../types';

export default function Reports() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: report, isLoading } = useQuery<ReportDto>({
    queryKey: ['report', year, month],
    queryFn: () => getReport(year, month),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitReport(year, month),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', year, month] }),
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenReport(year, month),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', year, month] }),
  });

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const isAdmin = user?.role === 'ADMIN';
  const submitted = report?.status === 'SUBMITTED';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monthly Report</h1>
          {submitted && (
            <span className="inline-flex items-center gap-1 text-xs text-white bg-primary-600 px-2 py-0.5 rounded mt-1">
              <Lock size={10} /> Submitted
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <span className="text-sm font-semibold w-32 text-center">
              {format(new Date(year, month - 1), 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>
          {isAdmin && !submitted && (
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Lock size={14} /> Submit
            </button>
          )}
          {isAdmin && submitted && (
            <button
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
              className="flex items-center gap-1.5 border border-gray-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Unlock size={14} /> Reopen
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {report && (
        <div className="space-y-5 print:space-y-4">
          {/* Attendance */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Attendance</h2>
              <p className="text-xs text-gray-500">
                {report.attendance.workingDays} working days · {report.attendance.totalPresent} present · {report.attendance.totalAbsent} absent
              </p>
            </div>
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Worker</th>
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Role</th>
                  <th className="text-center px-5 py-2 text-xs font-semibold text-gray-500">Present</th>
                  <th className="text-center px-5 py-2 text-xs font-semibold text-gray-500">Absent</th>
                </tr>
              </thead>
              <tbody>
                {report.attendance.workers.map((w, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-5 py-2 text-sm text-gray-800">{w.name}</td>
                    <td className="px-5 py-2 text-sm text-gray-500">{w.jobTitle ?? '—'}</td>
                    <td className="px-5 py-2 text-sm text-center font-medium text-primary-700">{w.present}</td>
                    <td className="px-5 py-2 text-sm text-center font-medium text-red-500">{w.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Stock */}
          {report.stock.map((section, si) => (
            <section key={si} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                <h2 className="font-semibold text-gray-800">{section.category}</h2>
                {section.unit && <span className="text-xs text-gray-500">Unit: {section.unit}</span>}
              </div>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Item</th>
                    <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500">Quantity</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, ii) => (
                    <tr key={ii} className="border-b border-gray-50">
                      <td className="px-5 py-2 text-sm text-gray-800">{item.item}</td>
                      <td className="px-5 py-2 text-sm font-medium text-gray-900 text-right">
                        {Number(item.quantity).toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-sm text-gray-500">{item.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          {/* Expenses */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Expenses</h2>
              <span className="text-sm font-bold text-gray-900">
                Total: {Number(report.totalExpenses).toLocaleString()}
              </span>
            </div>
            {report.expenses.map((section, si) => (
              <div key={si}>
                <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between">
                  <span className="text-sm font-medium text-gray-700">{section.category}</span>
                  <span className="text-sm font-semibold text-gray-800">{Number(section.subtotal).toLocaleString()}</span>
                </div>
                {section.entries.map((entry, ei) => (
                  <div key={ei} className="flex justify-between px-8 py-1.5 border-b border-gray-50 text-sm">
                    <span className="text-gray-600">{entry.description ?? '—'} <span className="text-gray-400 text-xs">{entry.date}</span></span>
                    <span className="text-gray-800">{Number(entry.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
