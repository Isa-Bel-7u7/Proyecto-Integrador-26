// SRP: pantalla de detalle de habitación — presentación e inicio de reserva.
// DIP: usa buscarHabitacionesDisponibles(), obtenerServiciosHabitacion(),
//      verificarFavorito(), toggleFavorito() de clienteService.
// DRY: colores desde useTheme(), makeStyles. ICONO_SERVICIO centraliza iconos.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  buscarHabitacionesDisponibles,
  obtenerServiciosHabitacion,
  obtenerImagenesHabitaciones,
  verificarFavorito,
  toggleFavorito,
  IMAGEN_FALLBACK,
  IMAGEN_DEFAULT,
} from '../../services/clienteService';
import ScreenHeader from '../../components/common/ScreenHeader';
import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import type { ClienteStackParamList, HabitacionDisponible } from '../../types';

type RouteProps = RouteProp<ClienteStackParamList, 'DetalleHabitacion'>;
type NavProp   = NativeStackNavigationProp<ClienteStackParamList>;

interface ServicioHabitacion {
  id: string; nombre: string; tipo: string; precio: number; incluido: boolean;
}

// OCP: agregar servicios no requiere modificar el renderizado
const ICONO_SERVICIO: Record<string, string> = {
  'WiFi':                  'wifi-outline',
  'Desayuno':              'cafe-outline',
  'Parqueo':               'car-outline',
  'Televisión por cable':  'tv-outline',
  'Aire acondicionado':    'snow-outline',
  'Lavandería':            'shirt-outline',
  'Room Service':          'restaurant-outline',
  'Piscina':               'water-outline',
  'Gimnasio':              'fitness-outline',
  'Spa':                   'flower-outline',
};

export default function DetalleHabitacionScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteProps>();
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const { habitacionId, fechaEntrada, fechaSalida, adultos = 1, ninos = 0 } = route.params;

  const [habitacion, setHabitacion]       = useState<HabitacionDisponible | null>(null);
  const [servicios, setServicios]         = useState<ServicioHabitacion[]>([]);
  const [imagenUrl, setImagenUrl]         = useState<string | null>(null);
  const [cargando, setCargando]           = useState(true);
  const [esFavorito, setEsFavorito]       = useState(false);
  const [toggleandoFav, setToggleandoFav] = useState(false);

  const noches = Math.max(1, Math.ceil(
    (new Date(fechaSalida).getTime() - new Date(fechaEntrada).getTime()) / 86400000
  ));

  useEffect(() => { void cargar(); }, []);

  useEffect(() => {
    if (perfil?.cliente_id) {
      verificarFavorito(perfil.cliente_id, habitacionId)
        .then(setEsFavorito)
        .catch(() => {});
    }
  }, [perfil?.cliente_id]);

  const cargar = async () => {
    try {
      const lista = await buscarHabitacionesDisponibles({
        entrada: fechaEntrada,
        salida:  fechaSalida,
      });
      const hab = lista.find(
        (h) => h.habitacion_id === habitacionId || h.id === habitacionId
      );
      setHabitacion(hab ?? null);
      if (hab) {
        const [svcs, imgs] = await Promise.all([
          obtenerServiciosHabitacion(habitacionId),
          obtenerImagenesHabitaciones([habitacionId]),
        ]);
        setServicios(svcs);
        // portada real → fallback por tipo → default
        setImagenUrl(
          imgs[habitacionId]
          ?? IMAGEN_FALLBACK[hab.nombre_tipo]
          ?? IMAGEN_DEFAULT
        );
      }
    } catch (e) {
      console.error('DetalleHabitacion:', e);
    } finally {
      setCargando(false);
    }
  };

  const handleToggleFavorito = async () => {
    if (!perfil?.cliente_id) {
      Alert.alert('Perfil incompleto', 'Completa tu perfil para guardar favoritos.');
      return;
    }
    setToggleandoFav(true);
    try {
      const nuevo = await toggleFavorito({ habitacionId, esFavorito });
      setEsFavorito(nuevo);
    } catch (e) {
      console.error('toggleFavorito:', e);
    } finally {
      setToggleandoFav(false);
    }
  };

  if (cargando) return <LoadingScreen />;

  if (!habitacion) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
        <ScreenHeader titulo="Habitación" mostrarBack />
        <View style={s.centro}>
          <Ionicons name="bed-outline" size={48} color={colors.text.muted} />
          <Text style={[s.errorText, { color: colors.text.secondary }]}>
            Habitación no disponible para las fechas seleccionadas.
          </Text>
          <AppButton label="Volver" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </View>
    );
  }

  const total  = habitacion.precio * noches;
  const moneda = habitacion.moneda ?? 'BOB';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScreenHeader titulo={habitacion.nombre_tipo} mostrarBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Imagen ── */}
        <View style={[s.imagenContainer, { backgroundColor: colors.bg.tertiary }]}>
          {imagenUrl ? (
            <Image
              source={{ uri: imagenUrl }}
              style={s.imagen}
              resizeMode="cover"
            />
          ) : (
            <View style={s.imagenPlaceholder}>
              <Ionicons name="bed-outline" size={64} color={colors.text.muted} />
              <Text style={[s.imagenPlaceholderText, { color: colors.text.muted }]}>
                {habitacion.nombre_tipo}
              </Text>
            </View>
          )}
          <View style={[s.disponibleBadge, { backgroundColor: colors.status.successBg }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.status.success} />
            <Text style={[s.disponibleText, { color: colors.status.success }]}>Disponible</Text>
          </View>
          <TouchableOpacity
            style={[s.favBtn, { backgroundColor: colors.bg.overlay }]}
            onPress={handleToggleFavorito}
            disabled={toggleandoFav}
          >
            <Ionicons
              name={esFavorito ? 'heart' : 'heart-outline'}
              size={20}
              color={esFavorito ? '#ef4444' : colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ── Info principal ── */}
        <View style={s.infoHeader}>
          <View style={{ flex: 1 }}>
            {/* nombre_tipo — NO tipo_habitacion (no existe en el RPC) */}
            <Text style={[s.tipoHabitacion, { color: colors.text.primary }]}>
              {habitacion.nombre_tipo}
            </Text>
            <Text style={[s.numeroHabitacion, { color: colors.text.secondary }]}>
              Habitación #{habitacion.numero} — Piso {habitacion.piso}
            </Text>
          </View>
          <View style={s.precioBox}>
            <Text style={[s.precioPorNoche, { color: colors.text.muted }]}>por noche</Text>
            {/* precio — NO precio_noche (no existe en el RPC) */}
            <Text style={[s.precio, { color: colors.gold.primary }]}>{habitacion.precio}</Text>
            <Text style={[s.moneda, { color: colors.text.secondary }]}>{moneda}</Text>
          </View>
        </View>

        {/* ── Descripción ── */}
        {/* descripcion — NO descripcion_tipo (no existe en el RPC) */}
        {habitacion.descripcion && (
          <>
            <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Descripción</Text>
            <AppCard>
              <Text style={[s.descripcion, { color: colors.text.secondary }]}>
                {habitacion.descripcion}
              </Text>
            </AppCard>
          </>
        )}

        {/* ── Características ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Características</Text>
        <AppCard>
          <View style={s.caracGrid}>
            {[
              { icon: 'people-outline',   label: 'Adultos', valor: habitacion.capacidad_adultos },
              { icon: 'happy-outline',    label: 'Niños',   valor: habitacion.capacidad_ninos ?? 0 },
              { icon: 'bed-outline',      label: 'Camas',   valor: habitacion.numero_camas },
              { icon: 'business-outline', label: 'Piso',    valor: habitacion.piso },
            ].map((c) => (
              <View key={c.label} style={[s.caracItem, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name={c.icon as any} size={20} color={colors.gold.primary} />
                <Text style={[s.caracValor, { color: colors.text.primary }]}>{c.valor}</Text>
                <Text style={[s.caracLabel, { color: colors.text.muted }]}>{c.label}</Text>
              </View>
            ))}
          </View>
          {habitacion.tipo_cama && (
            <View style={[s.tipoCamaRow, { borderTopColor: colors.border.primary }]}>
              <Text style={[s.tipoCamaLabel, { color: colors.text.secondary }]}>
                Tipo de cama
              </Text>
              <Text style={[s.tipoCamaValor, { color: colors.text.primary }]}>
                {habitacion.tipo_cama}
              </Text>
            </View>
          )}
        </AppCard>

        {/* ── Servicios ── */}
        {servicios.length > 0 && (
          <>
            <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Servicios</Text>
            <AppCard>
              {servicios.map((sv, i) => {
                const icono = ICONO_SERVICIO[sv.nombre] ?? 'star-outline';
                return (
                  <View key={sv.id || i}>
                    <View style={s.servicioRow}>
                      <View style={[s.servicioIconBox, { backgroundColor: colors.bg.tertiary }]}>
                        <Ionicons name={icono as any} size={16} color={colors.gold.primary} />
                      </View>
                      <Text style={[s.servicioNombre, { color: colors.text.primary }]}>
                        {sv.nombre}
                      </Text>
                      {sv.incluido ? (
                        <View style={[s.incluidoBadge, { backgroundColor: colors.status.successBg }]}>
                          <Text style={[s.incluidoText, { color: colors.status.success }]}>
                            Incluido
                          </Text>
                        </View>
                      ) : (
                        <Text style={[s.servicioPrecio, { color: colors.gold.primary }]}>
                          +{sv.precio} {moneda}
                        </Text>
                      )}
                    </View>
                    {i < servicios.length - 1 && (
                      <View style={[s.divider, { backgroundColor: colors.border.primary }]} />
                    )}
                  </View>
                );
              })}
            </AppCard>
          </>
        )}

        {/* ── Tu búsqueda ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Tu búsqueda</Text>
        <AppCard>
          <View style={s.busquedaRow}>
            {[
              { icon: 'people-outline', texto: `${adultos} adulto${adultos > 1 ? 's' : ''}` },
              ...(ninos > 0 ? [{ icon: 'happy-outline', texto: `${ninos} niño${ninos > 1 ? 's' : ''}` }] : []),
            ].map((b) => (
              <View key={b.texto} style={[s.busquedaChip, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name={b.icon as any} size={13} color={colors.text.secondary} />
                <Text style={[s.busquedaChipText, { color: colors.text.secondary }]}>
                  {b.texto}
                </Text>
              </View>
            ))}
          </View>
        </AppCard>

        {/* ── Fechas y total ── */}
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Tu estadía</Text>
        <AppCard goldBorder>
          <View style={s.fechasRow}>
            <View style={s.fechaBox}>
              <Ionicons name="log-in-outline" size={16} color={colors.gold.primary} />
              <Text style={[s.fechaLabel, { color: colors.text.muted }]}>Check-in</Text>
              <Text style={[s.fechaValor, { color: colors.text.primary }]}>{fechaEntrada}</Text>
            </View>
            <Ionicons name="arrow-forward-outline" size={20} color={colors.gold.primary} />
            <View style={s.fechaBox}>
              <Ionicons name="log-out-outline" size={16} color={colors.gold.primary} />
              <Text style={[s.fechaLabel, { color: colors.text.muted }]}>Check-out</Text>
              <Text style={[s.fechaValor, { color: colors.text.primary }]}>{fechaSalida}</Text>
            </View>
          </View>
          <View style={[s.totalBox, { backgroundColor: colors.bg.tertiary }]}>
            <View>
              <Text style={[s.nochesText, { color: colors.text.primary }]}>
                {noches} noche{noches !== 1 ? 's' : ''}
              </Text>
              <Text style={[s.calculoText, { color: colors.text.muted }]}>
                {habitacion.precio} × {noches}
              </Text>
            </View>
            <Text style={[s.totalValor, { color: colors.gold.primary }]}>
              {total.toFixed(2)} {moneda}
            </Text>
          </View>
        </AppCard>

        <AppButton
          label={`Reservar — ${total.toFixed(2)} ${moneda}`}
          onPress={() =>
            navigation.navigate('CrearReserva', {
              habitacionId,
              fechaEntrada,
              fechaSalida,
              adultos,
              ninos,
            })
          }
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  errorText: { fontSize: Typography.md, textAlign: 'center' },
  imagenContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
  },
  imagen: { width: '100%', height: '100%' },
  imagenPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  imagenPlaceholderText: { fontSize: Typography.sm, fontWeight: '600' },
  disponibleBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  disponibleText: { fontSize: Typography.xs, fontWeight: '700' },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    borderRadius: 20,
    padding: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tipoHabitacion:  { fontSize: Typography.xl, fontWeight: '700', marginBottom: 4 },
  numeroHabitacion: { fontSize: Typography.sm },
  precioBox: { alignItems: 'flex-end' },
  precioPorNoche: { fontSize: 10, marginBottom: 2 },
  precio: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  moneda: { fontSize: Typography.xs },
  seccionTitulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  descripcion: { fontSize: Typography.sm, lineHeight: 22 },
  caracGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  caracItem: {
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 4,
    minWidth: 64,
  },
  caracValor: { fontSize: Typography.lg, fontWeight: '700' },
  caracLabel: { fontSize: 10 },
  tipoCamaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  tipoCamaLabel: { fontSize: Typography.sm },
  tipoCamaValor: { fontSize: Typography.sm, fontWeight: '600' },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  servicioIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicioNombre: { flex: 1, fontSize: Typography.sm },
  incluidoBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  incluidoText:  { fontSize: 11, fontWeight: '700' },
  servicioPrecio: { fontSize: Typography.sm, fontWeight: '600' },
  divider: { height: 1 },
  busquedaRow: { flexDirection: 'row', gap: Spacing.sm },
  busquedaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  busquedaChipText: { fontSize: Typography.sm },
  fechasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  fechaBox:   { alignItems: 'center', gap: 4 },
  fechaLabel: { fontSize: 10 },
  fechaValor: { fontSize: Typography.md, fontWeight: '700' },
  totalBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nochesText:  { fontSize: Typography.md, fontWeight: '700', marginBottom: 2 },
  calculoText: { fontSize: Typography.xs },
  totalValor:  { fontSize: Typography.xl, fontWeight: '800' },
});
