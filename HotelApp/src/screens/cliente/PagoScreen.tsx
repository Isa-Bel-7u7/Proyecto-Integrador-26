// SRP: pantalla exclusiva para registrar un pago de reserva.
// DIP: usa registrarPago() y obtenerReservaBasica() de clienteService.
// DRY: colores y estilos de botones desde useTheme().
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { registrarPago, obtenerReservaBasica, obtenerMetodosPago } from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import type { ClienteStackParamList, MetodoPago } from '../../types';

type RouteProps = RouteProp<ClienteStackParamList, 'Pago'>;
type NavProp   = NativeStackNavigationProp<ClienteStackParamList>;

// DRY: icono por método sin emoji
const METODO_ICONO: Record<string, string> = {
  'Efectivo':              'cash-outline',
  'QR':                    'qr-code-outline',
  'Tarjeta de crédito':    'card-outline',
  'Tarjeta de débito':     'card-outline',
  'Transferencia bancaria':'business-outline',
};

export default function PagoScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteProps>();
  const { reservaId } = route.params;
  const { colors }  = useTheme();

  const [metodos, setMetodos]         = useState<MetodoPago[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [tipo, setTipo]               = useState<'anticipo' | 'pago_total'>('pago_total');
  const [total, setTotal]             = useState(0);
  const [codigo, setCodigo]           = useState('');
  const [cargando, setCargando]       = useState(true);
  const [pagando, setPagando]         = useState(false);

  useEffect(() => { void cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [metodosData, reservaData] = await Promise.all([
        obtenerMetodosPago(),
        obtenerReservaBasica(reservaId),
      ]);
      setMetodos(metodosData);
      setTotal(Number(reservaData?.total_estimado ?? 0));
      setCodigo(reservaData?.codigo_reserva ?? '');
    } catch (e) {
      console.error('PagoScreen:', e);
    } finally {
      setCargando(false);
    }
  };

  const monto = tipo === 'anticipo' ? total * 0.3 : total;

  const handlePagar = () => {
    if (!seleccionado) {
      Alert.alert('Método requerido', 'Selecciona un método de pago.');
      return;
    }
    Alert.alert(
      'Confirmar pago',
      `¿Confirmas el pago de Bs. ${monto.toFixed(2)} para la reserva ${codigo}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            setPagando(true);
            try {
              // DIP: parámetros correctos del RPC
              await registrarPago({
                reservaId,
                metodoPagoId: seleccionado,
                monto,
                tipo,
                notas: 'Pago registrado desde app móvil',
              });
              Alert.alert(
                'Pago registrado',
                `Tu pago de Bs. ${monto.toFixed(2)} fue registrado exitosamente.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo registrar el pago.');
            } finally {
              setPagando(false);
            }
          },
        },
      ]
    );
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Registrar pago" mostrarBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Reserva info ──────────────────────────────── */}
        <View style={[styles.reservaInfo, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
          <Ionicons name="receipt-outline" size={20} color={colors.gold.primary} />
          <View>
            <Text style={[styles.reservaCodigo, { color: colors.text.primary }]}>{codigo}</Text>
            <Text style={[styles.reservaTotal, { color: colors.text.secondary }]}>
              Total reserva: Bs. {total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ── Tipo de pago ──────────────────────────────── */}
        <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>Tipo de pago</Text>
        <AppCard>
          {([
            { id: 'pago_total' as const, label: 'Pago total', desc: `Bs. ${total.toFixed(2)}`, icono: 'wallet-outline' },
            { id: 'anticipo'  as const, label: 'Anticipo (30%)', desc: `Bs. ${(total * 0.3).toFixed(2)}`, icono: 'cash-outline' },
          ] as const).map((t, i) => {
            const sel = tipo === t.id;
            return (
              <View key={t.id}>
                <TouchableOpacity
                  onPress={() => setTipo(t.id)}
                  style={[styles.tipoFila, sel && { backgroundColor: `${colors.gold.primary}10` }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tipoIconBox, { backgroundColor: sel ? `${colors.gold.primary}18` : colors.bg.tertiary }]}>
                    <Ionicons name={t.icono as any} size={20} color={sel ? colors.gold.primary : colors.text.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tipoLabel, { color: sel ? colors.gold.primary : colors.text.primary }]}>{t.label}</Text>
                    <Text style={[styles.tipoDesc, { color: colors.text.secondary }]}>{t.desc}</Text>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: sel ? colors.gold.primary : colors.border.light }]}>
                    {sel && <View style={[styles.radioInner, { backgroundColor: colors.gold.primary }]} />}
                  </View>
                </TouchableOpacity>
                {i === 0 && <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />}
              </View>
            );
          })}
        </AppCard>

        {/* ── Método de pago ────────────────────────────── */}
        <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>Método de pago</Text>
        <AppCard>
          {metodos.map((m, i) => {
            const sel = seleccionado === m.id;
            const icono = METODO_ICONO[m.nombre] ?? 'card-outline';
            return (
              <View key={m.id}>
                <TouchableOpacity
                  onPress={() => setSeleccionado(m.id)}
                  style={[styles.tipoFila, sel && { backgroundColor: `${colors.gold.primary}10` }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tipoIconBox, { backgroundColor: sel ? `${colors.gold.primary}18` : colors.bg.tertiary }]}>
                    <Ionicons name={icono as any} size={20} color={sel ? colors.gold.primary : colors.text.muted} />
                  </View>
                  <Text style={[styles.tipoLabel, { flex: 1, color: sel ? colors.gold.primary : colors.text.primary }]}>
                    {m.nombre}
                  </Text>
                  <View style={[styles.radioOuter, { borderColor: sel ? colors.gold.primary : colors.border.light }]}>
                    {sel && <View style={[styles.radioInner, { backgroundColor: colors.gold.primary }]} />}
                  </View>
                </TouchableOpacity>
                {i < metodos.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />}
              </View>
            );
          })}
        </AppCard>

        {/* ── Resumen ───────────────────────────────────── */}
        <AppCard goldBorder>
          <Text style={[styles.resumenTitulo, { color: colors.text.primary }]}>Resumen</Text>
          <View style={styles.resumenFila}>
            <Text style={[styles.resumenLabel, { color: colors.text.secondary }]}>Total reserva</Text>
            <Text style={[styles.resumenValor, { color: colors.text.primary }]}>Bs. {total.toFixed(2)}</Text>
          </View>
          <View style={[styles.resumenFila, { marginTop: Spacing.sm }]}>
            <Text style={[styles.resumenLabel, { color: colors.text.secondary }]}>A pagar ahora</Text>
            <Text style={[styles.resumenTotal, { color: colors.gold.primary }]}>Bs. {monto.toFixed(2)}</Text>
          </View>
        </AppCard>

        <AppButton
          label={`Confirmar pago — Bs. ${monto.toFixed(2)}`}
          onPress={handlePagar}
          loading={pagando}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  reservaInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  reservaCodigo: { fontSize: Typography.md, fontWeight: '700' },
  reservaTotal: { fontSize: Typography.sm, marginTop: 2 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  tipoFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md },
  tipoIconBox: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  tipoLabel: { fontSize: Typography.md, fontWeight: '600' },
  tipoDesc: { fontSize: Typography.xs, marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: 1, marginHorizontal: Spacing.md },
  resumenTitulo: { fontSize: Typography.md, fontWeight: '700', marginBottom: Spacing.sm },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between' },
  resumenLabel: { fontSize: Typography.sm },
  resumenValor: { fontSize: Typography.sm, fontWeight: '600' },
  resumenTotal: { fontSize: Typography.xl, fontWeight: '800' },
});
