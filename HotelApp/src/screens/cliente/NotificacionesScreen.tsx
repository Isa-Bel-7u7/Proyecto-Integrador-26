// SRP: pantalla de notificaciones del cliente.
// DIP: usa clienteService para datos, no supabase directamente.
// DRY: StatusBadge + AppCard reutilizados de components/common.
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import type { Notificacion } from '../../types';

const TIPO_ICONO: Record<string, string> = {
  sistema:     'information-circle-outline',
  reserva:     'calendar-outline',
  pago:        'card-outline',
  checkin:     'log-in-outline',
  checkout:    'log-out-outline',
  housekeeping:'bed-outline',
  incidencia:  'alert-circle-outline',
};

function tiempoRelativo(fechaStr: string): string {
  const diff = Date.now() - new Date(fechaStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} día${d > 1 ? 's' : ''}`;
}

export default function NotificacionesScreen() {
  const { colors } = useTheme();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando]             = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const cargar = async () => {
    try {
      const data = await obtenerNotificaciones();
      setNotificaciones(data);
    } catch (e) {
      console.error('Notificaciones:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { void cargar(); }, []));

  const onRefresh = () => { setRefreshing(true); void cargar(); };

  const handleMarcarLeida = async (n: Notificacion) => {
    if (n.leida) return;
    try {
      await marcarNotificacionLeida(n.id);
      setNotificaciones((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x))
      );
    } catch { /* silencioso */ }
  };

  const handleMarcarTodas = async () => {
    try {
      await marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader
        titulo="Notificaciones"
        subtitulo={sinLeer > 0 ? `${sinLeer} sin leer` : undefined}
        accionDerecha={sinLeer > 0 ? { icono: 'checkmark-done-outline', onPress: handleMarcarTodas } : undefined}
      />

      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} />
        }
        contentContainerStyle={[
          styles.lista,
          notificaciones.length === 0 && styles.listaVacia,
        ]}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <View style={[styles.vacioIconBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.text.muted} />
            </View>
            <Text style={[styles.vacioTitulo, { color: colors.text.primary }]}>Sin notificaciones</Text>
            <Text style={[styles.vacioSub, { color: colors.text.secondary }]}>
              Aquí aparecerán los avisos sobre tu reserva, pagos y más.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => void handleMarcarLeida(item)}
            activeOpacity={0.8}
            style={[
              styles.itemCard,
              {
                backgroundColor: item.leida ? colors.bg.secondary : colors.bg.tertiary,
                borderColor: item.leida ? colors.border.primary : colors.border.gold,
              },
            ]}
          >
            {/* Indicador no leído */}
            {!item.leida && (
              <View style={[styles.dotNoLeido, { backgroundColor: colors.gold.primary }]} />
            )}

            <View style={[styles.iconBox, { backgroundColor: item.leida ? colors.bg.tertiary : `${colors.gold.primary}18` }]}>
              <Ionicons
                name={(TIPO_ICONO[item.tipo] ?? 'notifications-outline') as any}
                size={20}
                color={item.leida ? colors.text.muted : colors.gold.primary}
              />
            </View>

            <View style={styles.itemCuerpo}>
              <Text style={[styles.itemTitulo, { color: colors.text.primary }]} numberOfLines={1}>
                {item.titulo}
              </Text>
              <Text style={[styles.itemMensaje, { color: colors.text.secondary }]} numberOfLines={2}>
                {item.mensaje}
              </Text>
              <Text style={[styles.itemFecha, { color: colors.text.muted }]}>
                {tiempoRelativo(item.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 32 },
  listaVacia: { flex: 1, justifyContent: 'center' },
  vacio: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  vacioIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  vacioTitulo: { fontSize: Typography.xl, fontWeight: '700' },
  vacioSub: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  itemCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.sm, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    position: 'relative',
  },
  dotNoLeido: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  iconBox: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemCuerpo: { flex: 1, gap: 3 },
  itemTitulo: { fontSize: Typography.md, fontWeight: '700' },
  itemMensaje: { fontSize: Typography.sm, lineHeight: 19 },
  itemFecha: { fontSize: Typography.xs },
});
