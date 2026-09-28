import React, { useCallback, useMemo, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import AppCard from '../../components/common/AppCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import type { AdminHabitacion, AdminIncidencia, AdminReserva, AdminTareaHousekeeping } from '../../interfaces';
import {
  adjuntarFotoIncidenciaAdministrador,
  aprobarLimpiezaAdministrador,
  cambiarEstadoHabitacionAdministrador,
  crearIncidenciaHabitacionAdministrador,
  crearTareaLimpiezaAdministrador,
  obtenerHabitacionesAdministrador,
  obtenerIncidenciasAdministrador,
  obtenerProximasReservasHabitacionAdministrador,
  obtenerReservasAdministrador,
  obtenerTareasHousekeepingAdministrador,
} from '../../services/adminService';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

const ESTADOS = ['disponible', 'ocupada', 'reservada', 'sucia', 'limpieza', 'revision', 'mantenimiento', 'bloqueada', 'fuera_servicio'];
const ESTADOS_CAMBIO = ['disponible', 'limpieza', 'mantenimiento', 'fuera_servicio', 'bloqueada'];
const ACTIVOS = ['pendiente', 'asignada', 'en_proceso', 'completada'];
const AREAS_INCIDENCIA = ['Recepción', 'Lobby', 'Pasillo', 'Restaurante', 'Piscina', 'Parqueo', 'Ascensor', 'Lavandería', 'Otro'];
type MensajeHabitacion = { titulo: string; mensaje: string; tipo?: 'ok' | 'error' | 'warning' | 'info' } | null;
type ConfirmacionHabitacion = { titulo: string; mensaje: string; accion: () => Promise<void> | void; peligro?: boolean } | null;
type UbicacionIncidencia = 'habitacion' | 'area';
const normalizar = (texto?: string | null) => (texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fechaHoy = () => new Date().toISOString().slice(0, 10);
const fechaBonita = (fecha?: string | null) => fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : '—';

export default function AdminRoomsScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const [habitaciones, setHabitaciones] = useState<AdminHabitacion[]>([]);
  const [reservas, setReservas] = useState<AdminReserva[]>([]);
  const [incidencias, setIncidencias] = useState<AdminIncidencia[]>([]);
  const [tareas, setTareas] = useState<AdminTareaHousekeeping[]>([]);
  const [historial, setHistorial] = useState<AdminReserva[]>([]);
  const [filtro, setFiltro] = useState(route.params?.filtro ?? 'todas');
  const [piso, setPiso] = useState<number | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<AdminHabitacion | null>(null);
  const [selectorEstado, setSelectorEstado] = useState(false);
  const [modalMantenimiento, setModalMantenimiento] = useState(false);
  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [incidenciaUbicacion, setIncidenciaUbicacion] = useState<UbicacionIncidencia>('habitacion');
  const [incidenciaHabitacionId, setIncidenciaHabitacionId] = useState('');
  const [incidenciaArea, setIncidenciaArea] = useState('Recepción');
  const [incidenciaOtroLugar, setIncidenciaOtroLugar] = useState('');
  const [incidenciaTitulo, setIncidenciaTitulo] = useState('');
  const [incidenciaDescripcion, setIncidenciaDescripcion] = useState('');
  const [incidenciaPrioridad, setIncidenciaPrioridad] = useState<'baja' | 'media' | 'alta' | 'critica'>('media');
  const [motivoMantenimiento, setMotivoMantenimiento] = useState('');
  const [prioridadMantenimiento, setPrioridadMantenimiento] = useState<'baja' | 'media' | 'alta' | 'critica'>('media');
  const [fotoMantenimiento, setFotoMantenimiento] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [mensaje, setMensaje] = useState<MensajeHabitacion>(null);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionHabitacion>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setError('');
      const [h, r, i, t] = await Promise.all([
        obtenerHabitacionesAdministrador(),
        obtenerReservasAdministrador().catch(() => []),
        obtenerIncidenciasAdministrador().catch(() => []),
        obtenerTareasHousekeepingAdministrador().catch(() => []),
      ]);
      setHabitaciones(h);
      setReservas(r);
      setIncidencias(i);
      setTareas(t);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar Hotel en vivo.');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (route.params?.filtro) setFiltro(route.params.filtro);
    void cargar();
  }, [cargar, route.params?.filtro]));

  const pisos = useMemo(() => [...new Set(habitaciones.map((h) => h.piso))].sort((a, b) => a - b), [habitaciones]);
  const relacionaHabitacion = (habitacion: AdminHabitacion, item: { habitacion_id?: string | null; habitacion_numero?: string | null; habitacion_num?: string | null }) =>
    item.habitacion_id === habitacion.id || item.habitacion_numero === habitacion.numero || item.habitacion_num === habitacion.numero;

  const getReservaActual = (habitacion: AdminHabitacion) => reservas.find((r) => {
    const estado = normalizar(r.estado);
    const hoy = fechaHoy();
    return relacionaHabitacion(habitacion, r) && (['en_estadia', 'hospedado'].includes(estado) || (r.fecha_entrada <= hoy && r.fecha_salida >= hoy && !['cancelada', 'finalizada'].includes(estado)));
  });
  const getProximaReserva = (habitacion: AdminHabitacion) => reservas
    .filter((r) => relacionaHabitacion(habitacion, r) && r.fecha_entrada >= fechaHoy() && !['cancelada', 'finalizada'].includes(normalizar(r.estado)))
    .sort((a, b) => a.fecha_entrada.localeCompare(b.fecha_entrada))[0];
  const getTareaActiva = (habitacion: AdminHabitacion) => tareas.find((t) => relacionaHabitacion(habitacion, t) && ACTIVOS.includes(normalizar(t.estado)));
  const getIncidenciaActiva = (habitacion: AdminHabitacion) => incidencias.find((i) => relacionaHabitacion(habitacion, i) && !['resuelta', 'cerrada'].includes(normalizar(i.estado)));

  const estadoVisual = (estadoRaw: string) => {
    const estado = normalizar(estadoRaw);
    if (estado.includes('dispon')) return { color: colors.status.success, bg: colors.status.successBg, label: 'Disponible', icon: 'checkmark-circle-outline' as const };
    if (estado.includes('ocup')) return { color: colors.status.error, bg: colors.status.errorBg, label: 'Ocupada', icon: 'person-outline' as const };
    if (estado.includes('suci') || estado.includes('pend')) return { color: colors.status.warning, bg: colors.status.warningBg, label: 'Pendiente', icon: 'alert-circle-outline' as const };
    if (estado.includes('limpieza') || estado.includes('limpi')) return { color: colors.status.info, bg: `${colors.status.info}18`, label: 'En limpieza', icon: 'sparkles-outline' as const };
    if (estado.includes('manten') || estado.includes('bloque')) return { color: colors.text.muted, bg: `${colors.text.muted}18`, label: 'Mantenimiento', icon: 'construct-outline' as const };
    if (estado.includes('revision') || estado.includes('revis')) return { color: '#a06ad4', bg: '#a06ad422', label: 'En revisión', icon: 'search-outline' as const };
    return { color: colors.gold.primary, bg: `${colors.gold.primary}18`, label: estadoRaw, icon: 'bed-outline' as const };
  };

  const visibles = useMemo(() => habitaciones.filter((h) => {
    const estado = normalizar(h.estado);
    const pasaPiso = piso === 'todos' || h.piso === piso;
    const pasaFiltro = filtro === 'todas' || estado.includes(normalizar(filtro));
    const q = normalizar(busqueda.trim());
    const reservaActual = getReservaActual(h);
    const proximaReserva = getProximaReserva(h);
    const incidencia = getIncidenciaActiva(h);
    const tarea = getTareaActiva(h);
    const pasaBusqueda = !q || [
      h.numero,
      `piso ${h.piso}`,
      h.estado,
      h.tipos_habitacion?.nombre,
      reservaActual?.cliente_nombre,
      reservaActual?.codigo_reserva,
      proximaReserva?.cliente_nombre,
      proximaReserva?.codigo_reserva,
      incidencia?.titulo,
      incidencia?.codigo,
      tarea?.codigo,
      tarea?.personal_nombre,
    ].some((v) => normalizar(v).includes(q));
    return pasaPiso && pasaFiltro && pasaBusqueda;
  }), [busqueda, filtro, habitaciones, piso, reservas, incidencias, tareas]);

  const porPiso = useMemo(() => visibles.reduce<Record<string, AdminHabitacion[]>>((acc, h) => {
    const key = String(h.piso);
    acc[key] = [...(acc[key] ?? []), h].sort((a, b) => a.numero.localeCompare(b.numero));
    return acc;
  }, {}), [visibles]);

  const abrirDetalle = async (habitacion: AdminHabitacion) => {
    setSeleccionada(habitacion);
    setHistorial([]);
    obtenerProximasReservasHabitacionAdministrador(habitacion.id).then(setHistorial).catch(() => setHistorial([]));
  };

  const mostrarMensaje = (titulo: string, mensajeTexto: string, tipo: NonNullable<MensajeHabitacion>['tipo'] = 'info') => {
    setMensaje({ titulo, mensaje: mensajeTexto, tipo });
  };

  const pedirConfirmacion = (titulo: string, mensajeTexto: string, accion: () => Promise<void> | void, peligro = false) => {
    setConfirmacion({ titulo, mensaje: mensajeTexto, accion, peligro });
  };

  const ejecutar = async (habitacion: AdminHabitacion, accion: string, fn: () => Promise<void>) => {
    setProcesando(accion);
    try {
      await fn();
      await cargar();
      const actualizada = habitaciones.find((h) => h.id === habitacion.id) ?? habitacion;
      setSeleccionada({ ...actualizada });
      mostrarMensaje('Acción completada', `Habitación ${habitacion.numero} actualizada correctamente.`, 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo completar', e.message ?? 'Inténtalo nuevamente.', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const confirmarEstado = (habitacion: AdminHabitacion, estado: string) => {
    const sensible = ['disponible', 'mantenimiento', 'fuera_servicio', 'bloqueada'].includes(estado)
      || ['mantenimiento', 'fuera_servicio', 'bloqueada'].includes(habitacion.estado);
    const accion = () => ejecutar(
      habitacion,
      `estado-${estado}`,
      async () => {
        await cambiarEstadoHabitacionAdministrador(habitacion.id, estado, `Cambio manual desde Hotel en vivo: ${habitacion.estado} → ${estado}`);
        setSeleccionada((prev) => prev?.id === habitacion.id ? { ...prev, estado } : prev);
      },
    );
    if (sensible) {
      pedirConfirmacion(
        `Cambiar habitación ${habitacion.numero}`,
        `Vas a cambiar el estado de "${habitacion.estado}" a "${estado}". Este cambio puede afectar disponibilidad, reservas y auditoría.`,
        accion,
        ['mantenimiento', 'fuera_servicio', 'bloqueada'].includes(estado),
      );
      return;
    }
    void accion();
  };

  const seleccionarFotoMantenimiento = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled) setFotoMantenimiento(result.assets[0]);
  };

  const abrirMantenimiento = () => {
    setMotivoMantenimiento('');
    setPrioridadMantenimiento('media');
    setFotoMantenimiento(null);
    setModalMantenimiento(true);
  };

  const abrirIncidencia = () => {
    setIncidenciaUbicacion('habitacion');
    setIncidenciaHabitacionId(seleccionada?.id ?? '');
    setIncidenciaArea('Recepción');
    setIncidenciaOtroLugar('');
    setIncidenciaTitulo(seleccionada ? `Incidencia habitación ${seleccionada.numero}` : '');
    setIncidenciaDescripcion('');
    setIncidenciaPrioridad('media');
    setModalIncidencia(true);
  };

  const guardarIncidencia = async () => {
    const habitacionElegida = habitaciones.find((h) => h.id === incidenciaHabitacionId);
    const lugar = incidenciaUbicacion === 'habitacion'
      ? habitacionElegida ? `Piso ${habitacionElegida.piso}, habitación ${habitacionElegida.numero}` : ''
      : incidenciaArea === 'Otro' ? incidenciaOtroLugar.trim() : incidenciaArea;
    if (!lugar) {
      mostrarMensaje('Ubicación requerida', 'Selecciona una habitación o escribe el lugar exacto de la incidencia.', 'warning');
      return;
    }
    if (!incidenciaTitulo.trim()) {
      mostrarMensaje('Título requerido', 'Escribe un título corto para identificar la incidencia.', 'warning');
      return;
    }
    setProcesando('incidencia');
    try {
      await crearIncidenciaHabitacionAdministrador({
        habitacionId: incidenciaUbicacion === 'habitacion' ? habitacionElegida?.id ?? null : null,
        numero: incidenciaUbicacion === 'habitacion' ? habitacionElegida?.numero : undefined,
        estadoHabitacion: incidenciaUbicacion === 'habitacion' ? habitacionElegida?.estado : undefined,
        titulo: incidenciaTitulo.trim(),
        descripcion: [incidenciaDescripcion.trim(), `Ubicación: ${lugar}`].filter(Boolean).join('\n'),
        prioridad: incidenciaPrioridad,
        areaAfectada: incidenciaUbicacion === 'habitacion' ? 'Habitaciones' : lugar,
      });
      await cargar();
      setModalIncidencia(false);
      mostrarMensaje('Incidencia creada', `Se registró la incidencia en ${lugar}.`, 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo crear la incidencia', e.message ?? 'Inténtalo nuevamente.', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const enviarMantenimiento = async () => {
    if (!seleccionada) return;
    if (!motivoMantenimiento.trim()) {
      mostrarMensaje('Motivo requerido', 'Registra el motivo para enviar la habitación a mantenimiento.', 'warning');
      return;
    }
    setProcesando('mantenimiento');
    try {
      const motivo = `Mantenimiento (${prioridadMantenimiento}): ${motivoMantenimiento.trim()}`;
      await cambiarEstadoHabitacionAdministrador(seleccionada.id, 'mantenimiento', motivo);
      const incidenciaId = await crearIncidenciaHabitacionAdministrador({
        habitacionId: seleccionada.id,
        numero: seleccionada.numero,
        estadoHabitacion: seleccionada.estado,
        titulo: `Mantenimiento habitación ${seleccionada.numero}`,
        descripcion: `${motivo}. Reportado desde el módulo de habitaciones del administrador.`,
        prioridad: prioridadMantenimiento,
      });
      if (fotoMantenimiento && incidenciaId) {
        await adjuntarFotoIncidenciaAdministrador({
          incidenciaId,
          uri: fotoMantenimiento.uri,
          fileName: fotoMantenimiento.fileName,
          mimeType: fotoMantenimiento.mimeType,
        });
      }
      await cargar();
      setModalMantenimiento(false);
      setSeleccionada((prev) => prev ? { ...prev, estado: 'mantenimiento', motivo_mantenimiento: motivo } : prev);
      mostrarMensaje(
        'Habitación en mantenimiento',
        fotoMantenimiento && !incidenciaId
          ? 'Se cambió el estado y se creó la incidencia. La foto no se adjuntó porque la base no devolvió el id de la incidencia.'
          : 'La habitación quedó bloqueada para reservas y se registró la incidencia de mantenimiento.',
        'ok',
      );
    } catch (e: any) {
      mostrarMensaje('No se pudo enviar a mantenimiento', e.message ?? 'Inténtalo nuevamente.', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const tareaSeleccionada = seleccionada ? getTareaActiva(seleccionada) : null;
  const reservaActual = seleccionada ? getReservaActual(seleccionada) : null;
  const proximaReserva = seleccionada ? getProximaReserva(seleccionada) : null;
  const incidenciaActiva = seleccionada ? getIncidenciaActiva(seleccionada) : null;

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>HOTEL EN VIVO</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Tablero de habitaciones</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Estado operativo por pisos, tareas e incidencias</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
          <Ionicons name="search-outline" size={17} color={colors.text.muted} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar habitación, piso, huésped, tarea..."
            placeholderTextColor={colors.text.muted}
            style={[styles.searchInput, { color: colors.text.primary }]}
          />
          {busqueda ? (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {['todas', ...ESTADOS].map((estado) => (
            <TouchableOpacity key={estado} onPress={() => setFiltro(estado)} style={[
              styles.filter,
              { borderColor: filtro === estado ? colors.gold.primary : colors.border.primary, backgroundColor: filtro === estado ? `${colors.gold.primary}18` : colors.bg.secondary },
            ]}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.filterText, { color: filtro === estado ? colors.gold.primary : colors.text.muted }]}
              >
                {estado.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floorFilters}>
          {(['todos', ...pisos] as (number | 'todos')[]).map((item) => (
            <TouchableOpacity key={String(item)} onPress={() => setPiso(item)} style={[
              styles.floorFilter,
              { borderColor: piso === item ? colors.gold.primary : colors.border.primary, backgroundColor: piso === item ? `${colors.gold.primary}18` : 'transparent' },
            ]}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.filterText, { color: piso === item ? colors.gold.primary : colors.text.muted }]}
              >
                {item === 'todos' ? 'Todos los pisos' : `Piso ${item}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}>
        {error ? <Text style={[styles.message, { color: colors.status.error }]}>{error}</Text> : null}
        {!error && Object.keys(porPiso).length === 0 ? <Text style={[styles.message, { color: colors.text.muted }]}>No hay habitaciones con este filtro.</Text> : null}
        {Object.entries(porPiso).map(([pisoKey, items]) => (
          <View key={pisoKey} style={styles.floorBlock}>
            <Text style={[styles.floorTitle, { color: colors.text.primary }]}>Piso {pisoKey}</Text>
            <View style={styles.grid}>
              {items.map((habitacion) => {
                const visual = estadoVisual(habitacion.estado);
                const tarea = getTareaActiva(habitacion);
                const inc = getIncidenciaActiva(habitacion);
                const huesped = getReservaActual(habitacion);
                return (
                  <TouchableOpacity key={habitacion.id} style={styles.cell} onPress={() => void abrirDetalle(habitacion)} activeOpacity={0.88}>
                    <AppCard style={{ ...styles.roomCard, borderTopColor: visual.color, borderTopWidth: 3 }}>
                      <View style={styles.cardTop}>
                        <View style={[styles.statusIcon, { backgroundColor: visual.bg }]}>
                          <Ionicons name={visual.icon} size={18} color={visual.color} />
                        </View>
                        <Text style={[styles.number, { color: colors.text.primary }]}>{habitacion.numero}</Text>
                      </View>
                      <Text style={[styles.type, { color: colors.text.secondary }]} numberOfLines={1}>{habitacion.tipos_habitacion?.nombre ?? 'Habitación'}</Text>
                      <View style={[styles.badge, { backgroundColor: visual.bg }]}>
                        <Text style={{ color: visual.color, fontSize: 10, fontWeight: '900' }}>{visual.label}</Text>
                      </View>
                      <View style={styles.miniRow}>
                        {huesped ? <Ionicons name="person" size={13} color={colors.status.error} /> : null}
                        {tarea ? <Ionicons name="sparkles" size={13} color={colors.status.info} /> : null}
                        {inc ? <Ionicons name="warning" size={13} color={colors.status.warning} /> : null}
                      </View>
                    </AppCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={Boolean(seleccionada)} animationType="slide" transparent onRequestClose={() => setSeleccionada(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
            {seleccionada ? (
              <ScrollView contentContainerStyle={styles.modalContent}>
                {(() => {
                  const visual = estadoVisual(seleccionada.estado);
                  return (
                    <>
                      <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>DETALLE EN VIVO</Text>
                          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Habitación {seleccionada.numero}</Text>
                          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Piso {seleccionada.piso} · {seleccionada.tipos_habitacion?.nombre ?? 'Habitación'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSeleccionada(null)} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                          <Ionicons name="close" size={22} color={colors.text.primary} />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.liveStatus, { backgroundColor: visual.bg, borderColor: visual.color }]}>
                        <Ionicons name={visual.icon} size={22} color={visual.color} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.liveLabel, { color: visual.color }]}>{visual.label}</Text>
                          <Text style={[styles.meta, { color: colors.text.secondary }]}>Estado actual de la habitación</Text>
                        </View>
                      </View>

                      <Info title="Huésped actual" value={reservaActual?.cliente_nombre ?? 'Sin huésped en estadía'} detail={reservaActual ? `${reservaActual.codigo_reserva} · Sale ${fechaBonita(reservaActual.fecha_salida)}` : 'No hay reserva activa'} colors={colors} />
                      <Info title="Próxima reserva" value={proximaReserva?.cliente_nombre ?? historial[0]?.cliente_nombre ?? 'Sin próxima reserva'} detail={proximaReserva ? `${proximaReserva.codigo_reserva} · Llega ${fechaBonita(proximaReserva.fecha_entrada)}` : historial[0] ? `${historial[0].codigo_reserva} · Llega ${fechaBonita(historial[0].fecha_entrada)}` : 'No hay reservas próximas'} colors={colors} />
                      <Info title="Personal asignado" value={tareaSeleccionada?.personal_nombre ?? 'Sin personal asignado'} detail={tareaSeleccionada ? `Tarea ${tareaSeleccionada.codigo} · ${tareaSeleccionada.estado.replace('_', ' ')}` : 'No hay tarea activa'} colors={colors} />
                      <Info title="Incidencia relacionada" value={incidenciaActiva?.titulo ?? 'Sin incidencia activa'} detail={incidenciaActiva ? `${incidenciaActiva.prioridad} · ${incidenciaActiva.estado.replace('_', ' ')}` : 'La habitación no tiene alertas abiertas'} colors={colors} />

                      <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Acciones rápidas</Text>
                      <View style={styles.actions}>
                        <Action label="Cambiar estado" icon="swap-horizontal-outline" color={colors.gold.primary} onPress={() => setSelectorEstado(true)} colors={colors} />
                        <Action label="Crear tarea de limpieza" icon="sparkles-outline" color={colors.status.info} loading={procesando === 'limpieza'} onPress={() => ejecutar(seleccionada, 'limpieza', () => crearTareaLimpiezaAdministrador({ habitacionId: seleccionada.id, prioridad: 'media' }))} colors={colors} />
                        <Action label="Crear incidencia" icon="warning-outline" color={colors.status.warning} loading={procesando === 'incidencia'} onPress={abrirIncidencia} colors={colors} />
                        <Action label="Enviar a mantenimiento" icon="construct-outline" color={colors.text.muted} loading={procesando === 'mantenimiento'} onPress={abrirMantenimiento} colors={colors} />
                        {tareaSeleccionada?.estado === 'completada' ? (
                          <Action label="Aprobar limpieza" icon="checkmark-done-outline" color={colors.status.success} loading={procesando === 'aprobar'} onPress={() => ejecutar(seleccionada, 'aprobar', () => aprobarLimpiezaAdministrador(tareaSeleccionada.id))} colors={colors} />
                        ) : null}
                      </View>

                      <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Historial / próximas reservas</Text>
                      {(historial.length ? historial : proximaReserva ? [proximaReserva] : []).slice(0, 4).map((r) => (
                        <View key={r.reserva_id ?? r.id ?? r.codigo_reserva} style={[styles.historyRow, { borderColor: colors.border.primary }]}>
                          <Text style={[styles.historyCode, { color: colors.gold.primary }]}>{r.codigo_reserva}</Text>
                          <Text style={[styles.historyGuest, { color: colors.text.primary }]}>{r.cliente_nombre ?? 'Cliente'}</Text>
                          <Text style={[styles.meta, { color: colors.text.muted }]}>{fechaBonita(r.fecha_entrada)} → {fechaBonita(r.fecha_salida)} · {r.estado}</Text>
                        </View>
                      ))}
                      {!historial.length && !proximaReserva ? <Text style={[styles.message, { color: colors.text.muted }]}>Sin historial cercano para mostrar.</Text> : null}
                    </>
                  );
                })()}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <EstadoHabitacionModal
        visible={selectorEstado}
        colors={colors}
        habitacion={seleccionada}
        onClose={() => setSelectorEstado(false)}
        onSelect={(estado) => {
          if (seleccionada) confirmarEstado(seleccionada, estado);
          setSelectorEstado(false);
        }}
      />

      <MantenimientoModal
        visible={modalMantenimiento}
        colors={colors}
        motivo={motivoMantenimiento}
        setMotivo={setMotivoMantenimiento}
        prioridad={prioridadMantenimiento}
        setPrioridad={setPrioridadMantenimiento}
        foto={fotoMantenimiento}
        onFoto={() => void seleccionarFotoMantenimiento()}
        onClose={() => setModalMantenimiento(false)}
        onConfirmar={() => void enviarMantenimiento()}
        procesando={procesando}
      />

      <IncidenciaModal
        visible={modalIncidencia}
        colors={colors}
        habitaciones={habitaciones}
        pisos={pisos}
        ubicacion={incidenciaUbicacion}
        setUbicacion={setIncidenciaUbicacion}
        habitacionId={incidenciaHabitacionId}
        setHabitacionId={setIncidenciaHabitacionId}
        area={incidenciaArea}
        setArea={setIncidenciaArea}
        otroLugar={incidenciaOtroLugar}
        setOtroLugar={setIncidenciaOtroLugar}
        titulo={incidenciaTitulo}
        setTitulo={setIncidenciaTitulo}
        descripcion={incidenciaDescripcion}
        setDescripcion={setIncidenciaDescripcion}
        prioridad={incidenciaPrioridad}
        setPrioridad={setIncidenciaPrioridad}
        procesando={procesando}
        onClose={() => setModalIncidencia(false)}
        onConfirmar={() => void guardarIncidencia()}
      />

      <ConfirmacionHabitacionModal
        visible={Boolean(confirmacion)}
        colors={colors}
        data={confirmacion}
        onClose={() => setConfirmacion(null)}
        onConfirmar={async () => {
          const actual = confirmacion;
          if (!actual) return;
          setConfirmacion(null);
          await actual.accion();
        }}
      />

      <MensajeHabitacionModal
        visible={Boolean(mensaje)}
        colors={colors}
        data={mensaje}
        onClose={() => setMensaje(null)}
      />
    </View>
  );
}

function EstadoHabitacionModal({ visible, colors, habitacion, onClose, onSelect }: {
  visible: boolean;
  colors: any;
  habitacion: AdminHabitacion | null;
  onClose: () => void;
  onSelect: (estado: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerOverlay}>
        <View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>CAMBIAR ESTADO</Text>
              <Text style={[styles.centerTitle, { color: colors.text.primary }]}>Habitación {habitacion?.numero}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.bg.primary }]}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.stateGrid}>
            {ESTADOS_CAMBIO.map((estado) => {
              const active = habitacion?.estado === estado;
              return (
                <TouchableOpacity
                  key={estado}
                  disabled={active}
                  onPress={() => onSelect(estado)}
                  style={[
                    styles.stateOption,
                    {
                      borderColor: active ? colors.gold.primary : colors.border.primary,
                      backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.primary,
                      opacity: active ? 0.55 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.stateOptionText, { color: active ? colors.gold.primary : colors.text.primary }]}>{estado.replace('_', ' ')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MantenimientoModal(props: {
  visible: boolean;
  colors: any;
  motivo: string;
  setMotivo: (v: string) => void;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  setPrioridad: (v: 'baja' | 'media' | 'alta' | 'critica') => void;
  foto: ImagePicker.ImagePickerAsset | null;
  onFoto: () => void;
  onClose: () => void;
  onConfirmar: () => void;
  procesando: string | null;
}) {
  const { colors } = props;
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>MANTENIMIENTO</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Enviar habitación</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Quedará bloqueada para reservas.</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Motivo</Text>
            <TextInput
              value={props.motivo}
              onChangeText={props.setMotivo}
              placeholder="Describe el problema de la habitación..."
              placeholderTextColor={colors.text.muted}
              multiline
              style={[styles.input, styles.inputMulti, { color: colors.text.primary, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}
            />

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Prioridad</Text>
            <View style={styles.priorityRow}>
              {(['baja', 'media', 'alta', 'critica'] as const).map((p) => {
                const active = props.prioridad === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => props.setPrioridad(p)}
                    style={[
                      styles.priorityChip,
                      {
                        borderColor: active ? colors.gold.primary : colors.border.primary,
                        backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? colors.gold.primary : colors.text.secondary, fontSize: 11, textTransform: 'capitalize' }}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.photoBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]} onPress={props.onFoto}>
              <Ionicons name="image-outline" size={20} color={colors.gold.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>{props.foto ? 'Foto seleccionada' : 'Adjuntar foto opcional'}</Text>
                <Text style={[styles.meta, { color: colors.text.muted }]} numberOfLines={1}>{props.foto?.fileName ?? 'Evidencia visual para mantenimiento'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.status.warning, opacity: props.procesando === 'mantenimiento' ? 0.6 : 1 }]}
              disabled={props.procesando === 'mantenimiento'}
              onPress={props.onConfirmar}
            >
              <Text style={{ color: colors.text.inverse, fontWeight: '700' }}>{props.procesando === 'mantenimiento' ? 'Enviando...' : 'Enviar a mantenimiento'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function IncidenciaModal(props: {
  visible: boolean;
  colors: any;
  habitaciones: AdminHabitacion[];
  pisos: number[];
  ubicacion: UbicacionIncidencia;
  setUbicacion: (v: UbicacionIncidencia) => void;
  habitacionId: string;
  setHabitacionId: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  otroLugar: string;
  setOtroLugar: (v: string) => void;
  titulo: string;
  setTitulo: (v: string) => void;
  descripcion: string;
  setDescripcion: (v: string) => void;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  setPrioridad: (v: 'baja' | 'media' | 'alta' | 'critica') => void;
  procesando: string | null;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  const { colors } = props;
  const habitacionSel = props.habitaciones.find((h) => h.id === props.habitacionId);
  const habitacionesPorPiso = props.habitaciones
    .filter((h) => !habitacionSel || h.piso === habitacionSel.piso)
    .sort((a, b) => a.numero.localeCompare(b.numero));
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>NUEVA INCIDENCIA</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Ubicación y detalle</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Registra dónde ocurrió antes de notificar al equipo.</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Tipo de ubicación</Text>
            <View style={styles.payOptions}>
              {(['habitacion', 'area'] as const).map((tipo) => {
                const active = props.ubicacion === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    onPress={() => props.setUbicacion(tipo)}
                    style={[styles.payOption, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                  >
                    <Text style={[styles.payOptionLabel, { color: active ? colors.gold.primary : colors.text.primary }]}>
                      {tipo === 'habitacion' ? 'Habitación' : 'Otro lugar'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {props.ubicacion === 'habitacion' ? (
              <>
                <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Piso</Text>
                <View style={styles.priorityRow}>
                  {props.pisos.map((piso) => {
                    const active = habitacionSel?.piso === piso;
                    return (
                      <TouchableOpacity
                        key={piso}
                        onPress={() => {
                          const primera = props.habitaciones.find((h) => h.piso === piso);
                          if (primera) props.setHabitacionId(primera.id);
                        }}
                        style={[styles.priorityChip, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                      >
                        <Text style={{ color: active ? colors.gold.primary : colors.text.secondary, fontSize: 11 }}>Piso {piso}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Número de habitación</Text>
                <View style={styles.roomPickerGrid}>
                  {habitacionesPorPiso.map((h) => {
                    const active = props.habitacionId === h.id;
                    return (
                      <TouchableOpacity
                        key={h.id}
                        onPress={() => props.setHabitacionId(h.id)}
                        style={[styles.roomPick, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                      >
                        <Text style={{ color: active ? colors.gold.primary : colors.text.primary, fontWeight: '800' }}>{h.numero}</Text>
                        <Text style={{ color: colors.text.muted, fontSize: 10 }} numberOfLines={1}>{h.estado}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Área del hotel</Text>
                <View style={styles.priorityRow}>
                  {AREAS_INCIDENCIA.map((area) => {
                    const active = props.area === area;
                    return (
                      <TouchableOpacity
                        key={area}
                        onPress={() => props.setArea(area)}
                        style={[styles.priorityChip, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                      >
                        <Text style={{ color: active ? colors.gold.primary : colors.text.secondary, fontSize: 11 }}>{area}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {props.area === 'Otro' ? (
                  <TextInput
                    value={props.otroLugar}
                    onChangeText={props.setOtroLugar}
                    placeholder="Escribe el lugar exacto"
                    placeholderTextColor={colors.text.muted}
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}
                  />
                ) : null}
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Prioridad</Text>
            <View style={styles.priorityRow}>
              {(['baja', 'media', 'alta', 'critica'] as const).map((p) => {
                const active = props.prioridad === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => props.setPrioridad(p)}
                    style={[styles.priorityChip, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                  >
                    <Text style={{ color: active ? colors.gold.primary : colors.text.secondary, fontSize: 11, textTransform: 'capitalize' }}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Título</Text>
            <TextInput
              value={props.titulo}
              onChangeText={props.setTitulo}
              placeholder="Ej. Fuga de agua, ruido, daño..."
              placeholderTextColor={colors.text.muted}
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}
            />
            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Descripción</Text>
            <TextInput
              value={props.descripcion}
              onChangeText={props.setDescripcion}
              placeholder="Describe qué pasó y qué necesita revisar el personal."
              placeholderTextColor={colors.text.muted}
              multiline
              style={[styles.input, styles.inputMulti, { color: colors.text.primary, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}
            />

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.status.warning, opacity: props.procesando === 'incidencia' ? 0.6 : 1 }]}
              disabled={props.procesando === 'incidencia'}
              onPress={props.onConfirmar}
            >
              <Text style={{ color: colors.text.inverse, fontWeight: '700' }}>{props.procesando === 'incidencia' ? 'Guardando...' : 'Crear incidencia'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmacionHabitacionModal({ visible, colors, data, onClose, onConfirmar }: {
  visible: boolean;
  colors: any;
  data: ConfirmacionHabitacion;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerOverlay}>
        <View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: data?.peligro ? colors.status.error : colors.border.gold }]}>
          <View style={[styles.centerIcon, { backgroundColor: data?.peligro ? colors.status.errorBg : `${colors.gold.primary}18` }]}>
            <Ionicons name={data?.peligro ? 'warning-outline' : 'shield-checkmark-outline'} size={24} color={data?.peligro ? colors.status.error : colors.gold.primary} />
          </View>
          <Text style={[styles.centerTitle, { color: colors.text.primary }]}>{data?.titulo}</Text>
          <Text style={[styles.centerText, { color: colors.text.secondary }]}>{data?.mensaje}</Text>
          <View style={styles.centerActions}>
            <TouchableOpacity style={[styles.centerBtn, { borderColor: colors.border.primary }]} onPress={onClose}>
              <Text style={{ color: colors.text.secondary, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.centerBtn, { backgroundColor: data?.peligro ? colors.status.error : colors.gold.primary, borderColor: data?.peligro ? colors.status.error : colors.gold.primary }]} onPress={onConfirmar}>
              <Text style={{ color: colors.text.inverse, fontWeight: '700' }}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MensajeHabitacionModal({ visible, colors, data, onClose }: {
  visible: boolean;
  colors: any;
  data: MensajeHabitacion;
  onClose: () => void;
}) {
  const tipo = data?.tipo ?? 'info';
  const color = tipo === 'ok' ? colors.status.success : tipo === 'error' ? colors.status.error : tipo === 'warning' ? colors.status.warning : colors.gold.primary;
  const icon = tipo === 'ok' ? 'checkmark-circle-outline' : tipo === 'error' ? 'close-circle-outline' : tipo === 'warning' ? 'alert-circle-outline' : 'information-circle-outline';
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerOverlay}>
        <View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: color }]}>
          <View style={[styles.centerIcon, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <Text style={[styles.centerTitle, { color: colors.text.primary }]}>{data?.titulo}</Text>
          <Text style={[styles.centerText, { color: colors.text.secondary }]}>{data?.mensaje}</Text>
          <TouchableOpacity style={[styles.confirmButton, { backgroundColor: color, alignSelf: 'stretch' }]} onPress={onClose}>
            <Text style={{ color: colors.text.inverse, fontWeight: '700' }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Info({ title, value, detail, colors }: { title: string; value: string; detail: string; colors: any }) {
  return (
    <View style={[styles.infoBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
      <Text style={[styles.infoTitle, { color: colors.text.muted }]}>{title}</Text>
      <Text style={[styles.infoValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.meta, { color: colors.text.secondary }]}>{detail}</Text>
    </View>
  );
}

function Action({ label, icon, color, loading, onPress, colors }: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; loading?: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity disabled={loading} onPress={onPress} style={[styles.action, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.actionText, { color: colors.text.primary }]}>{loading ? 'Procesando...' : label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: 12 },
  eyebrow: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: Typography.xxl, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: Typography.sm, marginTop: 3 },
  searchWrap: { paddingHorizontal: Spacing.md, paddingBottom: 10 },
  searchBox: { minHeight: 44, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.sm, paddingVertical: 8 },
  filterArea: { height: 92, paddingTop: 2, paddingBottom: 8 },
  filters: { gap: 7, paddingHorizontal: Spacing.md, height: 38, alignItems: 'center' },
  filter: { width: 104, height: 32, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  floorFilters: { gap: 7, paddingHorizontal: Spacing.md, height: 38, alignItems: 'center' },
  floorFilter: { width: 118, height: 32, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize', maxWidth: '100%' },
  list: { padding: Spacing.md, paddingBottom: 36 },
  floorBlock: { marginBottom: 18 },
  floorTitle: { fontSize: Typography.md, fontWeight: '900', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48%' },
  roomCard: { minHeight: 155 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 24, fontWeight: '900' },
  type: { fontSize: Typography.sm, fontWeight: '600', marginTop: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginTop: 10 },
  miniRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  message: { textAlign: 'center', padding: 26, fontSize: Typography.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  modalContent: { padding: Spacing.md, paddingTop: 18, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 28, fontWeight: '900', marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  liveStatus: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 12 },
  liveLabel: { fontSize: Typography.md, fontWeight: '900' },
  infoBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 9 },
  infoTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  infoValue: { fontSize: Typography.md, fontWeight: '800', marginTop: 5 },
  meta: { fontSize: Typography.xs, lineHeight: 17, marginTop: 5 },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '900', letterSpacing: 1.2, marginTop: 16, marginBottom: 10, textTransform: 'uppercase' },
  actions: { gap: 8 },
  action: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { flex: 1, fontSize: Typography.sm, fontWeight: '800' },
  historyRow: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 8 },
  historyCode: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  historyGuest: { fontSize: Typography.sm, fontWeight: '800', marginTop: 4 },
  centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  centerCard: { width: '100%', borderWidth: 1, borderRadius: 26, padding: 18, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  centerIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  centerTitle: { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center' },
  centerText: { fontSize: Typography.sm, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  centerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  centerBtn: { flex: 1, height: 46, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stateOption: { width: '48%', minHeight: 72, borderWidth: 1, borderRadius: BorderRadius.lg, padding: 12, justifyContent: 'space-between' },
  stateOptionText: { fontSize: Typography.sm, fontWeight: '800', textTransform: 'capitalize' },
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: Typography.sm },
  inputMulti: { minHeight: 110, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  priorityChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 13, paddingVertical: 8 },
  payOptions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  payOption: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, alignItems: 'center' },
  payOptionLabel: { fontSize: Typography.sm, fontWeight: '800' },
  roomPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  roomPick: { width: '23%', borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 3 },
  photoBox: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 14 },
  confirmButton: { height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
