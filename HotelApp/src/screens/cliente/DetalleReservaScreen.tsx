// ============================================================
// SRP: pantalla de detalle de una reserva del cliente.
// DIP: usa obtenerDetalleReserva(), informarLlegada() de clienteService.
// DRY: StatusBadge, AppCard, AppButton, ScreenHeader reutilizados.
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  obtenerDetalleReserva, informarLlegada,
  cancelarReserva, obtenerResena, guardarResena,
} from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import type { ClienteStackParamList, Resena } from '../../types';

type RouteProps = RouteProp<ClienteStackParamList, 'DetalleReserva'>;
type NavProp   = NativeStackNavigationProp<ClienteStackParamList>;

function StarSelector({ value, onChange, label, colors }: { value: number; onChange: (v: number) => void; label: string; colors: any }) {
  return (
    <View style={styles.starRow}>
      <Text style={[styles.starLabel, { color: colors.text.secondary }]}>{label}</Text>
      <View style={styles.starsRow}>
        {[1,2,3,4,5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)}>
            <Ionicons
              name={s <= value ? 'star' : 'star-outline'}
              size={24}
              color={s <= value ? colors.gold.primary : colors.border.light}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function DetalleReservaScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteProps>();
  const { reservaId } = route.params;
  const { perfil } = useAuth();
  const { colors } = useTheme();

  const [reserva, setReserva]           = useState<any>(null);
  const [pagos, setPagos]               = useState<any[]>([]);
  const [resena, setResena]             = useState<Resena | null>(null);
  const [cargando, setCargando]         = useState(true);
  const [cancelando, setCancelando]     = useState(false);
  const [informando, setInformando]     = useState(false);

  // Estado modal reseña
  const [modalResena, setModalResena]     = useState(false);
  const [calif, setCalif]                 = useState(5);
  const [calLimp, setCalLimp]             = useState(5);
  const [calAten, setCalAten]             = useState(5);
  const [calUbic, setCalUbic]             = useState(5);
  const [calPrecio, setCalPrecio]         = useState(5);
  const [tituloR, setTituloR]             = useState('');
  const [comentarioR, setComentarioR]     = useState('');
  const [enviandoResena, setEnviandoR]    = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // DIP: delega a clienteService (no llama a supabase directamente)
      const { reserva: r, pagos: p } = await obtenerDetalleReserva(reservaId);
      setReserva(r);
      setPagos(p);

      if (perfil?.cliente_id) {
        const res = await obtenerResena(reservaId);
        setResena(res);
      }
    } catch (e) {
      console.error('DetalleReserva:', e);
    } finally {
      setCargando(false);
    }
  }, [reservaId, perfil?.cliente_id]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const handleCancelar = () =>
    Alert.alert('Cancelar reserva', '¿Confirmas la cancelación?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive',
        onPress: async () => {
          setCancelando(true);
          try {
            await cancelarReserva(reservaId);
            Alert.alert('Cancelada', 'Tu reserva fue cancelada.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setCancelando(false);
          }
        },
      },
    ]);

  const handleInformarLlegada = async () => {
    // Solo se puede informar llegada el mismo día o hasta 12 h antes del check-in
    const checkinMs = new Date(entrada + 'T00:00:00').getTime();
    const ahoraMs   = Date.now();
    const DOCE_HORAS = 12 * 60 * 60 * 1000;
    if (checkinMs - ahoraMs > DOCE_HORAS) {
      const diasRestantes = Math.ceil((checkinMs - ahoraMs) / (24 * 60 * 60 * 1000));
      Alert.alert(
        'Muy pronto',
        `Tu check-in es el ${entrada}. Solo puedes informar tu llegada el mismo día o unas horas antes.\n\nFaltan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}.`,
      );
      return;
    }
    setInformando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Activa el permiso de ubicación para informar tu llegada.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await informarLlegada({
        reservaId,
        latitud:  loc.coords.latitude,
        longitud: loc.coords.longitude,
        mensaje: 'El cliente informa su llegada aproximada al hotel.',
      });
      Alert.alert(
        'Aviso enviado',
        'El personal del hotel fue notificado de tu llegada. Te daremos la bienvenida.',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar la ubicación.');
    } finally {
      setInformando(false);
    }
  };

  const handleEnviarResena = async () => {
    if (!perfil?.cliente_id) {
      Alert.alert('Perfil incompleto', 'Necesitas un perfil de cliente para dejar una reseña.');
      return;
    }
    setEnviandoR(true);
    try {
      await guardarResena({
        id:           resena?.id,
        reservaId,
        clienteId:    perfil.cliente_id,
        calificacion: calif,
        titulo:       tituloR.trim() || null,
        comentario:   comentarioR.trim() || null,
        calLimpieza:  calLimp,
        calAtencion:  calAten,
        calUbicacion: calUbic,
        calPrecio,
      });
      Alert.alert('Gracias', 'Tu reseña fue enviada.');
      setModalResena(false);
      void cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setEnviandoR(false);
    }
  };

  if (cargando) return <LoadingScreen />;

  if (!reserva) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <ScreenHeader titulo="Detalle reserva" mostrarBack />
        <View style={styles.sinDatos}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.muted} />
          <Text style={[styles.sinDatosTitulo, { color: colors.text.primary }]}>
            Reserva no encontrada
          </Text>
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </View>
    );
  }

  // Campos del reserva (pueden venir de rpc_mis_reservas con distintos nombres)
  const codigo   = reserva.codigo_reserva ?? reserva.codigo ?? '—';
  const entrada  = reserva.fecha_entrada ?? '—';
  const salida   = reserva.fecha_salida ?? '—';
  const estado   = reserva.estado ?? reserva.estado_reserva ?? 'pendiente';
  const total    = Number(reserva.total_estimado ?? reserva.subtotal ?? 0);
  const nombre   = reserva.cliente_nombre ?? perfil?.nombre_completo ?? '—';
  const correo   = reserva.cliente_correo ?? perfil?.correo ?? '—';
  const habitNum = reserva.habitacion ?? reserva.numero_habitacion ?? '—';
  const tipoHab  = reserva.tipo_habitacion ?? '—';
  const noches   = Math.max(0, Math.ceil((new Date(salida).getTime() - new Date(entrada).getTime()) / 86400000));

  const puedePagar     = ['pendiente', 'confirmada'].includes(estado);
  const puedePreCheckin = estado === 'confirmada';
  const puedeCancelar  = ['pendiente', 'confirmada'].includes(estado);
  const puedeResenar   = estado === 'finalizada';
  const puedeInformar  = ['confirmada', 'en_estadia'].includes(estado);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Detalle de reserva" mostrarBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Encabezado ────────────────────────────────── */}
        <AppCard goldBorder>
          <View style={styles.encabezadoRow}>
            <Text style={[styles.codigoText, { color: colors.text.primary }]}>{codigo}</Text>
            <StatusBadge estado={estado} />
          </View>
          <Text style={[styles.nombreText, { color: colors.text.secondary }]}>{nombre}</Text>
          <Text style={[styles.correoText, { color: colors.text.muted }]}>{correo}</Text>
        </AppCard>

        {/* ── Habitación ────────────────────────────────── */}
        {(habitNum !== '—' || tipoHab !== '—') && (
          <>
            <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>Habitación</Text>
            <AppCard>
              {[
                { label: 'Número', valor: `#${habitNum}` },
                { label: 'Tipo', valor: tipoHab },
                { label: 'Noches estimadas', valor: String(noches) },
              ].map((f, i) => (
                <View key={f.label}>
                  <View style={styles.filaInfo}>
                    <Text style={[styles.filaLabel, { color: colors.text.secondary }]}>{f.label}</Text>
                    <Text style={[styles.filaValor, { color: colors.text.primary }]}>{f.valor}</Text>
                  </View>
                  {i < 2 && <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />}
                </View>
              ))}
              <View style={[styles.filaInfo, { marginTop: Spacing.sm }]}>
                <Text style={[styles.filaLabel, { color: colors.text.secondary }]}>Total estimado</Text>
                <Text style={[styles.filaTotal, { color: colors.gold.primary }]}>
                  Bs. {total.toFixed(2)}
                </Text>
              </View>
            </AppCard>
          </>
        )}

        {/* ── Fechas ────────────────────────────────────── */}
        <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>Fechas</Text>
        <AppCard>
          <View style={styles.fechasRow}>
            <View style={styles.fechaBox}>
              <Ionicons name="log-in-outline" size={18} color={colors.gold.primary} />
              <Text style={[styles.fechaLabel, { color: colors.text.muted }]}>Check-in</Text>
              <Text style={[styles.fechaValor, { color: colors.text.primary }]}>{entrada}</Text>
            </View>
            <View style={[styles.fechaSep, { backgroundColor: colors.border.primary }]} />
            <View style={styles.fechaBox}>
              <Ionicons name="log-out-outline" size={18} color={colors.gold.primary} />
              <Text style={[styles.fechaLabel, { color: colors.text.muted }]}>Check-out</Text>
              <Text style={[styles.fechaValor, { color: colors.text.primary }]}>{salida}</Text>
            </View>
          </View>
        </AppCard>

        {/* ── Pagos ─────────────────────────────────────── */}
        <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>Historial de pagos</Text>
        <AppCard>
          {pagos.length === 0 ? (
            <View style={styles.sinPagos}>
              <Ionicons name="card-outline" size={24} color={colors.text.muted} />
              <Text style={[styles.sinPagosTexto, { color: colors.text.muted }]}>Sin pagos registrados</Text>
            </View>
          ) : (
            pagos.map((p, i) => (
              <View key={p.id}>
                <View style={styles.pagoFila}>
                  <View>
                    <Text style={[styles.pagoTipo, { color: colors.text.primary }]}>
                      {(p.tipo_pago ?? '').replace(/_/g, ' ')}
                    </Text>
                    <Text style={[styles.pagoMetodo, { color: colors.text.muted }]}>
                      {p.metodo_pago?.nombre ?? ''}
                    </Text>
                    <Text style={[styles.pagoFecha, { color: colors.text.muted }]}>
                      {new Date(p.fecha_pago).toLocaleDateString('es-BO')}
                    </Text>
                  </View>
                  <View style={styles.pagoRight}>
                    <Text style={[styles.pagoMonto, { color: colors.gold.primary }]}>
                      Bs. {Number(p.monto).toFixed(2)}
                    </Text>
                    <View style={[styles.pagoBadge, {
                      backgroundColor: p.estado === 'aprobado' ? colors.status.successBg : colors.status.errorBg,
                    }]}>
                      <Text style={[styles.pagoBadgeText, {
                        color: p.estado === 'aprobado' ? colors.status.success : colors.status.error,
                      }]}>
                        {p.estado}
                      </Text>
                    </View>
                  </View>
                </View>
                {i < pagos.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />}
              </View>
            ))
          )}
        </AppCard>

        {/* ── Reseña existente ──────────────────────────── */}
        {resena && (
          <>
            <Text style={[styles.seccionTitulo, { color: colors.text.muted }]}>Tu reseña</Text>
            <AppCard goldBorder>
              <View style={styles.resenaEstrellas}>
                {[1,2,3,4,5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= resena.calificacion ? 'star' : 'star-outline'}
                    size={20}
                    color={colors.gold.primary}
                  />
                ))}
              </View>
              {resena.titulo && (
                <Text style={[styles.resenaTitulo, { color: colors.text.primary }]}>{resena.titulo}</Text>
              )}
              {resena.comentario && (
                <Text style={[styles.resenaComentario, { color: colors.text.secondary }]}>{resena.comentario}</Text>
              )}
            </AppCard>
          </>
        )}

        {/* ── Acciones ──────────────────────────────────── */}
        <View style={styles.acciones}>
          {puedeInformar && (
            <AppButton
              label={informando ? 'Obteniendo ubicación...' : 'Informar mi llegada'}
              onPress={handleInformarLlegada}
              loading={informando}
              variant="secondary"
              fullWidth
            />
          )}
          {puedePagar && (
            <AppButton
              label="Registrar pago"
              onPress={() => navigation.navigate('Pago', { reservaId })}
              fullWidth
            />
          )}
          {puedePreCheckin && (
            <AppButton
              label="Hacer pre check-in"
              onPress={() => navigation.navigate('PreCheckin', { reservaId })}
              variant="secondary"
              fullWidth
            />
          )}
          {puedeResenar && (
            <AppButton
              label={resena ? 'Editar reseña' : 'Dejar reseña'}
              onPress={() => setModalResena(true)}
              variant="ghost"
              fullWidth
            />
          )}
          {puedeCancelar && (
            <AppButton
              label="Cancelar reserva"
              onPress={handleCancelar}
              loading={cancelando}
              variant="danger"
              fullWidth
            />
          )}
        </View>
      </ScrollView>

      {/* ── Modal reseña ──────────────────────────────── */}
      <Modal visible={modalResena} animationType="slide" transparent onRequestClose={() => setModalResena(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.bg.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.bg.secondary }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitulo, { color: colors.text.primary }]}>Dejar reseña</Text>
                <TouchableOpacity onPress={() => setModalResena(false)}>
                  <Ionicons name="close" size={22} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              <StarSelector value={calif}    onChange={setCalif}    label="Calificación general" colors={colors} />
              <StarSelector value={calLimp}  onChange={setCalLimp}  label="Limpieza"             colors={colors} />
              <StarSelector value={calAten}  onChange={setCalAten}  label="Atención"             colors={colors} />
              <StarSelector value={calUbic}  onChange={setCalUbic}  label="Ubicación"            colors={colors} />
              <StarSelector value={calPrecio} onChange={setCalPrecio} label="Precio/valor"       colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Título (opcional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input.bg, borderColor: colors.input.border, color: colors.text.primary }]}
                value={tituloR}
                onChangeText={setTituloR}
                placeholder="Resume tu experiencia"
                placeholderTextColor={colors.input.placeholder}
                maxLength={100}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Comentario (opcional)</Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.input.bg, borderColor: colors.input.border, color: colors.text.primary }]}
                value={comentarioR}
                onChangeText={setComentarioR}
                placeholder="Cuéntanos sobre tu estadía..."
                placeholderTextColor={colors.input.placeholder}
                multiline numberOfLines={4} maxLength={500}
              />

              <AppButton
                label="Enviar reseña"
                onPress={handleEnviarResena}
                loading={enviandoResena}
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  sinDatos: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  sinDatosTitulo: { fontSize: Typography.lg, fontWeight: '700' },
  encabezadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  codigoText: { fontSize: Typography.lg, fontWeight: '800' },
  nombreText: { fontSize: Typography.md, fontWeight: '600', marginTop: Spacing.xs },
  correoText: { fontSize: Typography.sm, marginTop: 2 },
  seccionTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  filaLabel: { fontSize: Typography.sm },
  filaValor: { fontSize: Typography.sm, fontWeight: '600' },
  filaTotal: { fontSize: Typography.lg, fontWeight: '800' },
  divider: { height: 1 },
  fechasRow: { flexDirection: 'row', alignItems: 'center' },
  fechaBox: { flex: 1, alignItems: 'center', gap: 4 },
  fechaSep: { width: 1, height: 50 },
  fechaLabel: { fontSize: Typography.xs },
  fechaValor: { fontSize: Typography.md, fontWeight: '700' },
  sinPagos: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  sinPagosTexto: { fontSize: Typography.sm },
  pagoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  pagoTipo: { fontSize: Typography.sm, fontWeight: '600', textTransform: 'capitalize' },
  pagoMetodo: { fontSize: Typography.xs, marginTop: 2 },
  pagoFecha: { fontSize: Typography.xs, marginTop: 2 },
  pagoRight: { alignItems: 'flex-end', gap: 4 },
  pagoMonto: { fontSize: Typography.md, fontWeight: '700' },
  pagoBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  pagoBadgeText: { fontSize: 10, fontWeight: '700' },
  resenaEstrellas: { flexDirection: 'row', gap: 4, marginBottom: Spacing.sm },
  resenaTitulo: { fontSize: Typography.md, fontWeight: '700', marginBottom: 4 },
  resenaComentario: { fontSize: Typography.sm, lineHeight: 18 },
  acciones: { gap: Spacing.sm },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitulo: { fontSize: Typography.lg, fontWeight: '700' },
  starRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  starLabel: { fontSize: Typography.sm, flex: 1 },
  starsRow: { flexDirection: 'row', gap: 4 },
  fieldLabel: { fontSize: Typography.sm, marginBottom: 6, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, fontSize: Typography.sm, marginBottom: Spacing.sm },
  textarea: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, fontSize: Typography.sm, minHeight: 90, textAlignVertical: 'top' },
});
