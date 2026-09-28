// SRP: único propósito — mostrar estado de carga centrado
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  mensaje?: string;
}

export default function LoadingScreen({ mensaje }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator size="large" color={colors.gold.primary} />
      {mensaje && (
        <Text style={[styles.texto, { color: colors.text.secondary }]}>{mensaje}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  texto: { fontSize: 14, marginTop: 8 },
});
