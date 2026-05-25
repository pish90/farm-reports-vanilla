import { useState } from 'react';
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
import apiClient from '../services/apiClient';
import { useAuth } from '../store/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

type Tab = 'account' | 'workers' | 'stock' | 'expenses' | 'users';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  FARM_MANAGER: 'Farm Manager',
  OPS: 'Ops',
  VIEWER: 'Viewer',
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const p = usePermissions();
  const [tab, setTab] = useState<Tab>('account');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'account', label: 'Account' },
    ...(p.showWorkersSettingsTab ? [{ key: 'workers' as Tab, label: 'Workers' }] : []),
    ...(p.showStockSettingsTab ? [{ key: 'stock' as Tab, label: 'Stock' }] : []),
    ...(p.showExpenseCatsTab ? [{ key: 'expenses' as Tab, label: 'Expenses' }] : []),
    ...(p.showUsersTab ? [{ key: 'users' as Tab, label: 'Users' }] : []),
  ];

  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabContent}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[s.tabPill, tab === t.key && s.tabPillActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'account' && <AccountTab />}
      {tab === 'workers' && p.showWorkersSettingsTab && <WorkersTab canManage={p.canManageWorkers} />}
      {tab === 'stock' && p.showStockSettingsTab && <StockTab />}
      {tab === 'expenses' && p.showExpenseCatsTab && <ExpenseCatsTab />}
      {tab === 'users' && p.showUsersTab && <UsersTab />}
    </View>
  );
}

// ─── Account tab ───────────────────────────────────────────────────────────────

function AccountTab() {
  const { user, logout, changePassword } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChangePw() {
    if (!currentPw || newPw.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters.'); return;
    }
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert('Success', 'Password changed.');
      setCurrentPw(''); setNewPw('');
    } catch {
      Alert.alert('Error', 'Incorrect current password.');
    } finally { setSaving(false); }
  }

  const roleBadgeColor = { ADMIN: '#2d6a4f', FARM_MANAGER: '#0e7490', OPS: '#7c3aed', VIEWER: '#6b7280', MANAGER: '#0e7490', WORKER: '#6b7280' };

  return (
    <ScrollView style={s.tabBody} contentContainerStyle={s.tabBodyContent}>
      <View style={s.profileCard}>
        <View style={[s.avatar, { backgroundColor: roleBadgeColor[user?.role ?? 'VIEWER'] ?? '#2d6a4f' }]}>
          <Text style={s.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{user?.name}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
          <View style={[s.rolePillSmall, { backgroundColor: roleBadgeColor[user?.role ?? 'VIEWER'] ?? '#2d6a4f' }]}>
            <Text style={s.rolePillSmallText}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Change Password</Text>

        <Text style={s.fieldLabel}>Current Password</Text>
        <View style={s.pwRow}>
          <TextInput style={s.pwInput} value={currentPw} onChangeText={setCurrentPw} secureTextEntry={!showCurrent} placeholder="••••••••" />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
            <Feather name={showCurrent ? 'eye-off' : 'eye'} size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Text style={s.fieldLabel}>New Password</Text>
        <View style={s.pwRow}>
          <TextInput style={s.pwInput} value={newPw} onChangeText={setNewPw} secureTextEntry={!showNew} placeholder="Min. 6 characters" />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNew(v => !v)}>
            <Feather name={showNew ? 'eye-off' : 'eye'} size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleChangePw} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update Password</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={s.logoutBtn}
        onPress={() => Alert.alert('Sign Out', 'Sign out of Farm Reports?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: logout },
        ])}
      >
        <Feather name="log-out" size={16} color="#dc2626" />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Workers tab ───────────────────────────────────────────────────────────────

interface WorkerItem { id: number; name: string; jobTitle: string | null; active: boolean }

function WorkersTab({ canManage }: { canManage: boolean }) {
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addName, setAddName] = useState('');
  const [addJob, setAddJob] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState<WorkerItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editJob, setEditJob] = useState('');

  async function load() {
    setLoading(true);
    try { const r = await apiClient.get('/workers/all'); setWorkers(r.data); } catch {}
    setLoading(false);
  }

  useState(() => { load(); });

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/workers', { name: addName.trim(), jobTitle: addJob.trim() || null });
      setAddName(''); setAddJob('');
      await load();
    } catch { Alert.alert('Error', 'Could not add worker.'); }
    finally { setSaving(false); }
  }

  function openEdit(w: WorkerItem) {
    setEditing(w);
    setEditName(w.name);
    setEditJob(w.jobTitle ?? '');
    setEditModal(true);
  }

  async function handleEdit() {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    try {
      await apiClient.put(`/workers/${editing.id}`, { name: editName.trim(), jobTitle: editJob.trim() || null });
      setEditModal(false);
      await load();
    } catch { Alert.alert('Error', 'Could not update worker.'); }
    finally { setSaving(false); }
  }

  async function handleDeactivate(id: number, name: string) {
    Alert.alert('Remove Worker', `Remove ${name} from active workers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await apiClient.delete(`/workers/${id}`); await load(); },
      },
    ]);
  }

  async function handleReactivate(id: number) {
    try {
      await apiClient.put(`/workers/${id}`, { ...workers.find(w => w.id === id), active: true });
      await load();
    } catch { Alert.alert('Error', 'Could not reactivate worker.'); }
  }

  const active = workers.filter(w => w.active);
  const inactive = workers.filter(w => !w.active);

  return (
    <ScrollView style={s.tabBody} contentContainerStyle={s.tabBodyContent}>
      {canManage && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Add Worker</Text>
          <TextInput style={s.input} value={addName} onChangeText={setAddName} placeholder="Full name *" />
          <TextInput style={[s.input, { marginTop: 8 }]} value={addJob} onChangeText={setAddJob} placeholder="Job title (optional)" />
          <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleAdd} disabled={saving}>
            <Text style={s.btnText}>Add Worker</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Active Workers {active.length > 0 && `(${active.length})`}</Text>
        {loading ? <ActivityIndicator color="#2d6a4f" /> : active.map(w => (
          <View key={w.id} style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.listPrimary}>{w.name}</Text>
              {w.jobTitle && <Text style={s.listSub}>{w.jobTitle}</Text>}
            </View>
            {canManage && (
              <View style={s.rowActions}>
                <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(w)}>
                  <Feather name="edit-2" size={16} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => handleDeactivate(w.id, w.name)}>
                  <Feather name="x-circle" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {!loading && active.length === 0 && <Text style={[s.listSub, { padding: 12 }]}>No active workers.</Text>}
      </View>

      {inactive.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Inactive Workers</Text>
          {inactive.map(w => (
            <View key={w.id} style={s.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.listPrimary, { color: '#9ca3af' }]}>{w.name}</Text>
                {w.jobTitle && <Text style={s.listSub}>{w.jobTitle}</Text>}
              </View>
              {canManage && (
                <TouchableOpacity style={s.iconBtn} onPress={() => handleReactivate(w.id)}>
                  <Feather name="refresh-cw" size={16} color="#16a34a" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setEditModal(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Edit Worker</Text>
            <TouchableOpacity onPress={handleEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#2d6a4f" /> : <Text style={s.saveBtn}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={s.fieldLabel}>Full Name *</Text>
            <TextInput style={s.input} value={editName} onChangeText={setEditName} placeholder="Full name" autoFocus />
            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Job Title</Text>
            <TextInput style={s.input} value={editJob} onChangeText={setEditJob} placeholder="Job title (optional)" />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ─── Stock categories tab ──────────────────────────────────────────────────────

function StockTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [catName, setCatName] = useState('');
  const [catUnit, setCatUnit] = useState('');
  const [itemModal, setItemModal] = useState<{ catId: number; catName: string } | null>(null);
  const [itemName, setItemName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const r = await apiClient.get('/stock/categories'); setCategories(r.data); } catch {}
    setLoading(false);
  }

  useState(() => { load(); });

  async function addCategory() {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/stock/categories', { name: catName.trim(), unit: catUnit.trim() || null, displayOrder: 0, active: true, items: [] });
      setCatName(''); setCatUnit('');
      await load();
    } catch { Alert.alert('Error', 'Could not add category.'); }
    finally { setSaving(false); }
  }

  async function addItem() {
    if (!itemName.trim() || !itemModal) return;
    setSaving(true);
    try {
      await apiClient.post(`/stock/categories/${itemModal.catId}/items`, { name: itemName.trim(), displayOrder: 0, active: true });
      setItemName(''); setItemModal(null);
      await load();
    } catch { Alert.alert('Error', 'Could not add item.'); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView style={s.tabBody} contentContainerStyle={s.tabBodyContent}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Add Category</Text>
        <TextInput style={s.input} value={catName} onChangeText={setCatName} placeholder="Category name *" />
        <TextInput style={[s.input, { marginTop: 8 }]} value={catUnit} onChangeText={setCatUnit} placeholder="Unit (kg, head, litres…)" />
        <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={addCategory} disabled={saving}>
          <Text style={s.btnText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#2d6a4f" /> : categories.map(cat => (
        <View key={cat.id} style={s.section}>
          <View style={s.catHeader}>
            <Text style={s.sectionTitle}>{cat.name}{cat.unit ? ` (${cat.unit})` : ''}</Text>
            <TouchableOpacity onPress={() => { setItemModal({ catId: cat.id, catName: cat.name }); setItemName(''); }}>
              <Feather name="plus-circle" size={18} color="#2d6a4f" />
            </TouchableOpacity>
          </View>
          {cat.items?.map((item: any) => (
            <View key={item.id} style={s.listRow}>
              <Text style={s.listPrimary}>{item.name}</Text>
            </View>
          ))}
          {cat.items?.length === 0 && <Text style={[s.listSub, { padding: 12 }]}>No items yet</Text>}
        </View>
      ))}

      <Modal visible={!!itemModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setItemModal(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setItemModal(null)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Add Item to {itemModal?.catName}</Text>
            <TouchableOpacity onPress={addItem} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#2d6a4f" /> : <Text style={s.saveBtn}>Add</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <TextInput style={s.input} value={itemName} onChangeText={setItemName} placeholder="Item name *" autoFocus />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Expense categories tab ────────────────────────────────────────────────────

function ExpenseCatsTab() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const r = await apiClient.get('/expenses/categories'); setCats(r.data); } catch {}
    setLoading(false);
  }

  useState(() => { load(); });

  async function addCat() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/expenses/categories', { name: name.trim(), active: true });
      setName('');
      await load();
    } catch { Alert.alert('Error', 'Could not add category.'); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView style={s.tabBody} contentContainerStyle={s.tabBodyContent}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Add Category</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Category name *" />
        <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={addCat} disabled={saving}>
          <Text style={s.btnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Categories</Text>
        {loading ? <ActivityIndicator color="#2d6a4f" /> : cats.map((c: any) => (
          <View key={c.id} style={s.listRow}>
            <Text style={s.listPrimary}>{c.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Users tab ─────────────────────────────────────────────────────────────────

const USER_ROLES = ['ADMIN', 'FARM_MANAGER', 'OPS', 'VIEWER'] as const;

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const r = await apiClient.get('/users'); setUsers(r.data); } catch {}
    setLoading(false);
  }

  useState(() => { load(); });

  async function createUser() {
    if (!form.name || !form.email || !form.password) { Alert.alert('Validation', 'All fields required.'); return; }
    setSaving(true);
    try {
      await apiClient.post('/users', form);
      setModal(false); setForm({ name: '', email: '', password: '', role: 'VIEWER' });
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not create user.');
    } finally { setSaving(false); }
  }

  async function toggleActive(u: any) {
    try {
      const endpoint = u.active ? `/users/${u.id}/deactivate` : `/users/${u.id}/activate`;
      await apiClient.put(endpoint, {});
      await load();
    } catch { Alert.alert('Error', 'Could not update user.'); }
  }

  const roleColor: Record<string, string> = {
    ADMIN: '#2d6a4f', FARM_MANAGER: '#0e7490', OPS: '#7c3aed', VIEWER: '#6b7280',
    MANAGER: '#0e7490', WORKER: '#6b7280',
  };

  return (
    <ScrollView style={s.tabBody} contentContainerStyle={s.tabBodyContent}>
      <TouchableOpacity style={s.btn} onPress={() => setModal(true)}>
        <Text style={s.btnText}>Create User</Text>
      </TouchableOpacity>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Users</Text>
        {loading ? <ActivityIndicator color="#2d6a4f" /> : users.map((u: any) => (
          <View key={u.id} style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.listPrimary}>{u.name}</Text>
              <Text style={s.listSub}>{u.email}</Text>
            </View>
            <View style={[s.roleChip, { backgroundColor: (roleColor[u.role] ?? '#6b7280') + '20' }]}>
              <Text style={[s.roleChipText, { color: roleColor[u.role] ?? '#6b7280' }]}>
                {ROLE_LABELS[u.role] ?? u.role}
              </Text>
            </View>
            <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => toggleActive(u)}>
              <Feather name={u.active ? 'toggle-right' : 'toggle-left'} size={22} color={u.active ? '#16a34a' : '#d1d5db'} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModal(false)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Create User</Text>
            <TouchableOpacity onPress={createUser} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#2d6a4f" /> : <Text style={s.saveBtn}>Create</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }}>
            <Text style={s.fieldLabel}>Full Name *</Text>
            <TextInput style={s.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Full name" autoFocus />

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Email *</Text>
            <TextInput style={s.input} value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="email@example.com" autoCapitalize="none" keyboardType="email-address" />

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Password *</Text>
            <View style={s.pwRow}>
              <TextInput style={s.pwInput} value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} placeholder="Min. 6 characters" secureTextEntry={!showPw} />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Feather name={showPw ? 'eye-off' : 'eye'} size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Role</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {USER_ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.rolePillOpt, form.role === r && { backgroundColor: '#2d6a4f' }]}
                  onPress={() => setForm(f => ({ ...f, role: r }))}
                >
                  <Text style={[s.roleOptText, form.role === r && { color: '#fff' }]}>{ROLE_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.roleHintBox}>
              <Text style={s.roleHintTitle}>{ROLE_LABELS[form.role] ?? form.role}</Text>
              <Text style={s.roleHintDesc}>{ROLE_DESCS[form.role] ?? ''}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const ROLE_DESCS: Record<string, string> = {
  ADMIN: 'Full access: manage users, categories, workers, attendance, stock, expenses and reports.',
  FARM_MANAGER: 'Manage workers, attendance, stock records and expenses. Submit monthly reports.',
  OPS: 'View all data. Can only add new expenses.',
  VIEWER: 'Read-only access to all data. Cannot make any changes.',
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  tabBar: { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tabPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  tabPillActive: { backgroundColor: '#2d6a4f' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  tabBody: { flex: 1 },
  tabBodyContent: { padding: 14, gap: 12 },

  // Profile card
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  rolePillSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  rolePillSmallText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Section
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, backgroundColor: '#fafafa' },

  // Password row (with eye icon)
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fafafa', marginBottom: 4 },
  pwInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 11 },

  // Buttons
  btn: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },

  // List rows
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb', gap: 8 },
  listPrimary: { fontSize: 14, color: '#111827' },
  listSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },

  // Category header
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

  // Modal
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cancel: { fontSize: 15, color: '#6b7280' },
  saveBtn: { fontSize: 15, color: '#2d6a4f', fontWeight: '700' },

  // Role chips (user list)
  roleChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  roleChipText: { fontSize: 11, fontWeight: '700' },

  // Role option pills (create user)
  rolePillOpt: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  roleOptText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Role hint box
  roleHintBox: { marginTop: 16, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  roleHintTitle: { fontSize: 13, fontWeight: '700', color: '#2d6a4f', marginBottom: 4 },
  roleHintDesc: { fontSize: 12, color: '#374151', lineHeight: 18 },
});
