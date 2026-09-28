// SRP: cabecera de pantalla con título, subtítulo y acción opcional.
// DRY: reemplaza los View de header ad-hoc de cada pantalla.
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Spacing, Typography } from '../../utils/theme';

interface Props {
  titulo: string;
  subtitulo?: string;
  mostrarBack?: boolean;
  accionDerecha?: { icono: string; onPress: () => void };
  style?: ViewStyle;
}

export default function ScreenHeader({
  titulo, subtitulo, mostrarBack, accionDerecha, style,
}: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border.primary }, style]}>
      {mostrarBack ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.gold.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.centro}>
        <Text style={[styles.titulo, { color: colors.text.primary }]} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[styles.subtitulo, { color: colors.text.secondary }]} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      {accionDerecha ? (
        <TouchableOpacity onPress={accionDerecha.onPress} style={styles.accionBtn}>
          <Ionicons name={accionDerecha.icono as any} size={22} color={colors.gold.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  accionBtn: { width: 36, alignItems: 'flex-end' },
  spacer: { width: 36 },
  centro: { flex: 1, alignItems: 'center' },
  titulo: { fontSize: Typography.md, fontWeight: '700' },
  subtitulo: { fontSize: Typography.xs, marginTop: 2 },
});
