import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppCard from '../../components/common/AppCard';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

export default function AdminProfileScreen() {
  const { perfil, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const salir = async () => {
    setConfirmarSalida(false);
    await signOut();
  };
  const iniciales = perfil?.nombre_completo?.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase() ?? 'AD';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg.primary }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>CUENTA</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Perfil administrador</Text>
      </View>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: `${colors.gold.primary}18`, borderColor: colors.gold.primary }]}>
          <Text style={[styles.initials, { color: colors.gold.primary }]}>{iniciales}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text.primary }]}>{perfil?.nombre_completo}</Text>
        <View style={[styles.role, { backgroundColor: `${colors.gold.primary}18` }]}><Ionicons name="shield-checkmark" size={14} color={colors.gold.primary} /><Text style={{ color: colors.gold.primary, fontSize: 11, fontWeight: '800' }}>Administrador</Text></View>
      </View>
      <AppCard style={styles.card}>
        {[
          ['mail-outline', 'Correo', perfil?.correo ?? '—'], ['call-outline', 'Teléfono', perfil?.telefono ?? '—'],
          ['checkmark-circle-outline', 'Estado', perfil?.estado ?? 'activo'],
        ].map(([icon, label, value], index) => (
          <View key={label} style={[styles.row, index > 0 && { borderTopColor: colors.border.primary, borderTopWidth: 1 }]}>
            <Ionicons name={icon as any} size={19} color={colors.gold.primary} />
            <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.text.muted }]}>{label}</Text><Text style={[styles.value, { color: colors.text.primary }]}>{value}</Text></View>
          </View>
        ))}
      </AppCard>
      <AppCard style={styles.card}>
        <TouchableOpacity style={styles.option} onPress={toggleTheme}>
          <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={21} color={colors.gold.primary} />
          <View style={{ flex: 1 }}><Text style={[styles.optionTitle, { color: colors.text.primary }]}>Apariencia</Text><Text style={[styles.label, { color: colors.text.muted }]}>Tema {isDark ? 'oscuro' : 'claro'}</Text></View>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </AppCard>
      <View style={[styles.security, { backgroundColor: colors.status.infoBg, borderColor: colors.status.info }]}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.status.info} />
        <Text style={{ color: colors.status.info, flex: 1, fontSize: Typography.xs, lineHeight: 17 }}>Las acciones administrativas quedan registradas en auditoría y están protegidas por tu rol.</Text>
      </View>
      <TouchableOpacity style={[styles.logout, { borderColor: colors.status.error }]} onPress={() => setConfirmarSalida(true)}>
        <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
        <Text style={{ color: colors.status.error, fontWeight: '800' }}>Cerrar sesión</Text>
      </TouchableOpacity>
      <Text style={[styles.version, { color: colors.text.muted }]}>HotelApp · Módulo administrativo 1.0</Text>
      <Modal visible={confirmarSalida} transparent animationType="fade" onRequestClose={() => setConfirmarSalida(false)}>
        <View style={styles.overlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.bg.secondary, borderColor: colors.status.error }]}>
            <View style={[styles.confirmIcon, { backgroundColor: `${colors.status.error}18` }]}>
              <Ionicons name="log-out-outline" size={30} color={colors.status.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text.primary }]}>Cerrar sesión</Text>
            <Text style={[styles.confirmText, { color: colors.text.secondary }]}>
              Vas a salir de tu cuenta administrativa. Las acciones pendientes no guardadas podrían perderse.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.border.primary }]} onPress={() => setConfirmarSalida(false)}>
                <Text style={{ color: colors.text.secondary, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.status.error, borderColor: colors.status.error }]} onPress={() => void salir()}>
                <Text style={{ color: colors.text.inverse, fontWeight: '800' }}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingTop: 54, paddingBottom: 36 }, header: { marginBottom: 24 },
  eyebrow: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.5 }, title: { fontSize: Typography.xxl, fontWeight: '700', marginTop: 4 },
  identity: { alignItems: 'center', marginBottom: 24 }, avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 28, fontWeight: '800' }, name: { fontSize: Typography.xl, fontWeight: '700', marginTop: 12 },
  role: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: BorderRadius.full, paddingHorizontal: 11, paddingVertical: 5, marginTop: 7 },
  card: { marginBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  label: { fontSize: Typography.xs }, value: { fontSize: Typography.sm, fontWeight: '600', marginTop: 2 }, option: { flexDirection: 'row', alignItems: 'center', gap: 12 }, optionTitle: { fontSize: Typography.sm, fontWeight: '700' },
  security: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: BorderRadius.md, padding: 13, marginBottom: 15 },
  logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: BorderRadius.md, padding: 13 },
  version: { fontSize: 10, textAlign: 'center', marginTop: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  confirmCard: { width: '100%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center' },
  confirmIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center' },
  confirmText: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  confirmActions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10 },
  confirmBtn: { flex: 1, minHeight: 45, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
