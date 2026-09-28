import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

type AlertButton = { text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };
type AlertState = { title: string; message?: string; buttons: AlertButton[] } | null;

const StyledAlertContext = createContext<{ show: (title: string, message?: string, buttons?: AlertButton[]) => void } | null>(null);

export function useStyledAlert() {
  return useContext(StyledAlertContext);
}

export default function StyledAlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [alerta, setAlerta] = useState<AlertState>(null);

  const show = (title: string, message?: string, buttons?: AlertButton[]) => {
    setAlerta({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'Entendido', style: 'default' }],
    });
  };

  useEffect(() => {
    const original = Alert.alert;
    Alert.alert = ((title: string, message?: string, buttons?: AlertButton[]) => {
      show(String(title), message, buttons);
    }) as typeof Alert.alert;
    return () => { Alert.alert = original; };
  }, []);

  const danger = useMemo(() => alerta?.buttons?.some((b) => b.style === 'destructive') || /error|eliminar|cancelar|cerrar sesión/i.test(alerta?.title ?? ''), [alerta]);
  const accent = danger ? colors.status.error : colors.gold.primary;

  const cerrar = (button?: AlertButton) => {
    setAlerta(null);
    setTimeout(() => button?.onPress?.(), 80);
  };

  return (
    <StyledAlertContext.Provider value={{ show }}>
      {children}
      <Modal visible={Boolean(alerta)} transparent animationType="fade" onRequestClose={() => setAlerta(null)}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: accent }]}>
            <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={danger ? 'warning-outline' : 'information-circle-outline'} size={30} color={accent} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>{alerta?.title}</Text>
            {alerta?.message ? <Text style={[styles.message, { color: colors.text.secondary }]}>{alerta.message}</Text> : null}
            <View style={styles.actions}>
              {(alerta?.buttons ?? []).map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDanger = button.style === 'destructive';
                const bg = isCancel ? 'transparent' : isDanger ? colors.status.error : colors.gold.primary;
                const border = isCancel ? colors.border.primary : bg;
                const text = isCancel ? colors.text.secondary : colors.text.inverse;
                return (
                  <TouchableOpacity key={`${button.text ?? 'ok'}-${index}`} style={[styles.button, { backgroundColor: bg, borderColor: border }]} onPress={() => cerrar(button)}>
                    <Text style={[styles.buttonText, { color: text }]}>{button.text ?? 'Aceptar'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </StyledAlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  card: { width: '100%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center' },
  iconBox: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 8 },
  button: { flex: 1, minHeight: 45, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  buttonText: { fontSize: Typography.sm, fontWeight: '800', textAlign: 'center' },
});
