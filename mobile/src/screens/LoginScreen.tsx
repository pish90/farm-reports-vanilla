import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(status === 401 ? 'Invalid email or password.' : 'Could not connect. Check your network.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <Text style={s.title}>Farm Reports</Text>
        <Text style={s.subtitle}>Sign in to continue</Text>

        {!!error && <Text style={s.error}>{error}</Text>}

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="admin@farm.local"
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <Text style={s.label}>Password</Text>
        <View style={s.passwordRow}>
          <TextInput
            style={s.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#2d6a4f', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  error: { backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 16, backgroundColor: '#fafafa' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fafafa', marginBottom: 16 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 11 },
  button: { backgroundColor: '#2d6a4f', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
