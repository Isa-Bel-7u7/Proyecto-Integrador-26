import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { signUp } = useAuth();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es requerido.';
    if (nombre.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    if (!correo.trim()) return 'El correo es requerido.';
    if (!correo.includes('@')) return 'Ingresa un correo válido.';
    if (!password) return 'La contraseña es requerida.';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (password !== confirmar) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleRegister = async () => {
    const error = validar();
    if (error) {
      Alert.alert('Datos inválidos', error);
      return;
    }

    setCargando(true);
    const { error: errReg } = await signUp(correo, password, nombre, telefono);
    setCargando(false);

    if (errReg) {
      Alert.alert('Error al registrarse', traducirError(errReg));
      return;
    }

    Alert.alert(
      '¡Registro exitoso!',
      'Tu cuenta fue creada. Revisa tu correo para confirmar tu cuenta.',
      [{ text: 'Ir al login', onPress: () => navigation.navigate('Login') }]
    );
  };

  const traducirError = (error: string): string => {
    if (error.includes('already registered')) return 'Este correo ya está registrado.';
    if (error.includes('invalid email')) return 'El correo no es válido.';
    if (error.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    return error;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Crear cuenta</Text>
          <Text style={styles.subtitulo}>Regístrate para hacer reservas</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>

          <Text style={styles.label}>Nombre completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan Pérez"
            placeholderTextColor="#475569"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Correo electrónico *</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            placeholderTextColor="#475569"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Teléfono (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="+591 70000000"
            placeholderTextColor="#475569"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Contraseña *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!verPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setVerPassword(!verPassword)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeIcon}>{verPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar contraseña *</Text>
          <TextInput
            style={styles.input}
            placeholder="Repite tu contraseña"
            placeholderTextColor="#475569"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry={!verPassword}
            autoCapitalize="none"
          />

          {/* Botón registro */}
          <TouchableOpacity
            style={[styles.btnRegister, cargando && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.btnRegisterText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          {/* Login */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    color: '#f59e0b',
    fontSize: 16,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: '#94a3b8',
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 16,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  inputPassword: {
    flex: 1,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 16,
  },
  eyeBtn: {
    padding: 14,
  },
  eyeIcon: {
    fontSize: 18,
  },
  btnRegister: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRegisterText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  loginLink: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
  },
});