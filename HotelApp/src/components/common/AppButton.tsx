// ============================================================
// PRINCIPIO SRP: gestiona SOLO la presentación de un botón.
// PRINCIPIO OCP: la variante (primary/secondary/ghost/danger)
// es una prop — agregar nuevas variantes no modifica el componente.
// PRINCIPIO DRY: un único componente para todos los botones
// de la app en lugar de estilos repetidos en cada pantalla.
// ============================================================
import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function AppButton({
  label, onPress, variant = 'primary',
  loading, disabled, fullWidth, style,
}: Props) {
  const { colors } = useTheme();

  // OCP: cada variante mapea a colores del tema, no hardcodeados
  const variants: Record<Variant, { bg: string; text: string; border?: string }> = {
    primary:   { bg: colors.gold.primary,    text: colors.text.inverse },
    secondary: { bg: colors.bg.secondary,    text: colors.text.primary,   border: colors.border.light },
    ghost:     { bg: 'transparent',          text: colors.gold.primary,   border: colors.gold.primary },
    danger:    { bg: 'transparent',          text: colors.status.error,   border: colors.status.error },
  };

  const v = variants[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderWidth: v.border ? 1 : 0 },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={v.text} />
        : <Text style={[styles.label, { color: v.text } as TextStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  label: { fontSize: Typography.md, fontWeight: '700', letterSpacing: 0.3 },
});
