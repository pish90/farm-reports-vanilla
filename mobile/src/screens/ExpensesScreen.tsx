import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import MonthYearSelector from '../components/shared/MonthYearSelector';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Expense row with swipe-to-delete ────────────────────────────────────────

interface RowProps {
  expense: LocalExpenseRow;
  canEdit: boolean;
  onEdit: (e: LocalExpenseRow) => void;
  onDelete: (e: LocalExpenseRow) => void;
}

function ExpenseRow({ expense, canEdit, onEdit, onDelete }: RowProps) {
  const swipeRef = useRef<Swipeable>(null);

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[rowStyles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={rowStyles.deleteBtn}
          onPress={() => { swipeRef.current?.close(); onDelete(expense); }}
        >
          <Feather name="trash-2" size={18} color="#fff" />
          <Text style={rowStyles.deleteLabel}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={canEdit ? renderRightActions : undefined}
      overshootRight={false}
    >
      <TouchableOpacity style={rowStyles.row} onPress={() => canEdit && onEdit(expense)} activeOpacity={0.7}>
        <View style={rowStyles.entryBadge}>
          <Text style={rowStyles.entryNo}>{expense.entry_no || '—'}</Text>
        </View>

        <View style={rowStyles.body}>
          <Text style={rowStyles.supplier} numberOfLines={1}>
            {expense.supplier_contractor || expense.description || '—'}
          </Text>
          {expense.supplier_contractor && expense.description ? (
            <Text style={rowStyles.description} numberOfLines={1}>{expense.description}</Text>
          ) : null}
          <Text style={rowStyles.meta} numberOfLines={1}>
            {formatDate(expense.expense_date)}
            {expense.category_name ? `  ·  ${expense.category_name}` : ''}
            {expense.receipt_no ? `  ·  #${expense.receipt_no}` : ''}
          </Text>
          {expense.synced === 0 && <Text style={rowStyles.pending}>Pending sync</Text>}
        </View>

        <Text style={rowStyles.cost}>{expense.amount.toFixed(2)}</Text>
        {canEdit && <Feather name="chevron-right" size={16} color="#ccc" style={{ marginLeft: 4 }} />}
      </TouchableOpacity>
    </Swipeable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8e8e8',
    minHeight: 60,
  },
  entryBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e8f5ef', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  entryNo:     { fontSize: 12, fontWeight: '700', color: '#2d6a4f' },
  body:        { flex: 1 },
  supplier:    { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  description: { fontSize: 13, color: '#555', marginTop: 1 },
  meta:        { fontSize: 12, color: '#888', marginTop: 2 },
  pending:     { fontSize: 10, color: '#f59e0b', marginTop: 2 },
  cost: {
    fontSize: 15, fontWeight: '700', color: '#1a1a1a',
    fontVariant: ['tabular-nums'], marginLeft: 8,
  },
  deleteAction: { width: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e53e3e' },
  deleteBtn:    { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  deleteLabel:  { fontSize: 12, fontWeight: '600', color: '#fff' },
});

// ─── Expense form (bottom sheet) ──────────────────────────────────────────────

interface FormValues {
  day: string;
  supplier_contractor: string;
  receipt_no: string;
  description: string;
  amount: string;
  category_id: number | null;
  category_name: string | null;
}

const EMPTY_FORM: FormValues = {
  day: '', supplier_contractor: '', receipt_no: '',
  description: '', amount: '',
  category_id: null, category_name: null,
};

interface FormProps {
  visible: boolean;
  year: number;
  month: number;
  initial?: FormValues;
  isEditing: boolean;
  categories: ExpenseCategory[];
  onSave: (values: FormValues) => void;
  onCancel: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ExpenseFormSheet({ visible, year, month, initial, isEditing, categories, onSave, onCancel }: FormProps) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const daysInMonth = getDaysInMonth(year, month);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const watchedCategoryName = watch('category_name');

  useEffect(() => {
    if (visible) {
      reset(initial ?? EMPTY_FORM);
    } else {
      setShowCatPicker(false);
    }
  }, [visible]);

  function handleRequestClose() {
    if (showCatPicker) { setShowCatPicker(false); return; }
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleRequestClose}>
      <Pressable style={formStyles.backdrop} onPress={onCancel} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={formStyles.kvWrap}
        pointerEvents="box-none"
      >
        <View style={formStyles.sheet}>
          <View style={formStyles.handle} />
          <Text style={formStyles.title}>{isEditing ? 'Edit Expense' : 'New Expense'}</Text>
          <Text style={formStyles.monthLabel}>{MONTHS[month - 1]} {year}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Day */}
            <Text style={formStyles.label}>Day *</Text>
            <Controller
              control={control} name="day"
              rules={{ required: 'Required', validate: v => {
                const n = parseInt(v, 10);
                return (!isNaN(n) && n >= 1 && n <= daysInMonth) || `Enter 1 – ${daysInMonth}`;
              }}}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[formStyles.input, !!errors.day && formStyles.inputError]}
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  keyboardType="number-pad"
                  placeholder={`1 – ${daysInMonth}`}
                  placeholderTextColor="#bbb"
                  maxLength={2} selectTextOnFocus
                />
              )}
            />
            {errors.day && <Text style={formStyles.errorText}>{errors.day.message}</Text>}

            {/* Supplier/Vendor */}
            <Text style={formStyles.label}>Supplier / Vendor</Text>
            <Controller
              control={control} name="supplier_contractor"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={formStyles.input}
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  placeholder="e.g. Acme Suppliers"
                  placeholderTextColor="#bbb"
                  autoCapitalize="words" maxLength={255} returnKeyType="next"
                />
              )}
            />

            {/* Receipt No */}
            <Text style={formStyles.label}>Receipt No.</Text>
            <Controller
              control={control} name="receipt_no"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={formStyles.input}
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  placeholder="e.g. 145"
                  placeholderTextColor="#bbb"
                  maxLength={100} returnKeyType="next"
                />
              )}
            />

            {/* Description */}
            <Text style={formStyles.label}>Description</Text>
            <Controller
              control={control} name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[formStyles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  placeholder="e.g. Feed, maintenance supplies…"
                  placeholderTextColor="#bbb"
                  multiline maxLength={500}
                />
              )}
            />

            {/* Category */}
            <Text style={formStyles.label}>Category</Text>
            <TouchableOpacity
              style={formStyles.pickerButton}
              onPress={() => { Keyboard.dismiss(); setShowCatPicker(true); }}
              activeOpacity={0.7}
            >
              <Text style={watchedCategoryName ? formStyles.pickerValue : formStyles.pickerPlaceholder}>
                {watchedCategoryName ?? 'Select category'}
              </Text>
              <Text style={formStyles.pickerChevron}>›</Text>
            </TouchableOpacity>

            {/* Amount */}
            <Text style={formStyles.label}>Amount *</Text>
            <Controller
              control={control} name="amount"
              rules={{ required: 'Required', validate: v => {
                const n = parseFloat(v);
                return (!isNaN(n) && n > 0) || 'Must be greater than 0';
              }}}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[formStyles.input, !!errors.amount && formStyles.inputError]}
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#bbb"
                  maxLength={12} selectTextOnFocus
                />
              )}
            />
            {errors.amount && <Text style={formStyles.errorText}>{errors.amount.message}</Text>}

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={formStyles.buttonRow}>
            <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel}>
              <Text style={formStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={formStyles.saveBtn} onPress={handleSubmit(onSave)}>
              <Text style={formStyles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Category picker */}
      {Platform.OS === 'ios' ? (
        showCatPicker ? (
          <>
            <Pressable style={formStyles.dropdownBackdrop} onPress={() => setShowCatPicker(false)} />
            <View style={formStyles.dropdownSheet}>
              <View style={formStyles.handle} />
              <Text style={formStyles.dropdownTitle}>Select Category</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={formStyles.dropdownItem} onPress={() => { setValue('category_id', null); setValue('category_name', null); setShowCatPicker(false); }}>
                  <Text style={formStyles.dropdownItemText}>— None —</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity key={c.id} style={formStyles.dropdownItem} onPress={() => { setValue('category_id', c.id); setValue('category_name', c.name); setShowCatPicker(false); }}>
                    <Text style={formStyles.dropdownItemText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </>
        ) : null
      ) : (
        <Modal visible={showCatPicker} transparent animationType="slide" onRequestClose={() => setShowCatPicker(false)}>
          <Pressable style={formStyles.dropdownBackdrop} onPress={() => setShowCatPicker(false)} />
          <View style={formStyles.dropdownSheet}>
            <View style={formStyles.handle} />
            <Text style={formStyles.dropdownTitle}>Select Category</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={formStyles.dropdownItem} onPress={() => { setValue('category_id', null); setValue('category_name', null); setShowCatPicker(false); }}>
                <Text style={formStyles.dropdownItemText}>— None —</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={formStyles.dropdownItem} onPress={() => { setValue('category_id', c.id); setValue('category_name', c.name); setShowCatPicker(false); }}>
                  <Text style={formStyles.dropdownItemText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  kvWrap:   { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  title:      { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  monthLabel: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: '#1a1a1a', backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#e53e3e' },
  errorText:  { fontSize: 12, color: '#e53e3e', marginTop: 3 },

  pickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa',
  },
  pickerValue:       { fontSize: 15, color: '#1a1a1a', flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: '#bbb', flex: 1 },
  pickerChevron:     { fontSize: 20, color: '#aaa', marginLeft: 8 },

  dropdownBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50, elevation: 10 },
  dropdownSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 16, zIndex: 100, elevation: 20,
  },
  dropdownTitle: {
    fontSize: 16, fontWeight: '700', color: '#1a1a1a', textAlign: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  dropdownItem: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: { fontSize: 15, color: '#1a1a1a' },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  saveBtn:    { flex: 1, backgroundColor: '#2d6a4f', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { canAddExpense, canEditExpense } = usePermissions();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [expenses,      setExpenses]      = useState<LocalExpenseRow[]>([]);
  const [categories,    setCategories]    = useState<ExpenseCategory[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isSubmitted,   setIsSubmitted]   = useState(false);
  const [formVisible,   setFormVisible]   = useState(false);
  const [editingExp,    setEditingExp]    = useState<LocalExpenseRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cachedCats, local] = await Promise.all([
      getCachedExpenseCategories(),
      getLocalExpenses(year, month),
    ]);
    setCategories(cachedCats);
    setExpenses(local);
    setLoading(false);

    // Refresh from server in background
    try {
      const [catRes, expRes, reportRes] = await Promise.all([
        apiClient.get('/expenses/categories'),
        apiClient.get('/expenses', { params: { year, month } }),
        apiClient.get('/reports', { params: { year, month } }),
      ]);
      await cacheExpenseCategories(catRes.data);
      setCategories(catRes.data);
      setIsSubmitted(reportRes.data?.status === 'SUBMITTED');
      await loadExpensesFromServer(expRes.data.map((e: any) => ({
        id: e.id, categoryId: e.categoryId ?? null, categoryName: e.categoryName ?? null,
        description: e.description ?? null, amount: Number(e.amount),
        expenseDate: e.expenseDate, year: e.year, month: e.month,
        supplierContractor: e.supplierContractor ?? null,
        receiptNo: e.receiptNo ?? null,
      })));
      const refreshed = await getLocalExpenses(year, month);
      setExpenses(refreshed);
    } catch { /* stay with local */ }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    if (isSubmitted) return;
    setEditingExp(null);
    setFormVisible(true);
  }

  function openEdit(e: LocalExpenseRow) {
    if (isSubmitted) return;
    setEditingExp(e);
    setFormVisible(true);
  }

  const getInitialValues = (): FormValues | undefined => {
    if (!editingExp) return undefined;
    const dateParts = editingExp.expense_date.split('-');
    const day = dateParts.length === 3 ? String(parseInt(dateParts[2], 10)) : '';
    return {
      day,
      supplier_contractor: editingExp.supplier_contractor ?? '',
      receipt_no:          editingExp.receipt_no ?? '',
      description:         editingExp.description ?? '',
      amount:              String(editingExp.amount),
      category_id:         editingExp.category_id,
      category_name:       editingExp.category_name,
    };
  };

  const handleSave = useCallback(async (values: FormValues) => {
    setFormVisible(false);
    const day    = parseInt(values.day, 10);
    const amount = parseFloat(values.amount);
    const expenseDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      if (editingExp) {
        await updateLocalExpense(
          editingExp.id, expenseDate,
          values.category_id, values.category_name,
          values.description || null, amount,
          values.supplier_contractor || null, values.receipt_no || null,
        );
      } else {
        await insertLocalExpense(
          year, month, expenseDate,
          values.category_id, values.category_name,
          values.description || null, amount,
          values.supplier_contractor || null, values.receipt_no || null,
        );
      }
      const refreshed = await getLocalExpenses(year, month);
      setExpenses(refreshed);
      syncAllPending().catch(() => {});
    } catch { /* user can retry */ }
  }, [editingExp, year, month]);

  const handleDelete = useCallback(async (expense: LocalExpenseRow) => {
    try {
      await markExpenseForDelete(expense.id);
      const refreshed = await getLocalExpenses(year, month);
      setExpenses(refreshed);
      syncAllPending().catch(() => {});
    } catch { /* ignore */ }
  }, [year, month]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const canEdit = canEditExpense && !isSubmitted;
  const canAdd  = canAddExpense  && !isSubmitted;

  const renderItem = useCallback(
    ({ item }: { item: LocalExpenseRow }) => (
      <ExpenseRow
        expense={item}
        canEdit={canEdit}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    ),
    [canEdit, handleDelete],
  );

  return (
    <View style={styles.container}>
      <MonthYearSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />

      {isSubmitted && (
        <View style={styles.submittedBanner}>
          <Feather name="lock" size={13} color="#92400e" />
          <Text style={styles.submittedBannerText}>
            This month has been submitted. Reopen from Reports to make changes.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d6a4f" />
        </View>
      ) : (
        <>
          <FlatList
            data={expenses}
            renderItem={renderItem}
            keyExtractor={item => String(item.id)}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="dollar-sign" size={44} color="#ccc" />
                <Text style={styles.emptyText}>No expenses yet</Text>
                <Text style={styles.emptyHint}>
                  {canAdd ? 'Tap + to add the first entry' : 'No expenses recorded this month.'}
                </Text>
              </View>
            }
            ListFooterComponent={
              expenses.length > 0 ? (
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{total.toFixed(2)}</Text>
                </View>
              ) : null
            }
            contentContainerStyle={expenses.length === 0 ? styles.emptyContainer : styles.listContent}
            keyboardShouldPersistTaps="handled"
          />

          {canAdd && (
            <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
              <Feather name="plus" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      )}

      <ExpenseFormSheet
        visible={formVisible}
        year={year}
        month={month}
        initial={editingExp ? getInitialValues() : undefined}
        isEditing={!!editingExp}
        categories={categories}
        onSave={handleSave}
        onCancel={() => setFormVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f7f9' },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  submittedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderBottomWidth: 1, borderBottomColor: '#fde68a',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  submittedBannerText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  listContent:    { paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#aaa', marginTop: 14 },
  emptyHint: { fontSize: 13, color: '#bbb', marginTop: 4, textAlign: 'center', marginHorizontal: 24 },
  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    margin: 16, paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#2d6a4f', borderRadius: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5,
  },
});
