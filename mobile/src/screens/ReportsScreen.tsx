import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MonthYearSelector from '../components/shared/MonthYearSelector';
import apiClient from '../services/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import type { ReportDto, ReportsStackParamList } from '../types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type Nav = NativeStackNavigationProp<ReportsStackParamList, 'ReportsHome'>;

export default function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const { canSubmitReport } = usePermissions();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<ReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiClient.get('/reports', { params: { year, month } });
      setReport(res.data);
    } catch (e: any) {
      if (e?.response?.status === 404) setReport(null);
    } finally { setLoading(false); setRefreshing(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    Alert.alert('Submit Report', `Submit report for ${MONTHS[month - 1]} ${year}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit', style: 'default', onPress: async () => {
          setSubmitting(true);
          try {
            await apiClient.post(`/reports/${year}/${month}/submit`, {});
            await load();
          } catch { Alert.alert('Error', 'Could not submit report.'); }
          finally { setSubmitting(false); }
        },
      },
    ]);
  }

  async function handleReopen() {
    Alert.alert('Reopen Report', 'Reopen this report for editing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen', style: 'destructive', onPress: async () => {
          setSubmitting(true);
          try {
            await apiClient.post(`/reports/${year}/${month}/reopen`, {});
            await load();
          } catch { Alert.alert('Error', 'Could not reopen report.'); }
          finally { setSubmitting(false); }
        },
      },
    ]);
  }

  const isSubmitted = report?.status === 'SUBMITTED';

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <View style={{ flex: 1 }}>
          <MonthYearSelector
            year={year}
            month={month}
            onChange={(y, m) => { setYear(y); setMonth(m); }}
          />
        </View>
        <TouchableOpacity
          style={s.summaryBtn}
          onPress={() => navigation.navigate('Summary', { year, month })}
          hitSlop={8}
        >
          <Feather name="clipboard" size={20} color="#2d6a4f" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2d6a4f" />}
        >
          {/* Status + actions */}
          <View style={s.statusRow}>
            <View style={[s.badge, isSubmitted ? s.badgeSubmitted : s.badgeDraft]}>
              <Text style={[s.badgeText, isSubmitted ? s.badgeTextSubmitted : s.badgeTextDraft]}>
                {report ? (isSubmitted ? 'Submitted' : 'Draft') : 'No Report'}
              </Text>
            </View>
            {canSubmitReport && report && (
              <TouchableOpacity
                style={[s.actionBtn, isSubmitted ? s.reopenBtn : s.submitBtn]}
                onPress={isSubmitted ? handleReopen : handleSubmit}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={s.actionBtnText}>{isSubmitted ? 'Reopen' : 'Submit'}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {!report ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No report data for {MONTHS[month - 1]} {year}.</Text>
              <Text style={s.emptyHint}>Enter attendance, stock, and expenses first.</Text>
            </View>
          ) : (
            <>
              {/* Attendance section */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Attendance</Text>
                <View style={s.statsRow}>
                  <View style={s.stat}><Text style={s.statVal}>{report.attendance.workingDays}</Text><Text style={s.statLbl}>Working Days</Text></View>
                  <View style={s.stat}><Text style={[s.statVal, { color: '#16a34a' }]}>{report.attendance.totalPresent}</Text><Text style={s.statLbl}>Present</Text></View>
                  <View style={s.stat}><Text style={[s.statVal, { color: '#dc2626' }]}>{report.attendance.totalAbsent}</Text><Text style={s.statLbl}>Absent</Text></View>
                </View>
                {report.attendance.workers.map((w, i) => (
                  <View key={i} style={s.tableRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowPrimary}>{w.name}</Text>
                      {w.jobTitle && <Text style={s.rowSub}>{w.jobTitle}</Text>}
                    </View>
                    <Text style={s.rowGreen}>{w.present}P</Text>
                    <Text style={s.rowRed}> / {w.absent}A</Text>
                  </View>
                ))}
              </View>

              {/* Stock section */}
              {report.stock.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Stock</Text>
                  {report.stock.map((cat, ci) => (
                    <View key={ci}>
                      <View style={s.catHeader}>
                        <Text style={s.catName}>{cat.category}</Text>
                        {cat.unit && <Text style={s.catUnit}>{cat.unit}</Text>}
                      </View>
                      {cat.items.map((item, ii) => (
                        <View key={ii} style={s.tableRow}>
                          <Text style={[s.rowPrimary, { flex: 1 }]}>{item.item}</Text>
                          <Text style={s.rowGreen}>{item.quantity != null ? Number(item.quantity).toFixed(2) : '—'}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* Expenses section */}
              {report.expenses.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Expenses</Text>
                  {report.expenses.map((cat, ci) => (
                    <View key={ci}>
                      <View style={s.catHeader}>
                        <Text style={s.catName}>{cat.category}</Text>
                        <Text style={s.catUnit}>${Number(cat.subtotal).toFixed(2)}</Text>
                      </View>
                      {cat.entries.map((e, ei) => (
                        <View key={ei} style={s.tableRow}>
                          <Text style={s.rowSub}>{e.date}</Text>
                          <Text style={[s.rowPrimary, { flex: 1, marginHorizontal: 8 }]} numberOfLines={1}>{e.description || '—'}</Text>
                          <Text style={s.rowGreen}>${Number(e.amount).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  <View style={[s.tableRow, { borderTopWidth: 2, borderTopColor: '#e5e7eb', marginTop: 4 }]}>
                    <Text style={[s.rowPrimary, { flex: 1, fontWeight: '700' }]}>Total</Text>
                    <Text style={[s.rowGreen, { fontWeight: '700' }]}>${Number(report.totalExpenses).toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeDraft: { backgroundColor: '#fef9c3' },
  badgeSubmitted: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextDraft: { color: '#ca8a04' },
  badgeTextSubmitted: { color: '#16a34a' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  submitBtn: { backgroundColor: '#2d6a4f' },
  reopenBtn: { backgroundColor: '#6b7280' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  section: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statsRow: { flexDirection: 'row', padding: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  rowPrimary: { fontSize: 13, color: '#111827' },
  rowSub: { fontSize: 11, color: '#9ca3af' },
  rowGreen: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  rowRed: { fontSize: 13, color: '#dc2626' },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catName: { fontSize: 12, fontWeight: '700', color: '#374151' },
  catUnit: { fontSize: 12, color: '#6b7280' },
  empty: { backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
});
