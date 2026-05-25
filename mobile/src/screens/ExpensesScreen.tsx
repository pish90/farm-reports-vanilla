import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  cacheExpenseCategories,
  getCachedExpenseCategories,
  getLocalExpenses,
  loadExpensesFromServer,
  insertLocalExpense,
  updateLocalExpense,
  markExpenseForDelete,
} from '../db/repository';
import apiClient from '../services/apiClient';
import { syncAllPending } from '../services/syncService';
import { usePermissions } from '../hooks/usePermissions';
import type { ExpenseCategory, LocalExpenseRow } from '../types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface FormState {
  expenseDate: string;
  categoryId: number | null;
  categoryName: string | null;
  description: string;
  amount: string;
}

const EMPTY_FORM: FormState = { expenseDate: '', categoryId: null, categoryName: null, description: '', amount: '' };

export default function ExpensesScreen() {
  const { canAddExpense, canEditExpense } = usePermissions();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expenses, setExpenses] = useState<LocalExpenseRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  const defaultDate = `${year}-${String(month).padStart(2, '0')}-01`;

  const load = useCallback(async () => {
    setLoading(true);
    const [cachedCats, local] = await Promise.all([
      getCachedExpenseCategories(),
      getLocalExpenses(year, month),
    ]);
    setCategories(cachedCats);
    setExpenses(local);
    setLoading(false);

    try {
      const [catRes, expRes] = await Promise.all([
        apiClient.get('/expenses/categories'),
        apiClient.get('/expenses', { params: { year, month } }),
      ]);
      await cacheExpenseCategories(catRes.data);
      setCategories(catRes.data);
      await loadExpensesFromServer(expRes.data.map((e: any) => ({
        id: e.id,
        categoryId: e.categoryId ?? null,
        categoryName: e.categoryName ?? null,
        description: e.description ?? null,
        amount: Number(e.amount),
        expenseDate: e.expenseDate,
        year: e.year,
        month: e.month,
      })));
      const refreshed = await getLocalExpenses(year, month);
      setExpenses(refreshed);
    } catch { /* stay with local */ }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, expenseDate: defaultDate });
    setModalVisible(true);
  }

  function openEdit(e: LocalExpenseRow) {
    setEditingId(e.id);
    setForm({
      expenseDate: e.expense_date,
      categoryId: e.category_id,
      categoryName: e.category_name,
      description: e.description ?? '',
      amount: String(e.amount),
    });
    setModalVisible(true);
  }

  async function handleSave() {
    const amt = parseFloat(form.amount);
    if (!form.expenseDate || isNaN(amt) || amt <= 0) {
      Alert.alert('Validation', 'Date and a valid amount are required.'); return;
    }
    setSaving(true);
    try {
      if (editingId == null) {
        await insertLocalExpense(year, month, form.expenseDate, form.categoryId, form.categoryName, form.description || null, amt);
      } else {
        await updateLocalExpense(editingId, form.expenseDate, form.categoryId, form.categoryName, form.description || null, amt);
      }
      setModalVisible(false);
      const refreshed = await getLocalExpenses(year, month);
      setExpenses(refreshed);
      syncAllPending().catch(() => {});
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await markExpenseForDelete(id);
          const refreshed = await getLocalExpenses(year, month);
          setExpenses(refreshed);
          syncAllPending().catch(() => {});
        },
      },
    ]);
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2d6a4f" /></View>;

  return (
    <View style={s.container}>
      <View style={s.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Feather name="chevron-left" size={20} color="#374151" /></TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Feather name="chevron-right" size={20} color="#374151" /></TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {expenses.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>No expenses for this month.</Text></View>
        ) : (
          <>
            {expenses.map(e => (
              <View key={e.id} style={s.expenseCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.expenseDate}>{e.expense_date}</Text>
                  <Text style={s.expenseDesc} numberOfLines={1}>{e.description || e.category_name || 'Expense'}</Text>
                  {e.category_name && e.description && <Text style={s.expenseCat}>{e.category_name}</Text>}
                  {e.synced === 0 && <Text style={s.pending}>Pending sync</Text>}
                </View>
                <Text style={s.expenseAmount}>${e.amount.toFixed(2)}</Text>
                {canEditExpense && (
                  <>
                    <TouchableOpacity onPress={() => openEdit(e)} style={s.iconBtn}><Feather name="edit-2" size={16} color="#6b7280" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(e.id)} style={s.iconBtn}><Feather name="trash-2" size={16} color="#ef4444" /></TouchableOpacity>
                  </>
                )}
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalAmount}>${total.toFixed(2)}</Text>
            </View>
          </>
        )}
      </ScrollView>

      {canAddExpense && (
        <TouchableOpacity style={s.fab} onPress={openAdd}>
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{editingId == null ? 'Add Expense' : 'Edit Expense'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#2d6a4f" /> : <Text style={s.saveBtn}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody}>
            <Text style={s.fieldLabel}>Date *</Text>
            <TextInput style={s.input} value={form.expenseDate} onChangeText={v => setForm(f => ({ ...f, expenseDate: v }))} placeholder="YYYY-MM-DD" />

            <Text style={s.fieldLabel}>Category</Text>
            <TouchableOpacity style={s.input} onPress={() => setCatPickerVisible(true)}>
              <Text style={{ color: form.categoryName ? '#111827' : '#9ca3af' }}>{form.categoryName ?? 'Select category…'}</Text>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Description</Text>
            <TextInput style={s.input} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Optional description" />

            <Text style={s.fieldLabel}>Amount *</Text>
            <TextInput style={s.input} value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} keyboardType="decimal-pad" placeholder="0.00" />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category picker */}
      <Modal visible={catPickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCatPickerVisible(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <View />
            <Text style={s.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setCatPickerVisible(false)}><Text style={s.cancel}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <TouchableOpacity style={s.catItem} onPress={() => { setForm(f => ({ ...f, categoryId: null, categoryName: null })); setCatPickerVisible(false); }}>
              <Text style={s.catItemText}>— None —</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity key={c.id} style={s.catItem} onPress={() => { setForm(f => ({ ...f, categoryId: c.id, categoryName: c.name })); setCatPickerVisible(false); }}>
                <Text style={s.catItemText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginHorizontal: 12, minWidth: 140, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 80, gap: 8 },
  expenseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  expenseDate: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  expenseDesc: { fontSize: 14, color: '#111827', fontWeight: '500' },
  expenseCat: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  pending: { fontSize: 10, color: '#f59e0b', marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  iconBtn: { padding: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  totalAmount: { fontSize: 14, fontWeight: '700', color: '#2d6a4f' },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 52, height: 52, borderRadius: 26, backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cancel: { fontSize: 15, color: '#6b7280' },
  saveBtn: { fontSize: 15, color: '#2d6a4f', fontWeight: '700' },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, backgroundColor: '#fafafa' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  catItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catItemText: { fontSize: 15, color: '#111827' },
});
