import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../services/apiClient';
import type { DashboardData } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DashboardScreen() {
  const now = new Date();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiClient.get('/dashboard');
      setData(res.data);
    } catch { /* show cached/empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>;
  }

  const month = data ? MONTHS[data.month - 1] : MONTHS[now.getMonth()];
  const year = data?.year ?? now.getFullYear();
  const maxExpense = data?.expensesByCategory.reduce((m, c) => Math.max(m, Number(c.total)), 0) ?? 0;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2d6a4f" />}
    >
      <Text style={s.period}>{month} {year}</Text>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { flex: 1 }]}>
          <Text style={s.statValue}>{data?.presentToday ?? '—'}</Text>
          <Text style={s.statLabel}>Present Today</Text>
        </View>
        <View style={[s.statCard, { flex: 1 }]}>
          <Text style={s.statValue}>{data?.totalWorkers ?? '—'}</Text>
          <Text style={s.statLabel}>Workers</Text>
        </View>
        <View style={[s.statCard, { flex: 1 }]}>
          <Text style={s.statValue}>${Number(data?.totalExpensesThisMonth ?? 0).toFixed(0)}</Text>
          <Text style={s.statLabel}>Expenses</Text>
        </View>
      </View>

      {/* Expenses by category */}
      {!!data?.expensesByCategory?.length && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Expenses by Category</Text>
          {data.expensesByCategory.map((c, i) => (
            <View key={i} style={s.barRow}>
              <Text style={s.barLabel} numberOfLines={1}>{c.category}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: maxExpense > 0 ? `${(Number(c.total) / maxExpense) * 100}%` : '0%' as any }]} />
              </View>
              <Text style={s.barAmount}>${Number(c.total).toFixed(0)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stock snapshot */}
      {!!data?.stockSummary?.length && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Stock Snapshot</Text>
          {data.stockSummary.map((s2, i) => (
            <View key={i} style={s.stockRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.stockItem}>{s2.item}</Text>
                <Text style={s.stockCat}>{s2.category}</Text>
              </View>
              <Text style={s.stockQty}>{Number(s2.quantity).toFixed(1)}{s2.unit ? ` ${s2.unit}` : ''}</Text>
            </View>
          ))}
        </View>
      )}

      {!data && (
        <View style={s.empty}>
          <Text style={s.emptyText}>No data available. Pull to refresh when online.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  period: { fontSize: 13, color: '#6b7280', fontWeight: '500', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#2d6a4f' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barLabel: { width: 90, fontSize: 12, color: '#374151' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#2d6a4f', borderRadius: 4 },
  barAmount: { width: 52, fontSize: 12, color: '#374151', textAlign: 'right' },
  stockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stockItem: { fontSize: 13, color: '#111827', fontWeight: '500' },
  stockCat: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  stockQty: { fontSize: 13, fontWeight: '600', color: '#2d6a4f' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
});
