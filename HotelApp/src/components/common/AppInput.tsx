// SRP: componente dedicado a campos de texto con label y error.
// DRY: elimina la duplicación de estilos de TextInput en cada pantalla.
import React from 'react';
import {
  View, Text, TextInput,
  StyleSheet, KeyboardTypeOptions, ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

export default function AppInput({
  label, value, onChangeText, placeholder, error,
  secureTextEntry, keyboardType, autoCapitalize = 'sentences',
  editable = true, multiline, numberOfLines, style,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.input.placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          {
            backgroundColor: colors.input.bg,
            borderColor: error ? colors.status.error : colors.input.border,
            color: editable ? colors.text.primary : colors.text.muted,
          },
          multiline && styles.multiline,
          !editable && { opacity: 0.7 },
        ]}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.status.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: { fontSize: Typography.sm, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.md,
  },
  multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  error: { fontSize: Typography.xs, marginTop: 4, fontWeight: '500' },
});
