// SRP: contenedor de tarjeta con sombra y borde opcionales.
// DRY: elimina la repetición de fondos, radios y sombras en pantallas.
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, getShadow } from '../../utils/theme';

interface Props {
  children: React.ReactNode;
  goldBorder?: boolean;      // borde dorado sutil para cards destacadas
  noPadding?: boolean;
  style?: ViewStyle;
}

export default function AppCard({ children, goldBorder, noPadding, style }: Props) {
  const { colors, mode } = useTheme();
  const shadow = getShadow(mode);
  return (
    <View style={[
      styles.card,
      shadow.card,
      {
        backgroundColor: colors.bg.secondary,
        borderColor: goldBorder ? colors.border.gold : colors.border.primary,
        borderWidth: 1,
        padding: noPadding ? 0 : Spacing.md,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
});
