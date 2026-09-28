// SRP: renderiza SOLO el badge de estado de una reserva/notificación.
// DRY: centraliza la lógica de color por estado (getEstadoStyle) que
// antes estaba duplicada en HomeClienteScreen, MisReservasScreen, etc.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EstadoLabels, getEstadoStyle } from '../../utils/theme';

interface Props {
  estado: string;
  small?: boolean;
}

export default function StatusBadge({ estado, small }: Props) {
  const { colors } = useTheme();
  const ec = getEstadoStyle(estado, colors);
  const label = EstadoLabels[estado] ?? estado;

  return (
    <View style={[
      styles.badge,
      small && styles.badgeSmall,
      { backgroundColor: ec.bg, borderColor: ec.border },
    ]}>
      <Text style={[styles.text, small && styles.textSmall, { color: ec.text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: { paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '700' },
  textSmall: { fontSize: 10 },
});
