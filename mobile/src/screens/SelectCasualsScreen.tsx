import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addCasualLabourer, getCasualLabourers } from '../services/casualLabourerService';
import { AttendanceStackParamList, CasualLabourerDto } from '../types';

type NavProp = NativeStackNavigationProp<AttendanceStackParamList, 'SelectCasuals'>;
type RoutePropType = RouteProp<AttendanceStackParamList, 'SelectCasuals'>;

export default function SelectCasualsScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropType>();

  const { currentSelection } = route.params;
  const [labourers, setLabourers] = useState<CasualLabourerDto[]>([]);
  const [checked, setChecked]     = useState<Set<number>>(new Set(currentSelection.map(c => c.id)));
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [addName, setAddName]     = useState('');
  const [addPhone, setAddPhone]   = useState('');
  const [adding, setAdding]       = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getCasualLabourers()
        .then(data => setLabourers(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  const filtered = labourers.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: number) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDone() {
    const selected = labourers.filter(l => checked.has(l.id)).map(l => ({ id: l.id, name: l.name }));
    navigation.navigate('CreateWorkSession', { selectedCasuals: selected });
  }

  async function handleAdd() {
    const name = addName.trim();
    if (!name) { Alert.alert('Name required', "Please enter the casual labourer's name."); return; }
    setAdding(true);
    try {
      const created = await addCasualLabourer({ name, phone: addPhone.trim() || null });
      setLabourers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setChecked(prev => new Set([...prev, created.id]));
      setShowAdd(false);
      setAddName(''); setAddPhone('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to add casual');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Feather name="search" size={15} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search casuals…" placeholderTextColor="#bbb" autoCorrect={false} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Feather name="x" size={15} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#7c3aed" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={l => String(l.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.addNewRow} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
              <View style={styles.addNewIcon}><Feather name="user-plus" size={16} color="#7c3aed" /></View>
              <Text style={styles.addNewText}>Add new casual…</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const isChecked = checked.has(item.id);
            return (
              <TouchableOpacity style={[styles.row, isChecked && styles.rowChecked]} onPress={() => toggle(item.id)} activeOpacity={0.75}>
                <View style={styles.rowLeft}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{item.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    {item.phone && <Text style={styles.rowPhone}>{item.phone}</Text>}
                  </View>
                </View>
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Feather name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerCount}>{checked.size} selected</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowAdd(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.addSheetWrap}>
            <ScrollView contentContainerStyle={styles.addSheet} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.handle} />
              <Text style={styles.addSheetTitle}>Add Casual Labourer</Text>

              <Text style={styles.addLabel}>Name *</Text>
              <TextInput style={styles.addInput} value={addName} onChangeText={setAddName}
                placeholder="Full name" placeholderTextColor="#bbb" autoCapitalize="words" maxLength={100} />

              <Text style={[styles.addLabel, { marginTop: 14 }]}>Phone (optional)</Text>
              <TextInput style={styles.addInput} value={addPhone} onChangeText={setAddPhone}
                placeholder="+254…" placeholderTextColor="#bbb" keyboardType="phone-pad" maxLength={20} />

              <TouchableOpacity style={[styles.addSaveBtn, adding && { opacity: 0.6 }]}
                onPress={handleAdd} disabled={adding} activeOpacity={0.85}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.addSaveBtnText}>Add Casual</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f5f7f9' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  searchInput:{ flex: 1, fontSize: 15, color: '#1a1a1a' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingBottom: 100 },
  addNewRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, marginHorizontal: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ede9fe', borderStyle: 'dashed' },
  addNewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' },
  addNewText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginBottom: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  rowChecked: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
  rowLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8f5ef', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#2d6a4f' },
  rowName:    { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  rowPhone:   { fontSize: 12, color: '#888', marginTop: 2 },
  checkbox:   { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee' },
  footerCount:{ fontSize: 14, fontWeight: '600', color: '#888' },
  doneBtn:    { paddingHorizontal: 28, paddingVertical: 12, backgroundColor: '#7c3aed', borderRadius: 22 },
  doneBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  addSheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  addSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
  addSheetTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 18 },
  addLabel:   { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  addInput:   { backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb' },
  addSaveBtn: { marginTop: 22, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addSaveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
