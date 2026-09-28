import React, { useCallback, useMemo, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import AppCard from '../../components/common/AppCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import type { AdminAuditoria, AdminHabitacion, AdminIncidencia, AdminPersonalDisponible, AdminTareaHousekeeping } from '../../interfaces';
import {
  aprobarLimpiezaAdministrador,
  cambiarEstadoHabitacionAdministrador,
  cambiarEstadoIncidenciaAdministrador,
  crearIncidenciaHabitacionAdministrador,
  crearTareaLimpiezaAdministrador,
  obtenerAuditoriaAdministrador,
  obtenerHabitacionesAdministrador,
  obtenerIncidenciasAdministrador,
  obtenerPersonalDisponibleAdministrador,
  obtenerTareasHousekeepingAdministrador,
  reasignarTareaHousekeepingAdministrador,
  rechazarLimpiezaAdministrador,
} from '../../services/adminService';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

type Seccion = 'incidencias' | 'housekeeping' | 'auditoria';
type Mensaje = { titulo: string; mensaje: string; tipo?: 'ok' | 'error' | 'warning' | 'info' } | null;
type Confirmacion = { titulo: string; mensaje: string; accion: () => Promise<void> | void; peligro?: boolean } | null;

const SECCIONES: { id: Seccion; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'incidencias', label: 'Incidencias', icon: 'warning-outline' },
  { id: 'housekeeping', label: 'Housekeeping', icon: 'sparkles-outline' },
  { id: 'auditoria', label: 'Auditoría', icon: 'document-text-outline' },
];

const ESTADOS_TAREA = ['todos', 'pendiente', 'asignada', 'tomada', 'en_proceso', 'finalizada', 'completada', 'revision', 'aprobada', 'rechazada'];
const ESTADOS_INCIDENCIA = ['todos', 'reportada', 'nueva', 'revision', 'asignada', 'en_proceso', 'resuelta', 'cerrada', 'rechazada'];
const PRIORIDADES_TAREA = ['baja', 'media', 'alta', 'urgente'];
const PRIORIDADES_INCIDENCIA = ['baja', 'media', 'alta', 'critica'];
const TIPOS_TAREA = ['Limpieza normal', 'Limpieza profunda', 'Reposición', 'Revisión', 'Limpieza urgente'];
const TIPOS_INCIDENCIA = ['Fuga de agua', 'Aire acondicionado dañado', 'Televisor no funciona', 'Lámpara quemada', 'Falta de insumos', 'Reclamo de huésped', 'Objeto olvidado', 'Problema eléctrico', 'Daño en habitación', 'Otro'];
const AREAS_HOTEL = ['Habitación', 'Recepción', 'Lobby', 'Pasillo', 'Restaurante', 'Piscina', 'Parqueo', 'Lavandería', 'Cocina', 'Otro'];

const normalizar = (texto?: string | null) => (texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hoy = () => new Date().toISOString().slice(0, 10);

export default function AdminControlScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const [seccion, setSeccion] = useState<Seccion>('incidencias');
  const [incidencias, setIncidencias] = useState<AdminIncidencia[]>([]);
  const [tareas, setTareas] = useState<AdminTareaHousekeeping[]>([]);
  const [auditoria, setAuditoria] = useState<AdminAuditoria[]>([]);
  const [habitaciones, setHabitaciones] = useState<AdminHabitacion[]>([]);
  const [personal, setPersonal] = useState<AdminPersonalDisponible[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalTarea, setModalTarea] = useState(false);
  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [detalleTarea, setDetalleTarea] = useState<AdminTareaHousekeeping | null>(null);
  const [detalleIncidencia, setDetalleIncidencia] = useState<AdminIncidencia | null>(null);
  const [modalRechazo, setModalRechazo] = useState<AdminTareaHousekeeping | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [tareaForm, setTareaForm] = useState({
    habitacionId: '',
    tipo: 'Limpieza normal',
    prioridad: 'media',
    personalId: '',
    observaciones: '',
  });
  const [incForm, setIncForm] = useState({
    tipo: 'Fuga de agua',
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    area: 'Habitación',
    habitacionId: '',
    otroLugar: '',
    asignadoA: '',
  });

  const cargar = useCallback(async () => {
    try {
      setError('');
      const resultados = await Promise.allSettled([
        obtenerIncidenciasAdministrador(),
        obtenerTareasHousekeepingAdministrador(),
        obtenerAuditoriaAdministrador(),
        obtenerHabitacionesAdministrador(),
        obtenerPersonalDisponibleAdministrador(),
      ]);
      if (resultados[0].status === 'fulfilled') setIncidencias(resultados[0].value);
      if (resultados[1].status === 'fulfilled') setTareas(resultados[1].value);
      if (resultados[2].status === 'fulfilled') setAuditoria(resultados[2].value);
      if (resultados[3].status === 'fulfilled') setHabitaciones(resultados[3].value);
      if (resultados[4].status === 'fulfilled') setPersonal(resultados[4].value);
      const fallos = resultados.filter((r) => r.status === 'rejected');
      if (fallos.length === resultados.length) throw (fallos[0] as PromiseRejectedResult).reason;
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el centro de control.');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (route.params?.seccion) setSeccion(route.params.seccion);
    void cargar();
  }, [cargar, route.params?.seccion]));

  const estados = seccion === 'housekeeping' ? ESTADOS_TAREA : ESTADOS_INCIDENCIA;
  const q = normalizar(busqueda.trim());
  const tareasFiltradas = useMemo(() => tareas.filter((t) => {
    const estado = normalizar(t.estado);
    const okEstado = filtroEstado === 'todos' || estado === normalizar(filtroEstado);
    const okBusqueda = !q || [t.codigo, t.habitacion_numero, t.personal_nombre, t.prioridad, t.estado, t.tipo_tarea].some((v) => normalizar(v).includes(q));
    return okEstado && okBusqueda;
  }), [filtroEstado, q, tareas]);

  const incidenciasFiltradas = useMemo(() => incidencias.filter((i) => {
    const estado = normalizar(i.estado);
    const okEstado = filtroEstado === 'todos' || estado === normalizar(filtroEstado);
    const okBusqueda = !q || [i.codigo, i.titulo, i.descripcion, i.categoria, i.prioridad, i.estado, i.asignado_a].some((v) => normalizar(v).includes(q));
    return okEstado && okBusqueda;
  }), [filtroEstado, incidencias, q]);

  const mostrarMensaje = (titulo: string, mensajeTexto: string, tipo: NonNullable<Mensaje>['tipo'] = 'info') => setMensaje({ titulo, mensaje: mensajeTexto, tipo });
  const pedirConfirmacion = (titulo: string, mensajeTexto: string, accion: () => Promise<void> | void, peligro = false) => setConfirmacion({ titulo, mensaje: mensajeTexto, accion, peligro });
  const colorPrioridad = (valor: string) => ['critica', 'urgente'].includes(normalizar(valor)) ? colors.status.error : normalizar(valor) === 'alta' ? colors.status.warning : colors.status.info;

  const crearTarea = async () => {
    if (!tareaForm.habitacionId) return mostrarMensaje('Habitación requerida', 'Selecciona una habitación para crear la tarea.', 'warning');
    if (!TIPOS_TAREA.includes(tareaForm.tipo)) return mostrarMensaje('Tipo inválido', 'Selecciona un tipo de tarea válido.', 'warning');
    if (!PRIORIDADES_TAREA.includes(tareaForm.prioridad)) return mostrarMensaje('Prioridad inválida', 'Selecciona una prioridad válida.', 'warning');
    const habitacion = habitaciones.find((h) => h.id === tareaForm.habitacionId);
    setProcesando('crear-tarea');
    try {
      await crearTareaLimpiezaAdministrador({
        habitacionId: tareaForm.habitacionId,
        personalId: tareaForm.personalId || null,
        prioridad: tareaForm.prioridad,
        fecha: hoy(),
        observaciones: [`Tipo: ${tareaForm.tipo}`, tareaForm.observaciones.trim()].filter(Boolean).join(' | '),
      });
      setModalTarea(false);
      setTareaForm({ habitacionId: '', tipo: 'Limpieza normal', prioridad: 'media', personalId: '', observaciones: '' });
      await cargar();
      mostrarMensaje('Tarea creada', `Nueva tarea disponible: ${tareaForm.tipo.toLowerCase()} en habitación ${habitacion?.numero ?? ''}.`, 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo crear la tarea', e.message ?? 'Inténtalo nuevamente.', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const crearIncidencia = async () => {
    const esHabitacion = incForm.area === 'Habitación';
    const habitacion = habitaciones.find((h) => h.id === incForm.habitacionId);
    const ubicacion = esHabitacion ? (habitacion ? `Habitación ${habitacion.numero}` : '') : incForm.area === 'Otro' ? incForm.otroLugar.trim() : incForm.area;
    const titulo = incForm.titulo.trim() || incForm.tipo;
    if (!titulo) return mostrarMensaje('Título requerido', 'La incidencia necesita un título.', 'warning');
    if (!incForm.descripcion.trim() || incForm.descripcion.trim().length < 8) return mostrarMensaje('Descripción requerida', 'Describe claramente el problema.', 'warning');
    if (!PRIORIDADES_INCIDENCIA.includes(incForm.prioridad)) return mostrarMensaje('Prioridad inválida', 'Selecciona una prioridad válida.', 'warning');
    if (!ubicacion) return mostrarMensaje('Ubicación requerida', 'Selecciona habitación o escribe el lugar exacto.', 'warning');
    setProcesando('crear-incidencia');
    try {
      await crearIncidenciaHabitacionAdministrador({
        habitacionId: esHabitacion ? incForm.habitacionId : null,
        numero: esHabitacion ? habitacion?.numero : undefined,
        estadoHabitacion: esHabitacion ? habitacion?.estado : undefined,
        titulo,
        descripcion: `${incForm.descripcion.trim()}\nUbicación: ${ubicacion}`,
        prioridad: incForm.prioridad,
        areaAfectada: esHabitacion ? 'Habitaciones' : ubicacion,
      });
      if (incForm.prioridad === 'critica' && esHabitacion && incForm.habitacionId) {
        await cambiarEstadoHabitacionAdministrador(incForm.habitacionId, 'bloqueada', `Incidencia crítica: ${titulo}`);
      }
      setModalIncidencia(false);
      setIncForm({ tipo: 'Fuga de agua', titulo: '', descripcion: '', prioridad: 'media', area: 'Habitación', habitacionId: '', otroLugar: '', asignadoA: '' });
      await cargar();
      mostrarMensaje(incForm.prioridad === 'critica' ? 'Alerta crítica registrada' : 'Incidencia creada', incForm.prioridad === 'critica' ? `${titulo}. Habitación bloqueada si corresponde.` : 'La incidencia quedó registrada.', incForm.prioridad === 'critica' ? 'warning' : 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo crear la incidencia', e.message ?? 'Inténtalo nuevamente.', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const aprobarTarea = (tarea: AdminTareaHousekeeping) => pedirConfirmacion(
    'Aprobar limpieza',
    `La habitación ${tarea.habitacion_numero} pasará a disponible. Verifica checklist y evidencia antes de aprobar.`,
    async () => {
      setProcesando(tarea.id);
      try {
        await aprobarLimpiezaAdministrador(tarea.id);
        await cargar();
        mostrarMensaje('Limpieza aprobada', `Habitación ${tarea.habitacion_numero} disponible.`, 'ok');
      } catch (e: any) { mostrarMensaje('No se pudo aprobar', e.message, 'error'); }
      finally { setProcesando(null); }
    },
  );

  const rechazarTarea = async () => {
    if (!modalRechazo) return;
    if (motivoRechazo.trim().length < 8) return mostrarMensaje('Motivo requerido', 'Explica por qué se rechaza la limpieza.', 'warning');
    setProcesando(modalRechazo.id);
    try {
      await rechazarLimpiezaAdministrador(modalRechazo.id, motivoRechazo.trim());
      setModalRechazo(null);
      setMotivoRechazo('');
      await cargar();
      mostrarMensaje('Limpieza rechazada', 'Housekeeping deberá corregir la tarea.', 'warning');
    } catch (e: any) { mostrarMensaje('No se pudo rechazar', e.message, 'error'); }
    finally { setProcesando(null); }
  };

  const reasignar = async (tarea: AdminTareaHousekeeping, personalId: string) => {
    if (!personalId || personalId === tarea.personal_id) return;
    setProcesando(tarea.id);
    try {
      await reasignarTareaHousekeepingAdministrador(tarea.id, personalId);
      await cargar();
      mostrarMensaje('Tarea reasignada', 'El responsable fue actualizado.', 'ok');
    } catch (e: any) { mostrarMensaje('No se pudo reasignar', e.message, 'error'); }
    finally { setProcesando(null); }
  };

  const avanzarIncidencia = (item: AdminIncidencia) => {
    const estado = normalizar(item.estado);
    const siguiente = ['nueva', 'reportada'].includes(estado) ? 'en_revision'
      : ['en_revision', 'revision', 'asignada'].includes(estado) ? 'en_proceso'
        : estado === 'en_proceso' ? 'resuelta'
          : estado === 'resuelta' ? 'cerrada' : null;
    if (!siguiente) return;
    pedirConfirmacion('Actualizar incidencia', `${item.codigo ?? item.titulo} pasará a "${siguiente.replace('_', ' ')}".`, async () => {
      setProcesando(item.id);
      try {
        await cambiarEstadoIncidenciaAdministrador(item.id, siguiente);
        await cargar();
        mostrarMensaje('Incidencia actualizada', 'Estado actualizado correctamente.', 'ok');
      } catch (e: any) { mostrarMensaje('No se pudo actualizar', e.message, 'error'); }
      finally { setProcesando(null); }
    });
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>SUPERVISIÓN</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Centro de control</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Housekeeping, incidencias y auditoría</Text>
      </View>

      <View style={styles.tabs}>
        {SECCIONES.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => { setSeccion(item.id); setFiltroEstado('todos'); }} style={[
            styles.tab, { borderColor: seccion === item.id ? colors.gold.primary : colors.border.primary, backgroundColor: seccion === item.id ? `${colors.gold.primary}18` : colors.bg.secondary },
          ]}>
            <Ionicons name={item.icon} size={16} color={seccion === item.id ? colors.gold.primary : colors.text.muted} />
            <Text style={{ color: seccion === item.id ? colors.gold.primary : colors.text.muted, fontSize: 10, fontWeight: '700' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {seccion !== 'auditoria' ? (
        <>
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
              <Ionicons name="search-outline" size={16} color={colors.text.muted} />
              <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar código, habitación, estado..." placeholderTextColor={colors.text.muted} style={[styles.searchInput, { color: colors.text.primary }]} />
            </View>
            <TouchableOpacity style={[styles.newButton, { backgroundColor: colors.gold.primary }]} onPress={() => seccion === 'housekeeping' ? setModalTarea(true) : setModalIncidencia(true)}>
              <Ionicons name="add" size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
          <View style={styles.filterShell}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {estados.map((estado) => (
                <TouchableOpacity key={estado} onPress={() => setFiltroEstado(estado)} style={[
                  styles.filter, { borderColor: filtroEstado === estado ? colors.gold.primary : colors.border.primary, backgroundColor: filtroEstado === estado ? `${colors.gold.primary}18` : colors.bg.secondary },
                ]}>
                  <Text numberOfLines={1} style={{ color: filtroEstado === estado ? colors.gold.primary : colors.text.muted, fontSize: 10, textTransform: 'capitalize' }}>{estado.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      ) : null}

      <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}>
        {error ? <Text style={[styles.message, { color: colors.status.error }]}>{error}</Text> : null}

        {seccion === 'housekeeping' && tareasFiltradas.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => setDetalleTarea(item)}>
          <AppCard style={styles.card}>
            <View style={styles.top}>
              <View style={[styles.iconBox, { backgroundColor: `${colors.gold.primary}18` }]}><Ionicons name="bed-outline" size={19} color={colors.gold.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.code, { color: colors.gold.primary }]}>{item.codigo}</Text>
                <Text style={[styles.name, { color: colors.text.primary }]}>Habitación {item.habitacion_numero}</Text>
                <Text style={[styles.meta, { color: colors.text.secondary }]}>{item.personal_nombre ?? 'Disponible para tomar'} · {item.estado.replace('_', ' ')}</Text>
              </View>
              <Text style={{ color: colorPrioridad(item.prioridad), fontSize: 10, fontWeight: '800' }}>{item.prioridad.toUpperCase()}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.text.muted }]}>Checklist {item.checklist_ok ?? 0}/{item.checklist_total ?? 0} · Toca para ver detalle</Text>
            <View style={styles.actionRow}>
              {personal.slice(0, 3).map((p) => (
                <TouchableOpacity key={p.id} style={[styles.miniBtn, { borderColor: colors.border.primary }]} onPress={() => void reasignar(item, p.id)}>
                  <Text style={[styles.miniText, { color: colors.text.secondary }]} numberOfLines={1}>{p.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {['completada', 'finalizada', 'revision', 'en_revision'].includes(normalizar(item.estado)) ? (
              <View style={styles.footer}>
                <TouchableOpacity disabled={procesando === item.id} onPress={() => aprobarTarea(item)}><Text style={{ color: colors.status.success, fontWeight: '800', fontSize: 12 }}>Aprobar ✓</Text></TouchableOpacity>
                <TouchableOpacity disabled={procesando === item.id} onPress={() => { setModalRechazo(item); setMotivoRechazo(''); }}><Text style={{ color: colors.status.error, fontWeight: '800', fontSize: 12 }}>Rechazar</Text></TouchableOpacity>
              </View>
            ) : null}
          </AppCard>
          </TouchableOpacity>
        ))}

        {seccion === 'incidencias' && incidenciasFiltradas.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => setDetalleIncidencia(item)}>
          <AppCard style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.code, { color: colors.gold.primary }]}>{item.codigo ?? item.categoria.toUpperCase()}</Text>
                <Text style={[styles.name, { color: colors.text.primary }]}>{item.titulo}</Text>
              </View>
              <Text style={{ color: colorPrioridad(item.prioridad), fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{item.prioridad}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={3}>{item.descripcion ?? 'Sin descripción'}</Text>
            <View style={styles.footer}>
              <Text style={[styles.meta, { color: colors.text.muted }]}>{item.estado.replace('_', ' ')}</Text>
              {!['cerrada', 'rechazada'].includes(normalizar(item.estado)) ? (
                <TouchableOpacity disabled={procesando === item.id} onPress={() => avanzarIncidencia(item)}>
                  <Text style={{ color: colors.gold.primary, fontWeight: '800', fontSize: 12 }}>{procesando === item.id ? 'Actualizando...' : 'Avanzar estado →'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </AppCard>
          </TouchableOpacity>
        ))}

        {seccion === 'auditoria' && auditoria.map((item) => (
          <AppCard key={item.id} style={styles.auditCard}>
            <View style={styles.top}>
              <Text style={[styles.code, { color: colors.gold.primary }]}>{item.modulo?.toUpperCase()}</Text>
              <Text style={{ color: colorPrioridad(item.criticidad), fontSize: 9, fontWeight: '800' }}>{item.criticidad?.toUpperCase()}</Text>
            </View>
            <Text style={[styles.name, { color: colors.text.primary }]}>{item.accion}</Text>
            <Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={2}>{item.descripcion}</Text>
            <Text style={[styles.date, { color: colors.text.muted }]}>{item.usuario_nombre ?? 'Sistema'} · {new Date(item.created_at).toLocaleString('es-BO')}</Text>
          </AppCard>
        ))}

        {!error && ((seccion === 'incidencias' && !incidenciasFiltradas.length) || (seccion === 'housekeeping' && !tareasFiltradas.length) || (seccion === 'auditoria' && !auditoria.length)) ? (
          <Text style={[styles.message, { color: colors.text.muted }]}>No hay registros disponibles.</Text>
        ) : null}
      </ScrollView>

      <TareaModal visible={modalTarea} colors={colors} data={tareaForm} setData={(p: Partial<typeof tareaForm>) => setTareaForm((v) => ({ ...v, ...p }))} habitaciones={habitaciones} personal={personal} procesando={procesando} onClose={() => setModalTarea(false)} onConfirmar={() => void crearTarea()} />
      <IncidenciaModal visible={modalIncidencia} colors={colors} data={incForm} setData={(p: Partial<typeof incForm>) => setIncForm((v) => ({ ...v, ...p }))} habitaciones={habitaciones} personal={personal} procesando={procesando} onClose={() => setModalIncidencia(false)} onConfirmar={() => void crearIncidencia()} />
      <DetalleTareaModal visible={Boolean(detalleTarea)} colors={colors} tarea={detalleTarea} personal={personal} procesando={procesando} onClose={() => setDetalleTarea(null)} onReasignar={(id: string) => detalleTarea && void reasignar(detalleTarea, id)} onAprobar={() => detalleTarea && aprobarTarea(detalleTarea)} onRechazar={() => { if (detalleTarea) { setModalRechazo(detalleTarea); setMotivoRechazo(''); } }} />
      <DetalleIncidenciaModal visible={Boolean(detalleIncidencia)} colors={colors} incidencia={detalleIncidencia} procesando={procesando} onClose={() => setDetalleIncidencia(null)} onAvanzar={() => detalleIncidencia && avanzarIncidencia(detalleIncidencia)} />
      <RechazoModal visible={Boolean(modalRechazo)} colors={colors} motivo={motivoRechazo} setMotivo={setMotivoRechazo} procesando={procesando} onClose={() => setModalRechazo(null)} onConfirmar={() => void rechazarTarea()} />
      <ConfirmacionModal visible={Boolean(confirmacion)} colors={colors} data={confirmacion} onClose={() => setConfirmacion(null)} onConfirmar={async () => { const actual = confirmacion; setConfirmacion(null); await actual?.accion(); }} />
      <MensajeModal visible={Boolean(mensaje)} colors={colors} data={mensaje} onClose={() => setMensaje(null)} />
    </View>
  );
}

function TareaModal({ visible, colors, data, setData, habitaciones, personal, procesando, onClose, onConfirmar }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <ModalHeader colors={colors} title="Nueva tarea" subtitle="Housekeeping" onClose={onClose} />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Habitación</Text>
          <ChipGrid colors={colors} items={habitaciones.map((h: AdminHabitacion) => ({ id: h.id, label: `${h.numero} · Piso ${h.piso}` }))} selected={data.habitacionId} onSelect={(habitacionId) => setData({ habitacionId })} />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Tipo</Text>
          <ChipGrid colors={colors} items={TIPOS_TAREA.map((t) => ({ id: t, label: t }))} selected={data.tipo} onSelect={(tipo) => setData({ tipo, prioridad: tipo.includes('urgente') ? 'urgente' : data.prioridad })} />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Prioridad</Text>
          <ChipGrid colors={colors} items={PRIORIDADES_TAREA.map((p) => ({ id: p, label: p }))} selected={data.prioridad} onSelect={(prioridad) => setData({ prioridad })} />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Personal</Text>
          <ChipGrid colors={colors} items={[{ id: '', label: 'Sin asignar' }, ...personal.map((p: AdminPersonalDisponible) => ({ id: p.id, label: p.nombre }))]} selected={data.personalId} onSelect={(personalId) => setData({ personalId })} />
          <Input colors={colors} label="Observaciones" value={data.observaciones} onChangeText={(observaciones: string) => setData({ observaciones })} placeholder="Notas de limpieza, insumos, urgencia..." multiline />
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary }]} disabled={procesando === 'crear-tarea'} onPress={onConfirmar}><Text style={{ color: colors.text.inverse, fontWeight: '800' }}>{procesando === 'crear-tarea' ? 'Guardando...' : 'Crear tarea'}</Text></TouchableOpacity>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function IncidenciaModal({ visible, colors, data, setData, habitaciones, personal, procesando, onClose, onConfirmar }: any) {
  const esHabitacion = data.area === 'Habitación';
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <ModalHeader colors={colors} title="Nueva incidencia" subtitle="Registro y seguimiento" onClose={onClose} />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Tipo</Text>
          <ChipGrid colors={colors} items={TIPOS_INCIDENCIA.map((t) => ({ id: t, label: t }))} selected={data.tipo} onSelect={(tipo) => setData({ tipo, titulo: tipo === 'Otro' ? '' : tipo })} />
          <Input colors={colors} label="Título" value={data.titulo} onChangeText={(titulo: string) => setData({ titulo })} placeholder="Ej. Fuga de agua" />
          <Input colors={colors} label="Descripción" value={data.descripcion} onChangeText={(descripcion: string) => setData({ descripcion })} placeholder="Describe el problema claramente" multiline />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Prioridad</Text>
          <ChipGrid colors={colors} items={PRIORIDADES_INCIDENCIA.map((p) => ({ id: p, label: p }))} selected={data.prioridad} onSelect={(prioridad) => setData({ prioridad })} />
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Ubicación</Text>
          <ChipGrid colors={colors} items={AREAS_HOTEL.map((a) => ({ id: a, label: a }))} selected={data.area} onSelect={(area) => setData({ area, habitacionId: area === 'Habitación' ? data.habitacionId : '', otroLugar: '' })} />
          {esHabitacion ? <ChipGrid colors={colors} items={habitaciones.map((h: AdminHabitacion) => ({ id: h.id, label: `${h.numero} · Piso ${h.piso}` }))} selected={data.habitacionId} onSelect={(habitacionId) => setData({ habitacionId })} /> : data.area === 'Otro' ? <Input colors={colors} label="Lugar exacto" value={data.otroLugar} onChangeText={(otroLugar: string) => setData({ otroLugar })} placeholder="Ej. Escalera lateral piso 2" /> : null}
          <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Responsable</Text>
          <ChipGrid colors={colors} items={[{ id: '', label: 'Sin asignar' }, ...personal.map((p: AdminPersonalDisponible) => ({ id: p.id, label: p.nombre }))]} selected={data.asignadoA} onSelect={(asignadoA) => setData({ asignadoA })} />
          <TouchableOpacity style={[styles.button, { backgroundColor: data.prioridad === 'critica' ? colors.status.error : colors.gold.primary }]} disabled={procesando === 'crear-incidencia'} onPress={onConfirmar}><Text style={{ color: colors.text.inverse, fontWeight: '800' }}>{procesando === 'crear-incidencia' ? 'Guardando...' : 'Crear incidencia'}</Text></TouchableOpacity>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function RechazoModal({ visible, colors, motivo, setMotivo, procesando, onClose, onConfirmar }: any) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerOverlay}><View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: colors.status.error }]}>
        <Ionicons name="close-circle-outline" size={30} color={colors.status.error} />
        <Text style={[styles.centerTitle, { color: colors.text.primary }]}>Rechazar limpieza</Text>
        <Input colors={colors} label="Motivo obligatorio" value={motivo} onChangeText={setMotivo} placeholder="Describe qué debe corregirse..." multiline />
        <View style={styles.centerActions}><TouchableOpacity style={[styles.centerBtn, { borderColor: colors.border.primary }]} onPress={onClose}><Text style={{ color: colors.text.secondary }}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[styles.centerBtn, { backgroundColor: colors.status.error, borderColor: colors.status.error }]} disabled={Boolean(procesando)} onPress={onConfirmar}><Text style={{ color: colors.text.inverse }}>{procesando ? 'Procesando...' : 'Rechazar'}</Text></TouchableOpacity></View>
      </View></View>
    </Modal>
  );
}

function DetalleTareaModal({ visible, colors, tarea, personal, procesando, onClose, onReasignar, onAprobar, onRechazar }: any) {
  if (!tarea) return null;
  const listaChecklist = [
    ['Cama tendida', (tarea.checklist_ok ?? 0) > 0],
    ['Baño limpio', (tarea.checklist_ok ?? 0) > 1],
    ['Toallas completas', (tarea.checklist_ok ?? 0) > 2],
    ['Basurero vacío', (tarea.checklist_ok ?? 0) > 3],
    ['Piso limpio', (tarea.checklist_ok ?? 0) > 4],
    ['Insumos repuestos', (tarea.checklist_ok ?? 0) >= (tarea.checklist_total ?? 6)],
  ];
  const puedeRevisar = ['completada', 'finalizada', 'revision', 'en_revision'].includes(normalizar(tarea.estado));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <ModalHeader colors={colors} title={`Habitación ${tarea.habitacion_numero}`} subtitle="Detalle housekeeping" onClose={onClose} />
          <InfoGrid colors={colors} items={[
            ['Código', tarea.codigo],
            ['Estado', tarea.estado?.replace('_', ' ')],
            ['Prioridad', tarea.prioridad],
            ['Responsable', tarea.personal_nombre ?? 'Disponible / sin asignar'],
            ['Tipo', tarea.tipo_tarea ?? 'Limpieza'],
            ['Checklist', `${tarea.checklist_ok ?? 0}/${tarea.checklist_total ?? 0}`],
          ]} />
          <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Checklist / evidencias</Text>
          {listaChecklist.map(([label, ok]) => (
            <View key={String(label)} style={[styles.checkRow, { borderColor: colors.border.primary }]}>
              <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={ok ? colors.status.success : colors.text.muted} />
              <Text style={{ color: ok ? colors.text.primary : colors.text.muted, flex: 1 }}>{label}</Text>
            </View>
          ))}
          <Text style={[styles.meta, { color: colors.text.secondary }]}>Fotos/evidencias se mostrarán aquí cuando el RPC entregue URLs o la tabla de evidencias esté expuesta para móvil.</Text>
          <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Reasignar personal</Text>
          <ChipGrid colors={colors} items={personal.map((p: AdminPersonalDisponible) => ({ id: p.id, label: p.nombre }))} selected={tarea.personal_id ?? ''} onSelect={onReasignar} />
          {puedeRevisar ? (
            <View style={styles.centerActions}>
              <TouchableOpacity style={[styles.centerBtn, { borderColor: colors.status.error }]} disabled={procesando === tarea.id} onPress={onRechazar}><Text style={{ color: colors.status.error }}>Rechazar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.centerBtn, { backgroundColor: colors.status.success, borderColor: colors.status.success }]} disabled={procesando === tarea.id} onPress={onAprobar}><Text style={{ color: colors.text.inverse }}>Aprobar</Text></TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function DetalleIncidenciaModal({ visible, colors, incidencia, procesando, onClose, onAvanzar }: any) {
  if (!incidencia) return null;
  const cerrada = ['cerrada', 'rechazada'].includes(normalizar(incidencia.estado));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <ModalHeader colors={colors} title={incidencia.titulo} subtitle="Detalle incidencia" onClose={onClose} />
          <InfoGrid colors={colors} items={[
            ['Código', incidencia.codigo ?? 'Sin código'],
            ['Categoría', incidencia.categoria],
            ['Prioridad', incidencia.prioridad],
            ['Estado', incidencia.estado?.replace('_', ' ')],
            ['Habitación', incidencia.habitacion_num ?? incidencia.habitacion_id ?? 'Otra ubicación'],
            ['Asignado a', incidencia.asignado_a ?? 'Sin asignar'],
          ]} />
          <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Descripción</Text>
          <View style={[styles.noteBox, { borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}>
            <Text style={{ color: colors.text.secondary, lineHeight: 20 }}>{incidencia.descripcion ?? 'Sin descripción'}</Text>
          </View>
          {!cerrada ? (
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary, opacity: procesando === incidencia.id ? 0.6 : 1 }]} disabled={procesando === incidencia.id} onPress={onAvanzar}>
              <Text style={{ color: colors.text.inverse, fontWeight: '800' }}>{procesando === incidencia.id ? 'Actualizando...' : 'Avanzar estado'}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

function InfoGrid({ colors, items }: { colors: any; items: [string, string | number | null | undefined][] }) {
  return <View style={styles.infoGrid}>{items.map(([label, value]) => <View key={label} style={[styles.infoBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}><Text style={[styles.inputLabel, { color: colors.text.muted }]}>{label}</Text><Text style={{ color: colors.text.primary, fontSize: Typography.sm }}>{value ?? '—'}</Text></View>)}</View>;
}

function ModalHeader({ colors, title, subtitle, onClose }: any) {
  return <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={[styles.eyebrow, { color: colors.gold.primary }]}>{subtitle.toUpperCase()}</Text><Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text></View><TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}><Ionicons name="close" size={22} color={colors.text.primary} /></TouchableOpacity></View>;
}

function ChipGrid({ colors, items, selected, onSelect }: { colors: any; items: { id: string; label: string }[]; selected: string; onSelect: (id: string) => void }) {
  return <View style={styles.chips}>{items.map((item) => { const active = selected === item.id; return <TouchableOpacity key={`${item.id}-${item.label}`} onPress={() => onSelect(item.id)} style={[styles.chip, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}><Text numberOfLines={1} style={{ color: active ? colors.gold.primary : colors.text.secondary, fontSize: 11 }}>{item.label}</Text></TouchableOpacity>; })}</View>;
}

function Input({ colors, label, value, onChangeText, placeholder, multiline }: any) {
  return <View style={styles.inputGroup}>{label ? <Text style={[styles.inputLabel, { color: colors.text.muted }]}>{label}</Text> : null}<TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.text.muted} multiline={multiline} style={[styles.input, multiline && styles.inputMulti, { color: colors.text.primary, backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]} /></View>;
}

function ConfirmacionModal({ visible, colors, data, onClose, onConfirmar }: any) {
  return <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}><View style={styles.centerOverlay}><View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: data?.peligro ? colors.status.error : colors.border.gold }]}><Ionicons name={data?.peligro ? 'warning-outline' : 'shield-checkmark-outline'} size={30} color={data?.peligro ? colors.status.error : colors.gold.primary} /><Text style={[styles.centerTitle, { color: colors.text.primary }]}>{data?.titulo}</Text><Text style={[styles.centerText, { color: colors.text.secondary }]}>{data?.mensaje}</Text><View style={styles.centerActions}><TouchableOpacity style={[styles.centerBtn, { borderColor: colors.border.primary }]} onPress={onClose}><Text style={{ color: colors.text.secondary }}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[styles.centerBtn, { backgroundColor: data?.peligro ? colors.status.error : colors.gold.primary, borderColor: data?.peligro ? colors.status.error : colors.gold.primary }]} onPress={onConfirmar}><Text style={{ color: colors.text.inverse }}>Confirmar</Text></TouchableOpacity></View></View></View></Modal>;
}

function MensajeModal({ visible, colors, data, onClose }: any) {
  const tipo = data?.tipo ?? 'info';
  const color = tipo === 'ok' ? colors.status.success : tipo === 'error' ? colors.status.error : tipo === 'warning' ? colors.status.warning : colors.gold.primary;
  return <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}><View style={styles.centerOverlay}><View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: color }]}><Ionicons name={tipo === 'ok' ? 'checkmark-circle-outline' : tipo === 'error' ? 'close-circle-outline' : 'information-circle-outline'} size={30} color={color} /><Text style={[styles.centerTitle, { color: colors.text.primary }]}>{data?.titulo}</Text><Text style={[styles.centerText, { color: colors.text.secondary }]}>{data?.mensaje}</Text><TouchableOpacity style={[styles.button, { backgroundColor: color, alignSelf: 'stretch' }]} onPress={onClose}><Text style={{ color: colors.text.inverse, textAlign: 'center', fontWeight: '800' }}>Entendido</Text></TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: 14 },
  eyebrow: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: Typography.xxl, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: Typography.sm, marginTop: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 7, marginBottom: 8 },
  tab: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 8, alignItems: 'center', gap: 3 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, marginBottom: 8 },
  searchBox: { flex: 1, height: 42, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.sm, padding: 0 },
  newButton: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  filterShell: { minHeight: 46, marginBottom: 8 },
  filters: { gap: 7, paddingHorizontal: Spacing.md, paddingVertical: 4, alignItems: 'center' },
  filter: { width: 108, height: 31, borderWidth: 1, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  list: { padding: Spacing.md, paddingBottom: 36 },
  card: { marginBottom: 10 },
  auditCard: { marginBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  code: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  name: { fontSize: Typography.sm, fontWeight: '700', marginTop: 3 },
  meta: { fontSize: Typography.xs, lineHeight: 17, marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  miniBtn: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 120 },
  miniText: { fontSize: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  date: { fontSize: 9, marginTop: 10 },
  message: { textAlign: 'center', padding: 32, fontSize: Typography.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  modalContent: { padding: Spacing.md, paddingTop: 18, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 26, fontWeight: '800', marginTop: 3 },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 10, textTransform: 'uppercase' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoBox: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.md, padding: 11 },
  checkRow: { minHeight: 42, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 11, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noteBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 10 },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  inputGroup: { marginBottom: 10 },
  inputLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, fontSize: Typography.sm },
  inputMulti: { minHeight: 92, paddingTop: 10, textAlignVertical: 'top' },
  button: { borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', minHeight: 46, paddingHorizontal: 14, marginTop: 8 },
  centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  centerCard: { width: '100%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center' },
  centerTitle: { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  centerText: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  centerActions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 10 },
  centerBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
