// SRP: pantalla exclusiva para listar y filtrar reservas del cliente.
// DIP: usa obtenerTodasMisReservas() de clienteService.
// DRY: colores desde useTheme(), makeStyles evita duplicación.
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { obtenerTodasMisReservas } from '../../services/clienteService';
import LoadingScreen from '../../components/common/LoadingScreen';
import AppCard from '../../components/common/AppCard';
import StatusBadge from '../../components/common/StatusBadge';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import type { Reserva, ClienteStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<ClienteStackParamList>;

const FILTROS = ['todas', 'pendiente', 'confirmada', 'en_estadia', 'finalizada', 'cancelada'] as const;
type Filtro = typeof FILTROS[number];

// OCP: agregar filtros no requiere modificar el renderizado
const FILTRO_LABEL: Record<Filtro, string> = {
  todas:      'Todas',
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  en_estadia: 'En estadía',
  finalizada: 'Finalizada',
  cancelada:  'Cancelada',
};

const fmt = (fecha: string) => {
  try {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return fecha; }
};

export default function MisReservasScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors }  = useTheme();
  const s = makeStyles(colors);

  const [reservas, setReservas]     = useState<Reserva[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro]         = useState<Filtro>('todas');

  const cargar = async () => {
    try {
      const data = await obtenerTodasMisReservas();
      setReservas(data);
    } catch (e) {
      console.error('MisReservas:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { void cargar(); }, []));

  const onRefresh = () => { setRefreshing(true); void cargar(); };

  const filtradas = filtro === 'todas'
    ? reservas
    : reservas.filter((r) => r.estado === filtro);

  const renderReserva = ({ item: r }: { item: Reserva }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('DetalleReserva', { reservaId: r.id })}
      activeOpacity={0.85}
    >
      <AppCard style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.iconBox, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.gold.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.codigo, { color: colors.text.primary }]}>{r.codigo_reserva}</Text>
            <Text style={[s.origen, { color: colors.text.muted }]}>{r.origen ?? 'app'}</Text>
          </View>
          <StatusBadge estado={r.estado} small />
        </View>

        <View style={[s.divider, { backgroundColor: colors.border.primary }]} />

        <View style={s.infoGrid}>
          <View style={s.infoItem}>
            <Ionicons name="log-in-outline" size={13} color={colors.gold.primary} />
            <Text style={[s.infoLabel, { color: colors.text.muted }]}>Entrada</Text>
            <Text style={[s.infoValor, { color: colors.text.primary }]}>{fmt(r.fecha_entrada)}</Text>
          </View>
          <View style={[s.infoDivider, { backgroundColor: colors.border.primary }]} />
          <View style={s.infoItem}>
            <Ionicons name="log-out-outline" size={13} color={colors.gold.primary} />
            <Text style={[s.infoLabel, { color: colors.text.muted }]}>Salida</Text>
            <Text style={[s.infoValor, { color: colors.text.primary }]}>{fmt(r.fecha_salida)}</Text>
          </View>
          <View style={[s.infoDivider, { backgroundColor: colors.border.primary }]} />
          <View style={s.infoItem}>
            <Ionicons name="wallet-outline" size={13} color={colors.gold.primary} />
            <Text style={[s.infoLabel, { color: colors.text.muted }]}>Total</Text>
            <Text style={[s.precioValor, { color: colors.gold.primary }]}>
              Bs.{Number(r.total_estimado ?? 0).toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <Text style={[s.verDetalle, { color: colors.gold.primary }]}>Ver detalle</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.gold.primary} />
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  if (cargando) return <LoadingScreen />;

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <View style={s.header}>
        <Text style={[s.titulo, { color: colors.text.primary }]}>Mis Reservas</Text>
        <Text style={[s.subtitulo, { color: colors.text.secondary }]}>
          {reservas.length} reserva{reservas.length !== 1 ? 's' : ''} en total
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtros}
        style={s.filtrosScroll}
      >
        {(FILTROS as readonly Filtro[]).map((f) => {
          const activo = filtro === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFiltro(f)}
              style={[
                s.filtroBadge,
                {
                  backgroundColor: activo ? colors.gold.primary : colors.bg.secondary,
                  borderColor:     activo ? colors.gold.primary : colors.border.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[s.filtroText, { color: activo ? colors.bg.primary : colors.text.secondary }]}>
                {FILTRO_LABEL[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtradas}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderReserva}
        contentContainerStyle={s.lista}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.vacio}>
            <Ionicons name="calendar-outline" size={56} color={colors.text.muted} />
            <Text style={[s.vacioTitulo, { color: colors.text.primary }]}>Sin reservas</Text>
            <Text style={[s.vacioTexto, { color: colors.text.secondary }]}>
              {filtro === 'todas'
                ? 'No tienes reservas aún. Busca una habitación para empezar.'
                : `No hay reservas con estado "${FILTRO_LABEL[filtro]}".`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
  },
  titulo:   { fontSize: Typography.xl, fontWeight: '700' },
  subtitulo: { fontSize: Typography.sm, marginTop: 2 },
  filtrosScroll: { flexGrow: 0, flexShrink: 0 },
  filtros: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 4,
    gap: 8,
    alignItems: 'center',
  },
  filtroBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  filtroText: { fontSize: 13, fontWeight: '600' },
  lista: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 32,
    gap: Spacing.sm,
  },
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codigo: { fontSize: Typography.md, fontWeight: '700' },
  origen: { fontSize: Typography.xs, textTransform: 'capitalize', marginTop: 2 },
  divider: { height: 1 },
  infoGrid: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  infoDivider: { width: 1, height: 38 },
  infoLabel: { fontSize: 10, marginTop: 2 },
  infoValor: { fontSize: Typography.sm, fontWeight: '600', textAlign: 'center' },
  precioValor: { fontSize: Typography.sm, fontWeight: '700', textAlign: 'center' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  verDetalle: { fontSize: Typography.sm, fontWeight: '600' },
  vacio: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  vacioTitulo: { fontSize: Typography.lg, fontWeight: '700' },
  vacioTexto: { textAlign: 'center', fontSize: Typography.sm, lineHeight: 21 },
});
