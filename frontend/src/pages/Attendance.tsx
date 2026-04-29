import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDaysInMonth, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { getAttendance, getWorkers, saveAttendance } from '../api/client';
import type { AttendanceRecord, Worker } from '../types';

export default function Attendance() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const qc = useQueryClient();

  const { data: workers = [] } = useQuery<Worker[]>({ queryKey: ['workers'], queryFn: getWorkers });
  const { data: records = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', year, month],
    queryFn: () => getAttendance(year, month),
  });

  const mutation = useMutation({
    mutationFn: ({ date, entries }: { date: string; entries: object[] }) =>
      saveAttendance(date, entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', year, month] }),
  });

  const days = getDaysInMonth(new Date(year, month - 1));

  function isPresent(workerId: number, day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.find(r => r.workerId === workerId && r.date === dateStr)?.present ?? false;
  }

  function toggle(workerId: number, day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const current = isPresent(workerId, day);
    mutation.mutate({
      date: dateStr,
      entries: [{ workerId, present: !current, notes: null }],
    });
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold w-32 text-center">
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 w-40">Worker</th>
              {Array.from({ length: days }, (_, i) => (
                <th key={i + 1} className="px-1 py-3 font-medium text-gray-500 text-center w-8">
                  {i + 1}
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">Present</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => {
              const presentCount = Array.from({ length: days }, (_, i) => isPresent(w.id, i + 1))
                .filter(Boolean).length;
              return (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{w.name}</td>
                  {Array.from({ length: days }, (_, i) => {
                    const present = isPresent(w.id, i + 1);
                    return (
                      <td key={i + 1} className="px-1 py-2 text-center">
                        <button
                          onClick={() => toggle(w.id, i + 1)}
                          className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                            present
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {present ? 'P' : 'A'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-center font-semibold text-gray-800">
                    {presentCount}/{days}
                  </td>
                </tr>
              );
            })}
            {workers.length === 0 && (
              <tr>
                <td colSpan={days + 2} className="px-4 py-8 text-center text-sm text-gray-400">
                  No workers found. Add workers in Settings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
