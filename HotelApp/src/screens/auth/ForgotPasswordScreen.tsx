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
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    if (!correo.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa tu correo.');
      return;
    }
    if (!correo.includes('@')) {
      Alert.alert('Correo inválido', 'Ingresa un correo válido.');
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase());
    setCargando(false);

    if (error) {
      Alert.alert('Error', 'No se pudo enviar el correo. Intenta de nuevo.');
      return;
    }

    setEnviado(true);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.titulo}>Recuperar contraseña</Text>
          <Text style={styles.subtitulo}>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </Text>

          {!enviado ? (
            <View style={styles.form}>
              <Text style={styles.label}>Correo electrónico</Text>
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

              <TouchableOpacity
                style={[styles.btnEnviar, cargando && styles.btnDisabled]}
                onPress={handleEnviar}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.btnText}>Enviar enlace</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successCard}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>¡Correo enviado!</Text>
              <Text style={styles.successText}>
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </Text>
              <TouchableOpacity
                style={styles.btnVolver}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.btnVolverText}>Volver al login</Text>
              </TouchableOpacity>
            </View>
          )}
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
  backBtn: {
    marginBottom: 32,
  },
  backText: {
    color: '#f59e0b',
    fontSize: 16,
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: '100%',
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
    marginBottom: 24,
  },
  btnEnviar: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btnVolver: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  btnVolverText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 'bold',
  },
});