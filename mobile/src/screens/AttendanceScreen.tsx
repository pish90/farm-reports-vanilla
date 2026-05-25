import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  cacheWorkers,
  getCachedWorkers,
  getLocalAttendance,
  loadAttendanceFromServer,
  upsertAttendance,
  markAttendanceDateDirty,
} from '../db/repository';
import apiClient from '../services/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import type { Worker, LocalAttendanceRow } from '../types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }

export default function AttendanceScreen() {
  const { canMarkAttendance } = usePermissions();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const totalDays = daysInMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  function key(workerId: number, day: number) { return `${workerId}-${day}`; }

  const load = useCallback(async () => {
    setLoading(true);
    // Load cached workers first
    const cached = await getCachedWorkers();
    setWorkers(cached);

    // Load local attendance
    const rows: LocalAttendanceRow[] = await getLocalAttendance(year, month);
    const map: Record<string, boolean> = {};
    rows.forEach(r => { map[key(r.worker_id, r.day_of_month)] = r.present === 1; });
    setAttendance(map);
    setLoading(false);

    // Refresh from server in background
    try {
      const [wRes, aRes] = await Promise.all([
        apiClient.get('/workers'),
        apiClient.get('/attendance', { params: { year, month } }),
      ]);
      await cacheWorkers(wRes.data);
      setWorkers(wRes.data);

      const serverRecords = aRes.data as Array<{ workerId: number; workerName: string; date: string; present: boolean }>;
      await loadAttendanceFromServer(serverRecords);
      const fresh = await getLocalAttendance(year, month);
      const freshMap: Record<string, boolean> = {};
      fresh.forEach(r => { freshMap[key(r.worker_id, r.day_of_month)] = r.present === 1; });
      setAttendance(freshMap);
    } catch { /* stay with local data */ }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function toggle(workerId: number, workerName: string, day: number) {
    if (!canMarkAttendance) return;
    const k = key(workerId, day);
    const newVal = !(attendance[k] ?? false);
    setAttendance(prev => ({ ...prev, [k]: newVal }));

    clearTimeout(debounceRef.current[k]);
    debounceRef.current[k] = setTimeout(async () => {
      await upsertAttendance(year, month, day, workerId, workerName, newVal);
      await markAttendanceDateDirty(year, month, day);
    }, 500);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>;

  return (
    <View style={s.container}>
      {/* Month nav */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Feather name="chevron-left" size={20} color="#374151" /></TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Feather name="chevron-right" size={20} color="#374151" /></TouchableOpacity>
      </View>

      {workers.length === 0 ? (
        <View style={s.empty}><Text style={s.emptyText}>No workers found. Add workers in Settings.</Text></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View style={s.headerRow}>
              <View style={s.nameCol} />
              {days.map(d => (
                <View key={d} style={s.dayCol}>
                  <Text style={s.dayLabel}>{d}</Text>
                </View>
              ))}
              <View style={s.summaryCol}><Text style={s.dayLabel}>P</Text></View>
            </View>

            {/* Worker rows */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {workers.map(w => {
                const presentCount = days.filter(d => attendance[key(w.id, d)]).length;
                return (
                  <View key={w.id} style={s.workerRow}>
                    <View style={s.nameCol}><Text style={s.workerName} numberOfLines={1}>{w.name}</Text></View>
                    {days.map(d => {
                      const present = attendance[key(w.id, d)] ?? false;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[s.cell, present ? s.cellPresent : s.cellAbsent, !canMarkAttendance && s.cellReadOnly]}
                          onPress={() => toggle(w.id, w.name, d)}
                          activeOpacity={canMarkAttendance ? 0.6 : 1}
                        >
                          <Text style={[s.cellText, present ? s.cellTextPresent : s.cellTextAbsent]}>
                            {present ? 'P' : 'A'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={s.summaryCol}><Text style={s.summaryText}>{presentCount}</Text></View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const CELL_SIZE = 34;
const NAME_WIDTH = 110;
const SUMMARY_WIDTH = 36;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginHorizontal: 12, minWidth: 140, textAlign: 'center' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  nameCol: { width: NAME_WIDTH, paddingHorizontal: 10, justifyContent: 'center' },
  dayCol: { width: CELL_SIZE, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  summaryCol: { width: SUMMARY_WIDTH, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  workerRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  workerName: { fontSize: 13, color: '#111827', paddingHorizontal: 10 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center', margin: 2, borderRadius: 6 },
  cellReadOnly: { opacity: 0.75 },
  cellPresent: { backgroundColor: '#dcfce7' },
  cellAbsent: { backgroundColor: '#f3f4f6' },
  cellText: { fontSize: 11, fontWeight: '700' },
  cellTextPresent: { color: '#16a34a' },
  cellTextAbsent: { color: '#9ca3af' },
  summaryText: { fontSize: 13, fontWeight: '700', color: '#2d6a4f' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
});
