import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MonthYearSelector from '../components/shared/MonthYearSelector';
import {
  getCachedWorkers,
  getLocalAttendance,
  getLocalStockRecords,
  getLocalExpenses,
} from '../db/repository';
import apiClient from '../services/apiClient';
import { syncAllPending } from '../services/syncService';
import { usePermissions } from '../hooks/usePermissions';
import type { ReportsStackParamList } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusColor = 'green' | 'amber' | 'red' | 'grey';

const STATUS_COLOR: Record<StatusColor, string> = {
  green: '#2d6a4f',
  amber: '#d97706',
  red:   '#e53e3e',
  grey:  '#9ca3af',
};

const STATUS_ICON: Record<StatusColor, keyof typeof Feather.glyphMap> = {
  green: 'check-circle',
  amber: 'alert-circle',
  red:   'x-circle',
  grey:  'minus-circle',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// ─── StatusRow ────────────────────────────────────────────────────────────────

function StatusRow({ label, detail, status }: { label: string; detail: string; status: StatusColor }) {
  return (
    <View style={rowS.row}>
      <Feather name={STATUS_ICON[status]} size={20} color={STATUS_COLOR[status]} style={rowS.icon} />
      <View style={rowS.body}>
        <Text style={rowS.label}>{label}</Text>
        <Text style={rowS.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const rowS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  icon:   { marginRight: 14 },
  body:   { flex: 1 },
  label:  { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  detail: { fontSize: 13, color: '#888', marginTop: 2 },
});

// ─── Section data ──────────────────────────────────────────────────────────────

interface SectionSummary {
  attendance: { workerCount: number; markedSlots: number; totalSlots: number };
  stock:      { nonZeroItems: number; totalItems: number };
  expenses:   { count: number; total: number };
}

async function buildSectionSummary(year: number, month: number): Promise<SectionSummary> {
  const daysInMonth = getDaysInMonth(year, month);
  const [workers, attendance, stock, expenses] = await Promise.all([
    getCachedWorkers(),
    getLocalAttendance(year, month),
    getLocalStockRecords(year, month),
    getLocalExpenses(year, month),
  ]);

  const workerCount  = workers.length;
  const totalSlots   = workerCount * daysInMonth;
  // A slot is "marked" if the status was explicitly set to something other than Absent
  const markedSlots  = attendance.filter(r => r.status && r.status !== 'A').length;

  const nonZeroItems = stock.filter(r => r.quantity > 0).length;
  const totalItems   = stock.length;

  const count = expenses.length;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    attendance: { workerCount, markedSlots, totalSlots },
    stock:      { nonZeroItems, totalItems },
    expenses:   { count, total },
  };
}

function attendanceStatus(s: SectionSummary['attendance']): StatusColor {
  if (s.workerCount === 0) return 'grey';
  if (s.markedSlots === 0) return 'red';
  if (s.markedSlots < s.totalSlots) return 'amber';
  return 'green';
}

function attendanceDetail(s: SectionSummary['attendance']): string {
  if (s.workerCount === 0) return 'No workers configured';
  return `${s.workerCount} worker${s.workerCount !== 1 ? 's' : ''}  ·  ${s.markedSlots} of ${s.totalSlots} slots marked`;
}

function stockStatus(s: SectionSummary['stock']): StatusColor {
  if (s.totalItems === 0) return 'grey';
  if (s.nonZeroItems === 0) return 'red';
  if (s.nonZeroItems < s.totalItems) return 'amber';
  return 'green';
}

function stockDetail(s: SectionSummary['stock']): string {
  if (s.totalItems === 0) return 'No stock entries this month';
  return `${s.nonZeroItems} of ${s.totalItems} item${s.totalItems !== 1 ? 's' : ''} with non-zero quantity`;
}

function expensesDetail(s: SectionSummary['expenses']): string {
  if (s.count === 0) return 'No expenses recorded';
  return `${s.count} entr${s.count !== 1 ? 'ies' : 'y'}  ·  Total: ${s.total.toFixed(2)}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<ReportsStackParamList, 'Summary'>;
type Route = RouteProp<ReportsStackParamList, 'Summary'>;

export default function SummaryScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { canSubmitReport } = usePermissions();

  const now = new Date();
  const [year,  setYear]  = useState(route.params?.year  ?? now.getFullYear());
  const [month, setMonth] = useState(route.params?.month ?? (now.getMonth() + 1));

  const [summary,      setSummary]      = useState<SectionSummary | null>(null);
  const [reportStatus, setReportStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [reopening,    setReopening]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, reportRes] = await Promise.all([
        buildSectionSummary(year, month),
        apiClient.get('/reports', { params: { year, month } }).catch(() => null),
      ]);
      setSummary(s);
      setReportStatus(reportRes?.data?.status ?? 'DRAFT');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    Alert.alert(
      'Submit Report',
      `Submit report for ${year}-${String(month).padStart(2, '0')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit', onPress: async () => {
            setSubmitting(true);
            try {
              await syncAllPending();
              await apiClient.post(`/reports/${year}/${month}/submit`, {});
              setReportStatus('SUBMITTED');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Could not submit report.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  async function handleReopen() {
    Alert.alert(
      'Reopen Report',
      'Reopen this report for editing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen', style: 'destructive', onPress: async () => {
            setReopening(true);
            try {
              await apiClient.post(`/reports/${year}/${month}/reopen`, {});
              setReportStatus('DRAFT');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Could not reopen report.');
            } finally {
              setReopening(false);
            }
          },
        },
      ],
    );
  }

  const isSubmitted = reportStatus === 'SUBMITTED';

  // ── Submitted view ─────────────────────────────────────────────────────────
  if (!loading && isSubmitted) {
    return (
      <View style={s.container}>
        <MonthYearSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <View style={s.successContainer}>
          <View style={s.successIcon}>
            <Feather name="check" size={48} color="#fff" />
          </View>
          <Text style={s.successTitle}>Report Submitted</Text>
          <Text style={s.successSub}>This month is locked and read-only.</Text>

          <View style={s.lockedNote}>
            <Feather name="lock" size={14} color="#888" style={{ marginRight: 6 }} />
            <Text style={s.lockedText}>
              Attendance, stock, and expense entries are disabled.
            </Text>
          </View>

          {canSubmitReport && (
            <TouchableOpacity
              style={s.reopenBtn}
              onPress={handleReopen}
              disabled={reopening}
              activeOpacity={0.8}
            >
              {reopening
                ? <ActivityIndicator size="small" color="#2d6a4f" />
                : (
                  <>
                    <Feather name="unlock" size={16} color="#2d6a4f" style={{ marginRight: 8 }} />
                    <Text style={s.reopenText}>Reopen Report</Text>
                  </>
                )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Normal view ────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <MonthYearSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#2d6a4f" />
        </View>
      ) : summary ? (
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.sectionHeading}>SECTION STATUS</Text>
          <View style={s.card}>
            <StatusRow
              label="Attendance"
              detail={attendanceDetail(summary.attendance)}
              status={attendanceStatus(summary.attendance)}
            />
            <StatusRow
              label="Stock"
              detail={stockDetail(summary.stock)}
              status={stockStatus(summary.stock)}
            />
            <StatusRow
              label="Expenses"
              detail={expensesDetail(summary.expenses)}
              status="green"
            />
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {(['green', 'amber', 'red', 'grey'] as StatusColor[]).map(c => (
              <View key={c} style={s.legendItem}>
                <Feather name={STATUS_ICON[c]} size={14} color={STATUS_COLOR[c]} />
                <Text style={s.legendText}>
                  {c === 'green' ? 'Complete' : c === 'amber' ? 'Partial' : c === 'red' ? 'Missing' : 'N/A'}
                </Text>
              </View>
            ))}
          </View>

          {canSubmitReport && (
            <TouchableOpacity
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <>
                    <Feather name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.submitText}>Submit Report</Text>
                  </>
                )}
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll:    { paddingBottom: 48 },

  sectionHeading: {
    fontSize: 12, fontWeight: '700', color: '#888',
    letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginHorizontal: 16,
  },
  card: {
    marginHorizontal: 16, borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
  },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginHorizontal: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 12, color: '#888' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 28, paddingVertical: 16,
    backgroundColor: '#2d6a4f', borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Submitted view
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  successSub:   { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
  lockedNote: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 32, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#f5f5f5', borderRadius: 8,
  },
  lockedText: { fontSize: 13, color: '#888' },
  reopenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, paddingVertical: 12, paddingHorizontal: 28,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#2d6a4f',
  },
  reopenText: { fontSize: 15, fontWeight: '600', color: '#2d6a4f' },
});
