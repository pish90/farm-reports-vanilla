import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../store/AuthContext';

export default function ChangePasswordScreen() {
  const { user, changePassword, logout } = useAuth();

  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,     setSaving]     = useState(false);

  async function handleSave() {
    if (!currentPw) {
      Alert.alert('Validation', 'Enter your current password.'); return;
    }
    if (newPw.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters.'); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Validation', 'Passwords do not match.'); return;
    }
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      // AuthContext clears mustChangePassword → RootNavigator redirects to Main automatically
    } catch {
      Alert.alert('Error', 'Incorrect current password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <View style={s.iconWrap}>
            <Feather name="lock" size={32} color="#2d6a4f" />
          </View>
          <Text style={s.title}>Set Your Password</Text>
          <Text style={s.subtitle}>
            Welcome{user?.name ? `, ${user.name}` : ''}! Your account requires a new password before you can continue.
          </Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>Current Password</Text>
          <View style={s.pwRow}>
            <TextInput
              style={s.pwInput}
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry={!showCurrent}
              placeholder="Your current password"
              placeholderTextColor="#bbb"
              autoFocus
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
              <Feather name={showCurrent ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>New Password</Text>
          <View style={s.pwRow}>
            <TextInput
              style={s.pwInput}
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry={!showNew}
              placeholder="Min. 6 characters"
              placeholderTextColor="#bbb"
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNew(v => !v)}>
              <Feather name={showNew ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Confirm New Password</Text>
          <View style={s.pwRow}>
            <TextInput
              style={s.pwInput}
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry={!showConfirm}
              placeholder="Repeat new password"
              placeholderTextColor="#bbb"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Set Password & Continue</Text>}
          </TouchableOpacity>
        </View>

        {/* Sign out link */}
        <TouchableOpacity style={s.signOutBtn} onPress={logout}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 32 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#e8f5ef', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title:    { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  form: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  label:  { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fafafa',
  },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eyeBtn:  { paddingHorizontal: 12, paddingVertical: 12 },

  saveBtn: {
    marginTop: 24, backgroundColor: '#2d6a4f', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  signOutBtn: { marginTop: 24, alignItems: 'center' },
  signOutText: { fontSize: 14, color: '#9ca3af' },
});
