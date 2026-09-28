// SRP: pantalla exclusiva de búsqueda de habitaciones disponibles.
// DIP: usa buscarHabitacionesDisponibles() de clienteService.
// DRY: DatePickerModal reutilizable para selector de fechas.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  buscarHabitacionesDisponibles,
  obtenerImagenesHabitaciones,
  IMAGEN_FALLBACK,
  IMAGEN_DEFAULT,
} from '../../services/clienteService';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import ScreenHeader from '../../components/common/ScreenHeader';
import DatePickerModal from '../../components/common/DatePickerModal';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';
import type { ClienteStackParamList, HabitacionDisponible } from '../../types';

type NavProp = NativeStackNavigationProp<ClienteStackParamList>;

function formatearFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sumarDias(fecha: string, cantidad: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  local.setDate(local.getDate() + cantidad);
  return formatearFecha(local);
}

function mostrarFecha(s: string): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${MESES[parseInt(m, 10) - 1]} ${y}`;
}

function calcularNoches(entrada: string, salida: string): number {
  if (!entrada || !salida) return 0;
  return Math.max(0, Math.ceil(
    (new Date(salida).getTime() - new Date(entrada).getTime()) / 86400000
  ));
}

export default function BuscarScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();

  const hoy = new Date();
  const manana = new Date(); manana.setDate(hoy.getDate() + 1);

  const [fechaEntrada, setFechaEntrada] = useState(formatearFecha(hoy));
  const [fechaSalida, setFechaSalida]   = useState(formatearFecha(manana));
  const [adultos, setAdultos]           = useState(1);
  const [ninos, setNinos]               = useState(0);
  const [resultados, setResultados]     = useState<HabitacionDisponible[]>([]);
  const [cargando, setCargando]         = useState(false);
  const [buscado, setBuscado]           = useState(false);

  const [pickerEntrada, setPickerEntrada] = useState(false);
  const [pickerSalida, setPickerSalida]   = useState(false);

  const noches = calcularNoches(fechaEntrada, fechaSalida);

  // Si cambia entrada, asegurar que salida sea posterior
  useEffect(() => {
    if (fechaSalida <= fechaEntrada) {
      setFechaSalida(sumarDias(fechaEntrada, 1));
    }
  }, [fechaEntrada]);

  const validar = (): boolean => {
    if (!fechaEntrada || !fechaSalida) {
      Alert.alert('Fechas requeridas', 'Selecciona entrada y salida.'); return false;
    }
    if (new Date(fechaEntrada) < new Date(formatearFecha(new Date()))) {
      Alert.alert('Fecha inválida', 'La fecha de entrada no puede ser pasada.'); return false;
    }
    if (fechaSalida <= fechaEntrada) {
      Alert.alert('Fecha inválida', 'La salida debe ser posterior a la entrada.'); return false;
    }
    return true;
  };

  const buscar = async () => {
    if (!validar()) return;
    setCargando(true);
    setBuscado(true);
    try {
      const data = await buscarHabitacionesDisponibles({ entrada: fechaEntrada, salida: fechaSalida });
      const filtradas = data.filter(
        (h) => h.capacidad_adultos >= adultos &&
               (ninos === 0 || (h.capacidad_ninos ?? 0) >= ninos)
      );
      // Enriquecer con imágenes reales desde tipos_habitacion
      const ids  = filtradas.map((h) => h.habitacion_id ?? h.id).filter(Boolean);
      const imgs = ids.length > 0 ? await obtenerImagenesHabitaciones(ids) : {};
      const enriquecidas = filtradas.map((h) => ({
        ...h,
        // portada real → fallback por tipo (mismas URLs que web) → null
        imagen_url: imgs[h.habitacion_id ?? h.id]
          ?? IMAGEN_FALLBACK[h.nombre_tipo]
          ?? IMAGEN_DEFAULT,
      }));
      setResultados(enriquecidas);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo buscar habitaciones.');
      setResultados([]);
    } finally {
      setCargando(false);
    }
  };

  const irAReservar = (hab: HabitacionDisponible) =>
    navigation.navigate('CrearReserva', {
      habitacionId: hab.habitacion_id,
      fechaEntrada, fechaSalida, adultos, ninos,
    });

  const irADetalle = (hab: HabitacionDisponible) =>
    navigation.navigate('DetalleHabitacion', {
      habitacionId: hab.habitacion_id,
      fechaEntrada, fechaSalida, adultos, ninos,
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo="Buscar habitación" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Panel de búsqueda ─────────────────────────── */}
        <AppCard style={styles.buscador}>
          {/* Selector de fechas con toque → calendario */}
          <View style={styles.fechasRow}>
            <TouchableOpacity
              style={[styles.fechaBtn, { backgroundColor: colors.bg.primary, borderColor: colors.border.primary }]}
              onPress={() => setPickerEntrada(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={16} color={colors.gold.primary} />
              <View>
                <Text style={[styles.fechaBtnLabel, { color: colors.text.muted }]}>Entrada</Text>
                <Text style={[styles.fechaBtnValor, { color: colors.text.primary }]}>
                  {mostrarFecha(fechaEntrada)}
                </Text>
              </View>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />

            <TouchableOpacity
              style={[styles.fechaBtn, { backgroundColor: colors.bg.primary, borderColor: colors.border.primary }]}
              onPress={() => setPickerSalida(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.gold.primary} />
              <View>
                <Text style={[styles.fechaBtnLabel, { color: colors.text.muted }]}>Salida</Text>
                <Text style={[styles.fechaBtnValor, { color: colors.text.primary }]}>
                  {mostrarFecha(fechaSalida)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {noches > 0 && (
            <Text style={[styles.nochesChip, { color: colors.gold.primary, borderColor: colors.border.gold }]}>
              {noches} {noches === 1 ? 'noche' : 'noches'}
            </Text>
          )}

          {/* Contador huéspedes */}
          <View style={styles.huespedesRow}>
            {[
              { label: 'Adultos', min: 1, valor: adultos, set: setAdultos },
              { label: 'Niños',   min: 0, valor: ninos,   set: setNinos   },
            ].map((c) => (
              <View key={c.label} style={[styles.contadorCard, { backgroundColor: colors.bg.primary, borderColor: colors.border.primary }]}>
                <Text style={[styles.contadorLabel, { color: colors.text.secondary }]}>{c.label}</Text>
                <View style={styles.contadorRow}>
                  <TouchableOpacity
                    onPress={() => c.set(Math.max(c.min, c.valor - 1))}
                    style={[styles.contadorBtn, { backgroundColor: colors.bg.tertiary }]}
                  >
                    <Ionicons name="remove" size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.contadorNum, { color: colors.text.primary }]}>{c.valor}</Text>
                  <TouchableOpacity
                    onPress={() => c.set(c.valor + 1)}
                    style={[styles.contadorBtn, { backgroundColor: colors.bg.tertiary }]}
                  >
                    <Ionicons name="add" size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <AppButton label="Buscar disponibilidad" onPress={buscar} loading={cargando} fullWidth />
        </AppCard>

        {/* ── Resultados ────────────────────────────────── */}
        {buscado && !cargando && (
          <>
            <Text style={[styles.resultadosTitulo, { color: colors.text.muted }]}>
              {resultados.length > 0
                ? `${resultados.length} habitación${resultados.length > 1 ? 'es' : ''} disponible${resultados.length > 1 ? 's' : ''}`
                : 'Sin resultados'}
            </Text>

            {resultados.length === 0 ? (
              <AppCard style={styles.sinResultados}>
                <Ionicons name="search-outline" size={40} color={colors.text.muted} />
                <Text style={[styles.sinResultadosTitulo, { color: colors.text.primary }]}>
                  Sin disponibilidad
                </Text>
                <Text style={[styles.sinResultadosTexto, { color: colors.text.secondary }]}>
                  No hay habitaciones para las fechas y huéspedes seleccionados. Prueba con otras fechas.
                </Text>
              </AppCard>
            ) : (
              resultados.map((hab) => (
                <TouchableOpacity key={hab.habitacion_id} onPress={() => irADetalle(hab)} activeOpacity={0.9}>
                  <AppCard noPadding style={styles.habCard}>
                    {/* Imagen o placeholder */}
                    {hab.imagen_url ? (
                      <Image source={{ uri: hab.imagen_url }} style={styles.habImagen} />
                    ) : (
                      <View style={[styles.habImagenPlaceholder, { backgroundColor: colors.bg.tertiary }]}>
                        <Ionicons name="bed-outline" size={48} color={colors.gold.primary} />
                        <Text style={[styles.habImagenTipo, { color: colors.gold.primary }]}>
                          {hab.nombre_tipo}
                        </Text>
                      </View>
                    )}

                    <View style={styles.habInfo}>
                      <View style={styles.habHeader}>
                        <Text style={[styles.habTipo, { color: colors.text.primary }]}>
                          {hab.nombre_tipo}
                        </Text>
                        <Text style={[styles.habNumero, { color: colors.gold.primary }]}>
                          #{hab.numero}
                        </Text>
                      </View>

                      {hab.descripcion ? (
                        <Text style={[styles.habDesc, { color: colors.text.secondary }]} numberOfLines={2}>
                          {hab.descripcion}
                        </Text>
                      ) : null}

                      <View style={styles.habDetalles}>
                        <View style={[styles.habChip, { backgroundColor: colors.bg.tertiary }]}>
                          <Ionicons name="business-outline" size={11} color={colors.text.muted} />
                          <Text style={[styles.habChipText, { color: colors.text.secondary }]}>Piso {hab.piso}</Text>
                        </View>
                        <View style={[styles.habChip, { backgroundColor: colors.bg.tertiary }]}>
                          <Ionicons name="people-outline" size={11} color={colors.text.muted} />
                          <Text style={[styles.habChipText, { color: colors.text.secondary }]}>{hab.capacidad_adultos} adultos</Text>
                        </View>
                        <View style={[styles.habChip, { backgroundColor: colors.bg.tertiary }]}>
                          <Ionicons name="bed-outline" size={11} color={colors.text.muted} />
                          <Text style={[styles.habChipText, { color: colors.text.secondary }]}>{hab.numero_camas} cama{hab.numero_camas > 1 ? 's' : ''}</Text>
                        </View>
                        {hab.tipo_cama ? (
                          <View style={[styles.habChip, { backgroundColor: colors.bg.tertiary }]}>
                            <Text style={[styles.habChipText, { color: colors.text.secondary }]}>{hab.tipo_cama}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={[styles.habFooter, { borderTopColor: colors.border.primary }]}>
                        <View>
                          <Text style={[styles.precioLabel, { color: colors.text.muted }]}>Por noche</Text>
                          <Text style={[styles.precio, { color: colors.gold.primary }]}>
                            Bs. {Number(hab.precio).toFixed(2)}
                          </Text>
                          {noches > 0 && (
                            <Text style={[styles.precioTotal, { color: colors.text.secondary }]}>
                              Total: Bs. {(Number(hab.precio) * noches).toFixed(2)}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.btnReservar, { backgroundColor: colors.gold.primary }]}
                          onPress={() => irAReservar(hab)}
                        >
                          <Text style={[styles.btnReservarText, { color: colors.text.inverse }]}>Reservar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* key fuerza re-mount cuando cambia la fecha, para que el calendario refleje el nuevo valor */}
      <DatePickerModal
        key={`entrada-${fechaEntrada}`}
        visible={pickerEntrada}
        titulo="Fecha de entrada"
        valorActual={fechaEntrada}
        fechaMinima={formatearFecha(new Date())}
        onSeleccionar={(f) => { setFechaEntrada(f); }}
        onCerrar={() => setPickerEntrada(false)}
      />
      <DatePickerModal
        key={`salida-${fechaSalida}`}
        visible={pickerSalida}
        titulo="Fecha de salida"
        valorActual={fechaSalida}
        fechaMinima={sumarDias(fechaEntrada, 1)}
        onSeleccionar={setFechaSalida}
        onCerrar={() => setPickerSalida(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 40, gap: Spacing.md },
  buscador: { gap: Spacing.md },
  fechasRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fechaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm },
  fechaBtnLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fechaBtnValor: { fontSize: Typography.sm, fontWeight: '700', marginTop: 2 },
  nochesChip: { alignSelf: 'center', fontSize: Typography.sm, fontWeight: '700', borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  huespedesRow: { flexDirection: 'row', gap: Spacing.sm },
  contadorCard: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: Spacing.sm },
  contadorLabel: { fontSize: Typography.xs, fontWeight: '600' },
  contadorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contadorBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  contadorNum: { fontSize: Typography.lg, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  resultadosTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  sinResultados: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  sinResultadosTitulo: { fontSize: Typography.lg, fontWeight: '700' },
  sinResultadosTexto: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  habCard: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  habImagen: { width: '100%', height: 150, resizeMode: 'cover' },
  habImagenPlaceholder: { height: 150, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  habImagenTipo: { fontSize: Typography.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  habInfo: { padding: Spacing.md, gap: Spacing.sm },
  habHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habTipo: { fontSize: Typography.lg, fontWeight: '700' },
  habNumero: { fontSize: Typography.sm, fontWeight: '700' },
  habDesc: { fontSize: Typography.sm, lineHeight: 18 },
  habDetalles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  habChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  habChipText: { fontSize: 11 },
  habFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: Spacing.sm, borderTopWidth: 1 },
  precioLabel: { fontSize: 10, marginBottom: 2 },
  precio: { fontSize: Typography.xl, fontWeight: '800' },
  precioTotal: { fontSize: Typography.xs, marginTop: 2 },
  btnReservar: { borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 20 },
  btnReservarText: { fontWeight: '700', fontSize: Typography.sm },
});
