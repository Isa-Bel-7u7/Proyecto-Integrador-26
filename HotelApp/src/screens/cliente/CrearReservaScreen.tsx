// SRP: pantalla de confirmación de reserva con hora de llegada y peticiones especiales.
// DIP: usa crearReserva() y buscarHabitacionesDisponibles() de clienteService.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  buscarHabitacionesDisponibles,
  obtenerImagenesHabitaciones,
  crearReserva,
} from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import type { ClienteStackParamList, HabitacionDisponible } from '../../types';

type RouteProps = RouteProp<ClienteStackParamList, 'CrearReserva'>;
type NavProp   = NativeStackNavigationProp<ClienteStackParamList>;

const fmt = (fecha: string) => {
  try {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-BO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return fecha; }
};

// OCP: agregar horarios o peticiones = agregar a estos arrays
const HORARIOS = [
  '06:00 - 07:00', '07:00 - 08:00', '08:00 - 09:00',
  '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
  '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00',
  '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00',
  '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00',
  '21:00 - 22:00',
];

const PETICIONES = [
  'Cama extra',
  'Cuna para bebé',
  'Llegada tarde (después de las 22:00)',
  'Traslado desde el aeropuerto',
  'Desayuno incluido',
  'Habitación en piso alto',
  'Habitación con mejor vista',
  'Sin alfombra (alergias)',
];

export default function CrearReservaScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteProps>();
  const { habitacionId, fechaEntrada, fechaSalida, adultos, ninos } = route.params;
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [habitacion, setHabitacion]       = useState<HabitacionDisponible | null>(null);
  const [imagenUrl, setImagenUrl]         = useState<string | null>(null);
  const [horaSeleccionada, setHora]       = useState<string | null>(null);
  const [extras, setExtras]               = useState<string[]>([]);
  const [otroTexto, setOtroTexto]         = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando]           = useState(true);
  const [creando, setCreando]             = useState(false);

  const noches = Math.max(1, Math.ceil(
    (new Date(fechaSalida).getTime() - new Date(fechaEntrada).getTime()) / 86400000
  ));

  useEffect(() => { void cargarHabitacion(); }, []);

  const cargarHabitacion = async () => {
    try {
      const [lista, imgs] = await Promise.all([
        buscarHabitacionesDisponibles({ entrada: fechaEntrada, salida: fechaSalida }),
        obtenerImagenesHabitaciones([habitacionId]),
      ]);
      const hab = lista.find(
        (h) => h.habitacion_id === habitacionId || h.id === habitacionId
      );
      setHabitacion(hab ?? null);
      setImagenUrl(imgs[habitacionId] ?? null);
    } catch (e) {
      console.error('CrearReserva:', e);
    } finally {
      setCargando(false);
    }
  };

  const toggleExtra = (item: string) =>
    setExtras((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );

  const construirObservaciones = (): string => {
    const partes: string[] = [];
    if (horaSeleccionada) partes.push(`Hora estimada de llegada: ${horaSeleccionada}`);
    if (extras.length > 0) partes.push(`Peticiones especiales: ${extras.join(', ')}`);
    if (otroTexto.trim()) partes.push(`Otro: ${otroTexto.trim()}`);
    if (observaciones.trim()) partes.push(observaciones.trim());
    return partes.join(' | ');
  };

  const handleCrear = () => {
    if (!habitacion) return;
    Alert.alert(
      'Confirmar reserva',
      `Habitación ${habitacion.nombre_tipo} #${habitacion.numero}\n${fmt(fechaEntrada)} — ${fmt(fechaSalida)}\nTotal: ${total.toFixed(2)} ${moneda}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setCreando(true);
            try {
              const obs = construirObservaciones();
              const { reserva_id, codigo_reserva } = await crearReserva({
                habitacionId,
                fechaEntrada,
                fechaSalida,
                cantidadAdultos: adultos,
                cantidadNinos:   ninos,
                observaciones:   obs || undefined,
              });
              Alert.alert(
                'Reserva creada',
                `Código: ${codigo_reserva}`,
                [{ text: 'Ver reserva', onPress: () => navigation.navigate('DetalleReserva', { reservaId: reserva_id }) }],
              );
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'No se pudo crear la reserva.');
            } finally {
              setCreando(false);
            }
          },
        },
      ]
    );
  };

  if (cargando) return <LoadingScreen />;

  if (!habitacion) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <ScreenHeader titulo="Confirmar reserva" mostrarBack />
        <View style={s.centro}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.muted} />
          <Text style={[s.errorText, { color: colors.text.secondary }]}>
            Habitación no disponible para las fechas seleccionadas.
          </Text>
        </View>
      </View>
    );
  }

  const total  = habitacion.precio * noches;
  const moneda = habitacion.moneda ?? 'BOB';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Confirmar reserva" mostrarBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Habitación ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Habitación seleccionada</Text>
        <AppCard goldBorder>
          <View style={s.habRow}>
            <View style={[s.habIconBox, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="bed-outline" size={28} color={colors.gold.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.habTipo, { color: colors.text.primary }]}>
                {habitacion.nombre_tipo}
              </Text>
              <Text style={[s.habNumero, { color: colors.text.secondary }]}>
                Habitación #{habitacion.numero} — Piso {habitacion.piso}
              </Text>
              <Text style={[s.habCamas, { color: colors.text.muted }]}>
                {habitacion.numero_camas} cama{habitacion.numero_camas !== 1 ? 's' : ''}
                {habitacion.tipo_cama ? ` ${habitacion.tipo_cama}` : ''}
              </Text>
            </View>
            <View style={s.habPrecioBox}>
              <Text style={[s.habPrecioVal, { color: colors.gold.primary }]}>
                {habitacion.precio}
              </Text>
              <Text style={[s.habPrecioLabel, { color: colors.text.muted }]}>
                {moneda}/noche
              </Text>
            </View>
          </View>
        </AppCard>

        {/* ── Estadía ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Detalles de estadía</Text>
        <AppCard>
          {[
            { icon: 'log-in-outline',  label: 'Check-in',  valor: fmt(fechaEntrada) },
            { icon: 'log-out-outline', label: 'Check-out', valor: fmt(fechaSalida) },
            { icon: 'moon-outline',    label: 'Noches',    valor: String(noches) },
            { icon: 'people-outline',  label: 'Adultos',   valor: String(adultos) },
            ...(ninos > 0 ? [{ icon: 'happy-outline', label: 'Niños', valor: String(ninos) }] : []),
          ].map((f, i, arr) => (
            <View key={f.label}>
              <View style={s.fila}>
                <View style={s.filaIzq}>
                  <Ionicons name={f.icon as any} size={14} color={colors.text.muted} />
                  <Text style={[s.filaLabel, { color: colors.text.secondary }]}>{f.label}</Text>
                </View>
                <Text style={[s.filaValor, { color: colors.text.primary }]}>{f.valor}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[s.divider, { backgroundColor: colors.border.primary }]} />
              )}
            </View>
          ))}
          <View style={[s.totalBox, { backgroundColor: colors.bg.tertiary }]}>
            <Text style={[s.totalLabel, { color: colors.text.secondary }]}>Total estimado</Text>
            <Text style={[s.totalValor, { color: colors.gold.primary }]}>
              {total.toFixed(2)} {moneda}
            </Text>
          </View>
        </AppCard>

        {/* ── Hora estimada de llegada ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>
          Hora estimada de llegada (opcional)
        </Text>
        <AppCard>
          <View style={s.horariosGrid}>
            {HORARIOS.map((h) => {
              const sel = horaSeleccionada === h;
              return (
                <TouchableOpacity
                  key={h}
                  onPress={() => setHora(sel ? null : h)}
                  style={[
                    s.horarioBtn,
                    {
                      backgroundColor: sel ? `${colors.gold.primary}15` : colors.bg.tertiary,
                      borderColor:     sel ? colors.gold.primary : colors.border.primary,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="time-outline"
                    size={11}
                    color={sel ? colors.gold.primary : colors.text.muted}
                  />
                  <Text style={[s.horarioText, { color: sel ? colors.gold.primary : colors.text.secondary }]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {horaSeleccionada && (
            <View style={[s.horaSelRow, { backgroundColor: `${colors.gold.primary}12` }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.gold.primary} />
              <Text style={[s.horaSelText, { color: colors.gold.primary }]}>
                Llegada estimada: {horaSeleccionada}
              </Text>
            </View>
          )}
        </AppCard>

        {/* ── Peticiones especiales ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>
          Peticiones especiales (opcional)
        </Text>
        <AppCard>
          <Text style={[s.peticionesInfo, { color: colors.text.secondary }]}>
            Selecciona lo que necesitas. El hotel hará todo lo posible para satisfacer tu solicitud.
          </Text>
          <View style={s.peticionesGrid}>
            {PETICIONES.map((p) => {
              const sel = extras.includes(p);
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => toggleExtra(p)}
                  style={[
                    s.peticionBtn,
                    {
                      backgroundColor: sel ? `${colors.gold.primary}12` : colors.bg.tertiary,
                      borderColor:     sel ? colors.gold.primary : colors.border.primary,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[
                    s.checkbox,
                    {
                      backgroundColor: sel ? colors.gold.primary : 'transparent',
                      borderColor:     sel ? colors.gold.primary : colors.border.light,
                    },
                  ]}>
                    {sel && <Ionicons name="checkmark" size={11} color={colors.bg.primary} />}
                  </View>
                  <Text style={[s.peticionText, { color: sel ? colors.gold.primary : colors.text.secondary }]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.otroLabel, { color: colors.text.muted }]}>Otro (describir)</Text>
          <TextInput
            style={[s.textArea, {
              backgroundColor: colors.input.bg,
              borderColor:     colors.input.border,
              color:           colors.text.primary,
            }]}
            placeholder="Escribe cualquier otra solicitud especial..."
            placeholderTextColor={colors.input.placeholder}
            value={otroTexto}
            onChangeText={setOtroTexto}
            multiline
            numberOfLines={2}
            maxLength={200}
          />
        </AppCard>

        {/* ── Observaciones adicionales ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Notas adicionales</Text>
        <AppCard>
          <TextInput
            style={[s.textArea, {
              backgroundColor: colors.input.bg,
              borderColor:     colors.input.border,
              color:           colors.text.primary,
            }]}
            placeholder="Información adicional para el hotel..."
            placeholderTextColor={colors.input.placeholder}
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            numberOfLines={2}
            maxLength={200}
          />
        </AppCard>

        {/* ── Titular ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Datos del titular</Text>
        <AppCard>
          {[
            { label: 'Nombre', valor: perfil?.nombre_completo ?? '—' },
            { label: 'Correo', valor: perfil?.correo ?? '—' },
          ].map((f, i) => (
            <View key={f.label}>
              <View style={s.fila}>
                <Text style={[s.filaLabel, { color: colors.text.secondary }]}>{f.label}</Text>
                <Text style={[s.filaValor, { color: colors.text.primary }]} numberOfLines={1}>
                  {f.valor}
                </Text>
              </View>
              {i === 0 && (
                <View style={[s.divider, { backgroundColor: colors.border.primary }]} />
              )}
            </View>
          ))}
        </AppCard>

        <AppButton
          label="Confirmar reserva"
          onPress={handleCrear}
          loading={creando}
          fullWidth
        />

        <Text style={[s.nota, { color: colors.text.muted }]}>
          Al confirmar aceptas las políticas del hotel. El pago puede realizarse en recepción o desde la app.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  centro:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  errorText: { fontSize: Typography.md, textAlign: 'center' },
  seccionTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  // Habitación
  habRow:       { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  habIconBox:   { width: 52, height: 52, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  habTipo:      { fontSize: Typography.md, fontWeight: '700', marginBottom: 2 },
  habNumero:    { fontSize: Typography.sm, marginBottom: 2 },
  habCamas:     { fontSize: Typography.xs },
  habPrecioBox: { alignItems: 'flex-end' },
  habPrecioVal:   { fontSize: Typography.lg, fontWeight: '800' },
  habPrecioLabel: { fontSize: Typography.xs },
  // Estadía
  fila:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  filaIzq:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filaLabel:  { fontSize: Typography.sm },
  filaValor:  { fontSize: Typography.sm, fontWeight: '600', flex: 1, textAlign: 'right' },
  divider:    { height: 1 },
  totalBox:   { borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  totalLabel: { fontSize: Typography.md, fontWeight: '600' },
  totalValor: { fontSize: Typography.xl, fontWeight: '800' },
  // Horarios
  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  horarioBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BorderRadius.sm, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  horarioText:  { fontSize: 11, fontWeight: '600' },
  horaSelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  horaSelText:  { fontSize: Typography.sm, fontWeight: '600' },
  // Peticiones
  peticionesInfo: { fontSize: Typography.xs, lineHeight: 17, marginBottom: Spacing.sm },
  peticionesGrid: { gap: Spacing.sm },
  peticionBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1,
    padding: Spacing.sm + 2,
  },
  checkbox:  { width: 18, height: 18, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  peticionText: { fontSize: Typography.sm, flex: 1, lineHeight: 18 },
  otroLabel: { fontSize: Typography.xs, marginTop: Spacing.md, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  textArea:  { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, fontSize: Typography.sm, minHeight: 60, textAlignVertical: 'top' },
  nota:      { fontSize: Typography.xs, textAlign: 'center', lineHeight: 17 },
});
