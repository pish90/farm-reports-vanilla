import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { getStockCategories, saveStockRecords, getStockRecords } from '../api/client';
import type { StockCategory } from '../types';

export default function Stock() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery<StockCategory[]>({
    queryKey: ['stock-categories'],
    queryFn: getStockCategories,
  });

  const { data: records = [] } = useQuery<StockCategory[]>({
    queryKey: ['stock-records', year, month],
    queryFn: () => getStockRecords(year, month),
    onSuccess: () => setQuantities({}),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => saveStockRecords(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-records', year, month] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function getValue(itemId: number): string {
    if (quantities[itemId] !== undefined) return quantities[itemId];
    for (const cat of records) {
      const item = cat.items?.find((i: any) => i.id === itemId);
      if (item) return String((item as any).quantity ?? 0);
    }
    return '0';
  }

  function handleSave() {
    const entries = categories.flatMap(cat =>
      cat.items.map(item => ({
        itemId: item.id,
        quantity: parseFloat(quantities[item.id] ?? getValue(item.id)) || 0,
        notes: notes[item.id] ?? null,
      }))
    );
    mutation.mutate({ year, month, entries });
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
        <h1 className="text-xl font-bold text-gray-900">Stock</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <span className="text-sm font-semibold w-32 text-center">
              {format(new Date(year, month - 1), 'MMMM yyyy')}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={15} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-8 text-center">
          No stock categories configured. Add them in Settings.
        </p>
      )}

      {categories.map(cat => (
        <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{cat.name}</h2>
            {cat.unit && <span className="text-xs text-gray-500">Unit: {cat.unit}</span>}
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 w-48">Item</th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 w-32">Quantity</th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {cat.items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-5 py-2 text-sm text-gray-800">{item.name}</td>
                  <td className="px-5 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getValue(item.id)}
                      onChange={e => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-28 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="text"
                      value={notes[item.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Optional note…"
                      className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
