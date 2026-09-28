import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, Typography, getShadow } from '../../utils/theme';
import {
  HOTEL_ADDRESS,
  HOTEL_NAME,
  abrirMapaHotel,
  abrirSitioHotel,
} from '../../utils/hotelLinks';

interface Props {
  visible: boolean;
  sitioWeb?: string | null;
  onCerrar: () => void;
}

export default function HotelInfoModal({ visible, sitioWeb, onCerrar }: Props) {
  const { colors, mode } = useTheme();

  const ejecutar = async (accion: () => Promise<void>) => {
    onCerrar();
    await accion();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} />
        <View style={[
          styles.card,
          getShadow(mode).card,
          { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold },
        ]}>
          <View style={[styles.accent, { backgroundColor: colors.gold.primary }]} />
          <TouchableOpacity
            onPress={onCerrar}
            style={[styles.close, { backgroundColor: colors.bg.tertiary }]}
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={[styles.icon, { backgroundColor: `${colors.gold.primary}18`, borderColor: colors.border.gold }]}>
            <Ionicons name="business" size={34} color={colors.gold.primary} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>BIENVENIDO A</Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>{HOTEL_NAME}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={colors.gold.primary} />
            <Text style={[styles.address, { color: colors.text.secondary }]}>{HOTEL_ADDRESS}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.gold.primary }]}
            onPress={() => void ejecutar(abrirMapaHotel)}
            activeOpacity={0.82}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="navigate" size={19} color={colors.text.inverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryTitle, { color: colors.text.inverse }]}>Cómo llegar</Text>
              <Text style={[styles.primarySub, { color: colors.text.inverse }]}>Abrir ruta en Google Maps</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.primary }]}
            onPress={() => void ejecutar(() => abrirSitioHotel(sitioWeb))}
            activeOpacity={0.82}
          >
            <View style={[styles.webIcon, { backgroundColor: `${colors.gold.primary}18` }]}>
              <Ionicons name="globe-outline" size={19} color={colors.gold.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.secondaryTitle, { color: colors.text.primary }]}>Visitar sitio web</Text>
              <Text style={[styles.secondarySub, { color: colors.text.muted }]}>Conoce habitaciones y servicios</Text>
            </View>
            <Ionicons name="open-outline" size={17} color={colors.gold.primary} />
          </TouchableOpacity>

          <Text style={[styles.hint, { color: colors.text.muted }]}>Recepción disponible las 24 horas</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: Spacing.lg },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.lg, overflow: 'hidden', alignItems: 'center' },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  close: { position: 'absolute', right: 14, top: 14, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 2.2, marginBottom: 5 },
  title: { fontSize: Typography.xxl, fontWeight: '800', letterSpacing: -0.5 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm },
  address: { fontSize: Typography.sm, textAlign: 'center' },
  divider: { height: 1, alignSelf: 'stretch', marginVertical: Spacing.lg },
  primaryButton: { alignSelf: 'stretch', minHeight: 64, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  buttonIcon: { width: 34, alignItems: 'center' },
  primaryTitle: { fontSize: Typography.md, fontWeight: '800' },
  primarySub: { fontSize: Typography.xs, opacity: 0.72, marginTop: 2 },
  secondaryButton: { alignSelf: 'stretch', minHeight: 64, borderRadius: BorderRadius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  webIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  secondaryTitle: { fontSize: Typography.md, fontWeight: '700' },
  secondarySub: { fontSize: Typography.xs, marginTop: 2 },
  hint: { fontSize: 10, marginTop: Spacing.md },
});
