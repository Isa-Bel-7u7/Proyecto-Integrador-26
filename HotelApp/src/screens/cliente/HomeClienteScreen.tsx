// ============================================================
// PRINCIPIO SRP: esta pantalla solo orquesta la presentación
// del home del cliente. La lógica de datos está en clienteService.
//
// PRINCIPIO DIP: depende de clienteService (abstracción),
// no de supabase directamente.
//
// PRINCIPIO DRY: usa componentes comunes (AppCard, StatusBadge)
// en lugar de definir estilos locales equivalentes.
// ============================================================
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { obtenerDatosHome } from '../../services/clienteService';
import AppCard from '../../components/common/AppCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingScreen from '../../components/common/LoadingScreen';
import AppButton from '../../components/common/AppButton';
import HotelInfoModal from '../../components/common/HotelInfoModal';
import { BorderRadius, Spacing, Typography, ThemeColors } from '../../utils/theme';
import { HOTEL_ADDRESS, HOTEL_NAME } from '../../utils/hotelLinks';
import type { ClienteStackParamList, Reserva, Anuncio, ConfiguracionHotel } from '../../types';

type NavProp = NativeStackNavigationProp<ClienteStackParamList>;

// TIPO_ANUNCIO_LABEL sin emoji — solo texto conciso
const TIPO_ANUNCIO_LABEL: Record<string, string> = {
  evento: 'Evento', promocion: 'Promo', informativo: 'Info',
  novedad: 'Novedad', otro: 'Aviso',
};

function saludoHora(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// Formatea hora desde DB (puede ser "14:00:00", "14:00", 14, "2", etc.)
function formatHora(h: any): string {
  if (!h && h !== 0) return '—';
  const str = String(h).trim();
  if (str.includes(':')) return str.substring(0, 5); // "14:00:00" → "14:00"
  const num = parseInt(str, 10);
  if (isNaN(num)) return str;
  return `${String(num).padStart(2, '0')}:00`;      // 14 → "14:00"
}

// Reglas del hotel — misma info del chatbot de la web
const REGLAS_HOTEL = [
  { icon: 'wifi-outline',        texto: 'WiFi gratuito en todas las áreas del hotel' },
  { icon: 'ban-outline',         texto: 'No se admiten mascotas en las instalaciones' },
  { icon: 'flame-outline',       texto: 'Prohibido fumar en habitaciones y áreas internas' },
  { icon: 'water-outline',       texto: 'Piscina disponible: 08:00 – 20:00 h' },
  { icon: 'restaurant-outline',  texto: 'Desayuno buffet: 07:00-10:30 · Almuerzo: 12:00-15:00 · Cena: 19:00-22:30' },
  { icon: 'card-outline',        texto: 'Cancelación sin cargo hasta 48 h antes del check-in' },
  { icon: 'people-outline',      texto: 'El número de huéspedes no puede exceder la capacidad de la habitación' },
  { icon: 'volume-mute-outline', texto: 'Silencio en áreas comunes después de las 22:00 h' },
];

export default function HomeClienteScreen() {
  const navigation = useNavigation<NavProp>();
  const { perfil } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [sinLeer, setSinLeer]   = useState(0);
  const [config, setConfig]     = useState<ConfiguracionHotel | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hotelModal, setHotelModal] = useState(false);

  const cargar = useCallback(async () => {
    try {
      // DIP: toda la lógica de datos en clienteService
      const datos = await obtenerDatosHome();
      setReservas(datos.reservas.slice(0, 2));
      setSinLeer(datos.sinLeer);
      setConfig(datos.config);
      setAnuncios(datos.anuncios);
    } catch (e) {
      console.error('HomeCliente:', e);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  // Recarga cuando el tab vuelve al foco
  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const onRefresh = () => { setRefreshing(true); void cargar(); };

  const navTab = (screen: string) =>
    navigation.navigate('ClienteTabs', { screen } as any);

  if (cargando) return <LoadingScreen />;

  const primerNombre = perfil?.nombre_completo?.split(' ')[0] ?? 'Huésped';

  return (
    <ScrollView
      style={[s.container]}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.saludo}>{saludoHora()}</Text>
          <Text style={s.nombre}>{primerNombre}</Text>
        </View>
        <TouchableOpacity
          style={[s.notifBtn, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}
          onPress={() => navTab('Notificaciones')}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
          {sinLeer > 0 && (
            <View style={[s.notifDot, { backgroundColor: colors.status.error }]}>
              <Text style={s.notifDotText}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Banner hotel ────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => setHotelModal(true)}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel="Ver ubicación e información de Grand Hotel"
      >
      <AppCard goldBorder style={s.hotelCard}>
        <View style={s.hotelRow}>
          <View style={[s.hotelIconBox, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name="business-outline" size={28} color={colors.gold.primary} />
          </View>
          <View style={s.hotelInfo}>
            <Text style={[s.hotelNombre, { color: colors.text.primary }]}>
              {HOTEL_NAME}
            </Text>
            <View style={s.hotelUbicRow}>
              <Ionicons name="location-outline" size={12} color={colors.text.secondary} />
              <Text style={[s.hotelUbicacion, { color: colors.text.secondary }]}>
                {config?.direccion || [config?.ciudad, config?.pais].filter(Boolean).join(', ') || HOTEL_ADDRESS}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.gold.primary} />
        </View>
        <View style={[s.hotelHoras, { borderTopColor: colors.border.primary }]}>
          <View style={s.horaItem}>
            <Ionicons name="log-in-outline" size={14} color={colors.gold.primary} />
            <View>
              <Text style={[s.horaLabel, { color: colors.text.muted }]}>Check-in</Text>
              <Text style={[s.horaValor, { color: colors.gold.primary }]}>
                {formatHora(config?.hora_checkin) !== '—' ? formatHora(config?.hora_checkin) : '14:00'}
              </Text>
            </View>
          </View>
          <View style={[s.horaDivider, { backgroundColor: colors.border.primary }]} />
          <View style={s.horaItem}>
            <Ionicons name="log-out-outline" size={14} color={colors.gold.primary} />
            <View>
              <Text style={[s.horaLabel, { color: colors.text.muted }]}>Check-out</Text>
              <Text style={[s.horaValor, { color: colors.gold.primary }]}>
                {formatHora(config?.hora_checkout) !== '—' ? formatHora(config?.hora_checkout) : '12:00'}
              </Text>
            </View>
          </View>
        </View>
      </AppCard>
      </TouchableOpacity>

      {/* ── Accesos rápidos ──────────────────────────────── */}
      <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Accesos rápidos</Text>
      <View style={s.accionesGrid}>
        {[
          { icon: 'search-outline',        label: 'Buscar\nhabitación',  onPress: () => navTab('Buscar')         },
          { icon: 'calendar-outline',      label: 'Mis\nreservas',       onPress: () => navTab('MisReservas')    },
          { icon: 'notifications-outline', label: 'Notifi-\ncaciones',   onPress: () => navTab('Notificaciones'), badge: sinLeer },
          { icon: 'person-outline',        label: 'Mi\nperfil',          onPress: () => navTab('Perfil')         },
          { icon: 'megaphone-outline',     label: 'Avisos',              onPress: () => navigation.navigate('Avisos')    },
          { icon: 'heart-outline',         label: 'Favoritos',           onPress: () => navigation.navigate('Favoritos') },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[s.accionCard, {
              backgroundColor: colors.bg.secondary,
              borderColor:     colors.border.primary,
              borderTopColor:  colors.gold.primary,
            }]}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <Ionicons name={item.icon as any} size={26} color={colors.gold.primary} />
            <Text style={[s.accionLabel, { color: colors.text.primary }]}>{item.label}</Text>
            {item.badge && item.badge > 0 ? (
              <View style={[s.accionBadge, { backgroundColor: colors.status.error }]}>
                <Text style={s.accionBadgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Solicitar servicio ───────────────────────────── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('SolicitudServicio')}
        style={[s.servicioBtn, {
          backgroundColor: colors.bg.secondary,
          borderColor:     colors.border.primary,
        }]}
        activeOpacity={0.8}
      >
        <View style={[s.servicioBtnIcon, { backgroundColor: `${colors.gold.primary}18` }]}>
          <Ionicons name="apps-outline" size={22} color={colors.gold.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.servicioBtnTitulo, { color: colors.text.primary }]}>
            Solicitar servicio
          </Text>
          <Text style={[s.servicioBtnSubtitulo, { color: colors.text.secondary }]}>
            Gym, spa, masaje y más
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      </TouchableOpacity>

      {/* ── Anuncios ─────────────────────────────────────── */}
      {anuncios.length > 0 && (
        <View>
          <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Novedades</Text>
          {anuncios.map((a) => (
            <AppCard key={a.id} style={s.anuncioCard}>
              <View style={[s.anuncioAccent, { backgroundColor: colors.gold.primary }]} />
              <View style={s.anuncioBody}>
                <Text style={[s.anuncioTipo, { color: colors.gold.primary }]}>
                  {TIPO_ANUNCIO_LABEL[a.tipo] ?? 'Aviso'}
                </Text>
                <Text style={[s.anuncioTitulo, { color: colors.text.primary }]} numberOfLines={1}>
                  {a.titulo}
                </Text>
                {a.subtitulo && (
                  <Text style={[s.anuncioSub, { color: colors.text.secondary }]} numberOfLines={2}>
                    {a.subtitulo}
                  </Text>
                )}
                {a.fecha_fin && (
                  <View style={s.anuncioFechaRow}>
                    <Ionicons name="time-outline" size={11} color={colors.text.muted} />
                    <Text style={[s.anuncioFecha, { color: colors.text.muted }]}>
                      Hasta {a.fecha_fin}
                    </Text>
                  </View>
                )}
              </View>
            </AppCard>
          ))}
        </View>
      )}

      {/* ── Reservas activas ─────────────────────────────── */}
      <View style={s.seccionHeader}>
        <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Reservas activas</Text>
        <TouchableOpacity onPress={() => navTab('MisReservas')}>
          <Text style={[s.verTodas, { color: colors.gold.primary }]}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      {reservas.length > 0 ? (
        // key en View padre para evitar warning de lista sin key en ScrollView
        <View>
          {reservas.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => navigation.navigate('DetalleReserva', { reservaId: r.id })}
              activeOpacity={0.8}
              style={{ marginBottom: Spacing.sm }}
            >
              <AppCard>
                <View style={s.reservaRow}>
                  <View style={[s.reservaIconBox, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name="calendar-outline" size={20} color={colors.gold.primary} />
                  </View>
                  <View style={s.reservaInfo}>
                    <Text style={[s.reservaCodigo, { color: colors.text.primary }]}>
                      {r.codigo_reserva}
                    </Text>
                    <Text style={[s.reservaFechas, { color: colors.text.secondary }]}>
                      {r.fecha_entrada} — {r.fecha_salida}
                    </Text>
                    <Text style={[s.reservaTotal, { color: colors.gold.primary }]}>
                      Bs. {Number(r.total_estimado ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <StatusBadge estado={r.estado} small />
                </View>
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <AppCard style={s.sinReservasCard}>
          <Ionicons name="bed-outline" size={40} color={colors.text.muted} />
          <Text style={[s.sinReservasTitulo, { color: colors.text.primary }]}>
            Sin reservas activas
          </Text>
          <Text style={[s.sinReservasTexto, { color: colors.text.secondary }]}>
            Explora nuestras habitaciones y planifica tu próxima estadía
          </Text>
          <AppButton
            label="Buscar habitación"
            onPress={() => navTab('Buscar')}
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>
      )}

      {/* ── Reglas del hotel ─────────────────────────────── */}
      <Text style={[s.seccionTitulo, { color: colors.text.muted }]}>Reglas del hotel</Text>
      <AppCard>
        {REGLAS_HOTEL.map((r, i) => (
          <View key={r.icon + i}>
            <View style={s.reglaRow}>
              <View style={[s.reglaIconBox, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name={r.icon as any} size={16} color={colors.gold.primary} />
              </View>
              <Text style={[s.reglaTexto, { color: colors.text.secondary }]}>{r.texto}</Text>
            </View>
            {i < REGLAS_HOTEL.length - 1 && (
              <View style={[s.reglaDivider, { backgroundColor: colors.border.primary }]} />
            )}
          </View>
        ))}
        {config?.politica_cancelacion && (
          <View>
            <View style={[s.reglaDivider, { backgroundColor: colors.border.primary }]} />
            <View style={s.reglaRow}>
              <View style={[s.reglaIconBox, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.gold.primary} />
              </View>
              <Text style={[s.reglaTexto, { color: colors.text.secondary }]}>
                {config.politica_cancelacion}
              </Text>
            </View>
          </View>
        )}
      </AppCard>
      <HotelInfoModal visible={hotelModal} sitioWeb={config?.sitio_web} onCerrar={() => setHotelModal(false)} />
    </ScrollView>
  );
}

// DRY: factory de estilos dependiente del tema evita duplicación en cada render
const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: Spacing.md, paddingTop: 56, paddingBottom: 32, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  saludo: { fontSize: Typography.sm, color: colors.text.secondary },
  nombre: { fontSize: Typography.xl, fontWeight: '700', color: colors.text.primary, marginTop: 2 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  notifDot: { position: 'absolute', top: 5, right: 5, borderRadius: 8, minWidth: 15, height: 15, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  // Hotel card
  hotelCard: { marginBottom: Spacing.sm },
  hotelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  hotelIconBox: { width: 52, height: 52, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  hotelInfo: { flex: 1 },
  hotelNombre: { fontSize: Typography.lg, fontWeight: '700', marginBottom: 4 },
  hotelUbicRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hotelUbicacion: { fontSize: Typography.xs },
  hotelHoras: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1 },
  horaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  horaLabel: { fontSize: 10, marginBottom: 2 },
  horaValor: { fontSize: Typography.md, fontWeight: '700' },
  horaDivider: { width: 1, height: 30, marginHorizontal: Spacing.md },
  // Secciones
  seccionTitulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 0 },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verTodas: { fontSize: Typography.sm, fontWeight: '600' },
  // Acciones
  accionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  accionCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, width: '47.5%', borderTopWidth: 2, alignItems: 'center', borderWidth: 1, position: 'relative', gap: Spacing.sm },
  accionLabel: { fontSize: Typography.sm, textAlign: 'center', fontWeight: '600', lineHeight: 17 },
  accionBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  accionBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  // Anuncios
  anuncioCard: { flexDirection: 'row', padding: 0, overflow: 'hidden', marginTop: 0 },
  anuncioAccent: { width: 3 },
  anuncioBody: { flex: 1, padding: Spacing.md, gap: 3 },
  anuncioTipo: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  anuncioTitulo: { fontSize: Typography.md, fontWeight: '700' },
  anuncioSub: { fontSize: Typography.sm, lineHeight: 18 },
  anuncioFechaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  anuncioFecha: { fontSize: Typography.xs },
  // Reservas
  reservaCard: { marginTop: 0 },
  reservaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reservaIconBox: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  reservaInfo: { flex: 1 },
  reservaCodigo: { fontSize: Typography.md, fontWeight: '700', marginBottom: 2 },
  reservaFechas: { fontSize: Typography.xs, marginBottom: 2 },
  reservaTotal: { fontSize: Typography.sm, fontWeight: '600' },
  // Sin reservas
  sinReservasCard: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  sinReservasTitulo: { fontSize: Typography.lg, fontWeight: '700' },
  sinReservasTexto: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  // Solicitar servicio
  servicioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md,
  },
  servicioBtnIcon:     { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  servicioBtnTitulo:   { fontSize: Typography.md, fontWeight: '700' },
  servicioBtnSubtitulo:{ fontSize: Typography.xs, marginTop: 2 },
  // Reglas
  reglaRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm },
  reglaIconBox: { width: 32, height: 32, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  reglaTexto:   { fontSize: Typography.sm, flex: 1, lineHeight: 19 },
  reglaDivider: { height: 1 },
});
