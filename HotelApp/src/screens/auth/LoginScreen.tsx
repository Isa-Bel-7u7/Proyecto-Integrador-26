// SRP: pantalla de login — autenticación del usuario.
// DIP: delega signIn() al AuthContext, no llama a Supabase directamente.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import HotelInfoModal from '../../components/common/HotelInfoModal';
import { obtenerConfiguracionHotel } from '../../services/clienteService';
import { AuthStackParamList } from '../../types';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import { HOTEL_NAME } from '../../utils/hotelLinks';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const ERRORES: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo electrónico antes de continuar.',
  'Too many requests': 'Demasiados intentos. Espera un momento.',
};

function traducirError(msg: string): string {
  for (const [clave, texto] of Object.entries(ERRORES)) {
    if (msg.includes(clave)) return texto;
  }
  return msg;
}

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn } = useAuth();
  const { colors } = useTheme();

  const [correo, setCorreo]             = useState('');
  const [password, setPassword]         = useState('');
  const [verPassword, setVerPassword]   = useState(false);
  const [cargando, setCargando]         = useState(false);
  const [errCorreo, setErrCorreo]       = useState('');
  const [errPassword, setErrPassword]   = useState('');
  const [hotelModal, setHotelModal]     = useState(false);
  const [sitioWeb, setSitioWeb]         = useState<string | null>(null);

  const validar = (): boolean => {
    let ok = true;
    if (!correo.trim()) { setErrCorreo('Requerido'); ok = false; } else setErrCorreo('');
    if (!password.trim()) { setErrPassword('Requerido'); ok = false; } else setErrPassword('');
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrCorreo('Correo inválido'); ok = false;
    }
    return ok;
  };

  const handleLogin = async () => {
    if (!validar()) return;
    setCargando(true);
    const { error } = await signIn(correo.trim().toLowerCase(), password);
    setCargando(false);
    if (error) setErrCorreo(traducirError(error));
  };

  const abrirInformacionHotel = async () => {
    const config = await obtenerConfiguracionHotel().catch(() => null);
    setSitioWeb(config?.sitio_web ?? null);
    setHotelModal(true);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Marca ──────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.marca}
          onPress={() => void abrirInformacionHotel()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Ver ubicación e información de Grand Hotel"
        >
          <View style={[styles.logoBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
            <Ionicons name="business" size={44} color={colors.gold.primary} />
          </View>
          <Text style={[styles.nombreHotel, { color: colors.text.primary }]}>{HOTEL_NAME}</Text>
          <Text style={[styles.tagline, { color: colors.text.secondary }]}>
            Bienvenido de vuelta
          </Text>
          <View style={[styles.separador, { backgroundColor: colors.gold.primary }]} />
          <View style={styles.ubicacionHint}>
            <Ionicons name="location-outline" size={13} color={colors.gold.primary} />
            <Text style={[styles.ubicacionHintText, { color: colors.gold.primary }]}>Ubicación y sitio web</Text>
          </View>
        </TouchableOpacity>

        {/* ── Formulario ─────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
          <Text style={[styles.cardTitulo, { color: colors.text.primary }]}>Iniciar sesión</Text>

          <AppInput
            label="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errCorreo}
          />

          {/* Campo contraseña con ojo (Ionicons, sin emoji) */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Contraseña</Text>
            <View style={[
              styles.passwordRow,
              {
                backgroundColor: colors.input.bg,
                borderColor: errPassword ? colors.status.error : colors.input.border,
              },
            ]}>
              <AppInput
                label=""
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!verPassword}
                autoCapitalize="none"
                error={undefined}
                style={{ flex: 1, marginBottom: 0 }}
              />
              <TouchableOpacity
                onPress={() => setVerPassword((v) => !v)}
                style={styles.ojoBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={verPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            </View>
            {errPassword ? (
              <Text style={[styles.errorText, { color: colors.status.error }]}>{errPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.olvidoBtn}
          >
            <Text style={[styles.olvidoText, { color: colors.gold.primary }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          <AppButton
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={cargando}
            fullWidth
          />

          <View style={styles.registroRow}>
            <Text style={[styles.registroTexto, { color: colors.text.secondary }]}>
              ¿No tienes cuenta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registroLink, { color: colors.gold.primary }]}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Pie ─────────────────────────────────────────── */}
        <Text style={[styles.pie, { color: colors.text.muted }]}>
          Acceso seguro — datos protegidos
        </Text>
      </ScrollView>
      <HotelInfoModal visible={hotelModal} sitioWeb={sitioWeb} onCerrar={() => setHotelModal(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.lg },
  marca: { alignItems: 'center', gap: Spacing.sm },
  logoBox: { width: 88, height: 88, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginBottom: Spacing.sm },
  nombreHotel: { fontSize: Typography.hero, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: Typography.md },
  separador: { width: 40, height: 2, borderRadius: 1, marginTop: Spacing.sm },
  ubicacionHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ubicacionHintText: { fontSize: Typography.xs, fontWeight: '700' },
  card: { borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, gap: 0 },
  cardTitulo: { fontSize: Typography.xl, fontWeight: '700', marginBottom: Spacing.lg },
  label: { fontSize: Typography.sm, fontWeight: '500', marginBottom: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  ojoBtn: { paddingHorizontal: 14 },
  errorText: { fontSize: Typography.xs, marginTop: 4, fontWeight: '500' },
  olvidoBtn: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  olvidoText: { fontSize: Typography.sm, fontWeight: '600' },
  registroRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  registroTexto: { fontSize: Typography.sm },
  registroLink: { fontSize: Typography.sm, fontWeight: '700' },
  pie: { textAlign: 'center', fontSize: Typography.xs },
});
