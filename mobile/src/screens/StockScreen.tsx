import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import MonthYearSelector from '../components/shared/MonthYearSelector';
import {
  cacheStockCategories,
  getCachedStockCategories,
  getLocalStockRecords,
  loadStockFromServer,
  upsertStockRecord,
  markStockMonthDirty,
} from '../db/repository';
import apiClient from '../services/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import type { StockCategory } from '../types';

export default function StockScreen() {
  const { canUpdateStock } = usePermissions();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const cached = await getCachedStockCategories();
    setCategories(cached);

    const localRows = await getLocalStockRecords(year, month);
    const qMap: Record<number, string> = {};
    const nMap: Record<number, string> = {};
    localRows.forEach(r => {
      qMap[r.item_id] = String(r.quantity);
      if (r.notes) nMap[r.item_id] = r.notes;
    });
    setQuantities(qMap);
    setNotes(nMap);
    setLoading(false);

    try {
      const [catRes, recRes] = await Promise.all([
        apiClient.get<StockCategory[]>('/stock/categories'),
        apiClient.get<StockCategory[]>('/stock/records', { params: { year, month } }),
      ]);
      await cacheStockCategories(catRes.data);
      setCategories(catRes.data);

      const serverEntries = recRes.data.flatMap(cat =>
        cat.items.map(i => ({ itemId: i.id, year, month, quantity: i.quantity, notes: i.notes }))
      );
      await loadStockFromServer(serverEntries);
      const fresh = await getLocalStockRecords(year, month);
      const fq: Record<number, string> = {};
      const fn: Record<number, string> = {};
      fresh.forEach(r => { fq[r.item_id] = String(r.quantity); if (r.notes) fn[r.item_id] = r.notes; });
      setQuantities(fq);
      setNotes(fn);
    } catch { /* stay with local */ }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function handleQtyChange(itemId: number, val: string) {
    setQuantities(prev => ({ ...prev, [itemId]: val }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const qty = parseFloat(val) || 0;
      await upsertStockRecord(itemId, year, month, qty, notes[itemId] ?? null);
      await markStockMonthDirty(year, month);
    }, 600);
  }

  function handleNotesChange(itemId: number, val: string) {
    setNotes(prev => ({ ...prev, [itemId]: val }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const qty = parseFloat(quantities[itemId] ?? '0') || 0;
      await upsertStockRecord(itemId, year, month, qty, val || null);
      await markStockMonthDirty(year, month);
    }, 600);
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MonthYearSelector
        year={year}
        month={month}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {!canUpdateStock && (
          <View style={s.readOnlyBanner}>
            <Feather name="eye" size={13} color="#6b7280" />
            <Text style={s.readOnlyText}>View only — your role cannot update stock</Text>
          </View>
        )}
        {categories.length === 0 && (
          <View style={s.empty}><Text style={s.emptyText}>No stock categories configured. Add them in Settings.</Text></View>
        )}

        {categories.map(cat => (
          <View key={cat.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.catName}>{cat.name}</Text>
              {cat.unit && <Text style={s.catUnit}>Unit: {cat.unit}</Text>}
            </View>

            {cat.items.map((item, idx) => (
              <View key={item.id} style={[s.itemRow, idx > 0 && s.itemBorder]}>
                <Text style={s.itemName}>{item.name}</Text>
                <TextInput
                  style={[s.qtyInput, !canUpdateStock && s.inputReadOnly]}
                  value={quantities[item.id] ?? '0'}
                  onChangeText={v => handleQtyChange(item.id, v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  editable={canUpdateStock}
                />
                <TextInput
                  style={[s.notesInput, !canUpdateStock && s.inputReadOnly]}
                  value={notes[item.id] ?? ''}
                  onChangeText={v => handleNotesChange(item.id, v)}
                  placeholder="Notes…"
                  editable={canUpdateStock}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  catUnit: { fontSize: 12, color: '#6b7280' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  itemBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemName: { flex: 1, fontSize: 13, color: '#374151' },
  qtyInput: { width: 72, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 14, textAlign: 'right', backgroundColor: '#fafafa' },
  notesInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, backgroundColor: '#fafafa' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  readOnlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  readOnlyText: { fontSize: 12, color: '#6b7280' },
  inputReadOnly: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
});
