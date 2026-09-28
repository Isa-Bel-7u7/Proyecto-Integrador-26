import React, { useCallback, useMemo, useState } from 'react';
import { Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AppCard from '../../components/common/AppCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useTheme } from '../../context/ThemeContext';
import type {
  AdminAnuncio,
  AdminClienteItem,
  AdminEmpleadoDetalle,
  AdminMensajeBuzon,
  AdminNotificacionItem,
  AdminPersonalTiempoReal,
  AdminSolicitudPermiso,
} from '../../interfaces';
import {
  aprobarPermisoAdministrador,
  cambiarRolEmpleadoAdministrador,
  crearAnuncioAdministrador,
  obtenerAnunciosAdministrador,
  obtenerBuzonAdministrador,
  obtenerClientesAdministrador,
  obtenerEmpleadosAdministrador,
  obtenerIncidenciasClienteAdministrador,
  obtenerNotificacionesAdministrador,
  obtenerPagosClienteAdministrador,
  obtenerPersonalTiempoRealAdministrador,
  obtenerReservasClienteAdministrador,
  obtenerResenasClienteAdministrador,
  obtenerSolicitudesPermisoAdministrador,
  responderBuzonAdministrador,
} from '../../services/adminService';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

type Seccion = 'personal' | 'clientes' | 'comunicacion' | 'notificaciones';
type Mensaje = { titulo: string; mensaje: string; tipo?: 'ok' | 'error' | 'warning' | 'info' } | null;
type Confirmacion = { titulo: string; mensaje: string; accion: () => Promise<void> | void; peligro?: boolean; clave?: string } | null;

const SECCIONES: { id: Seccion; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'personal', label: 'Personal', icon: 'people-outline' },
  { id: 'clientes', label: 'Clientes', icon: 'heart-outline' },
  { id: 'comunicacion', label: 'Comunicación', icon: 'chatbubbles-outline' },
  { id: 'notificaciones', label: 'Push', icon: 'notifications-outline' },
];

const FILTROS_PERSONAL = ['todos', 'activo', 'fuera_turno', 'descanso', 'en_tarea', 'vacaciones', 'permiso'];
const FILTROS_CLIENTES = ['todos', 'VIP', 'Oro', 'Platino', 'Diamante', 'bloqueado', 'activo'];
const FILTROS_BUZON = ['todos', 'nuevo', 'en_revision', 'respondido', 'cerrado'];
const ROLES = ['Administrador', 'Supervisor', 'Recepcionista', 'Housekeeping', 'Mantenimiento', 'Caja', 'Gerente', 'Empleado'];
const TIPOS_ANUNCIO = ['informativo', 'novedad', 'evento', 'promocion', 'otro'];

const normalizar = (v?: string | null) => (v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const money = (n?: number | null) => `Bs ${Number(n ?? 0).toFixed(2)}`;
const fecha = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const iniciales = (nombre?: string | null) => (nombre ?? 'CL').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'CL';

export default function AdminManagementScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [seccion, setSeccion] = useState<Seccion>('personal');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);

  const [empleados, setEmpleados] = useState<AdminEmpleadoDetalle[]>([]);
  const [tiempoReal, setTiempoReal] = useState<AdminPersonalTiempoReal[]>([]);
  const [permisos, setPermisos] = useState<AdminSolicitudPermiso[]>([]);
  const [clientes, setClientes] = useState<AdminClienteItem[]>([]);
  const [buzon, setBuzon] = useState<AdminMensajeBuzon[]>([]);
  const [anuncios, setAnuncios] = useState<AdminAnuncio[]>([]);
  const [notificaciones, setNotificaciones] = useState<AdminNotificacionItem[]>([]);

  const [personalSel, setPersonalSel] = useState<AdminEmpleadoDetalle | null>(null);
  const [clienteSel, setClienteSel] = useState<AdminClienteItem | null>(null);
  const [clienteExtra, setClienteExtra] = useState({ reservas: [] as any[], pagos: [] as any[], resenas: [] as any[], incidencias: [] as any[] });
  const [mensajeSel, setMensajeSel] = useState<AdminMensajeBuzon | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [estadoRespuesta, setEstadoRespuesta] = useState('respondido');
  const [rolForm, setRolForm] = useState({ rol: 'Empleado', codigo: '', motivo: '' });
  const [modalRol, setModalRol] = useState(false);
  const [modalAnuncio, setModalAnuncio] = useState(false);
  const [anuncioForm, setAnuncioForm] = useState({ titulo: '', descripcion: '', tipo: 'informativo', destinatario: 'todos' as 'clientes' | 'personal' | 'todos' });

  const mostrarMensaje = (titulo: string, texto: string, tipo: NonNullable<Mensaje>['tipo'] = 'info') => setMensaje({ titulo, mensaje: texto, tipo });
  const pedirConfirmacion = (titulo: string, texto: string, accion: () => Promise<void> | void, peligro = false, clave?: string) => setConfirmacion({ titulo, mensaje: texto, accion, peligro, clave });

  const cargar = useCallback(async () => {
    try {
      setError('');
      const [emp, tr, sol, cli, buz, anu, noti] = await Promise.allSettled([
        obtenerEmpleadosAdministrador(),
        obtenerPersonalTiempoRealAdministrador(),
        obtenerSolicitudesPermisoAdministrador(),
        obtenerClientesAdministrador(),
        obtenerBuzonAdministrador(),
        obtenerAnunciosAdministrador(),
        obtenerNotificacionesAdministrador(),
      ]);
      if (emp.status === 'fulfilled') setEmpleados(emp.value);
      if (tr.status === 'fulfilled') setTiempoReal(tr.value);
      if (sol.status === 'fulfilled') setPermisos(sol.value);
      if (cli.status === 'fulfilled') setClientes(cli.value);
      if (buz.status === 'fulfilled') setBuzon(buz.value);
      if (anu.status === 'fulfilled') setAnuncios(anu.value);
      if (noti.status === 'fulfilled') setNotificaciones(noti.value);
      const fallos = [emp, tr, sol, cli, buz, anu, noti].filter((r) => r.status === 'rejected');
      if (fallos.length >= 5) throw new Error('No se pudo cargar la información administrativa.');
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar Gestión.');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const filtros = seccion === 'personal' ? FILTROS_PERSONAL : seccion === 'clientes' ? FILTROS_CLIENTES : seccion === 'comunicacion' ? FILTROS_BUZON : ['todos', 'baja', 'media', 'alta', 'critica'];
  const q = normalizar(busqueda.trim());
  const mapaTiempo = useMemo(() => new Map(tiempoReal.map((p) => [p.personal_id, p])), [tiempoReal]);

  const empleadosFiltrados = useMemo(() => empleados.filter((e) => {
    const tr = mapaTiempo.get(e.id);
    const estado = normalizar(tr?.estado_asistencia ?? e.asistencia_hoy ?? e.estado);
    const enTarea = Number(tr?.tareas_pendientes ?? 0) > 0;
    const okFiltro = filtro === 'todos'
      || (filtro === 'en_tarea' && enTarea)
      || (filtro === 'fuera_turno' && ['ausente', 'sin_registro', 'inactivo'].includes(estado))
      || estado === normalizar(filtro)
      || normalizar(e.estado) === normalizar(filtro);
    const okQ = !q || [e.nombre, e.email, e.cargo, e.rol, e.area, e.telefono].some((v) => normalizar(v).includes(q));
    return okFiltro && okQ;
  }), [empleados, filtro, mapaTiempo, q]);

  const clientesFiltrados = useMemo(() => clientes.filter((c) => {
    const nivel = normalizar(c.nivel_fidelidad);
    const okFiltro = filtro === 'todos'
      || (filtro === 'VIP' && ['oro', 'platino', 'diamante'].includes(nivel))
      || nivel === normalizar(filtro)
      || normalizar(c.estado) === normalizar(filtro);
    const okQ = !q || [c.nombre_completo, c.correo, c.numero_documento, c.telefono, c.ciudad, c.pais].some((v) => normalizar(v).includes(q));
    return okFiltro && okQ;
  }), [clientes, filtro, q]);

  const buzonFiltrado = useMemo(() => buzon.filter((m) => {
    const okFiltro = filtro === 'todos' || normalizar(m.estado) === normalizar(filtro);
    const okQ = !q || [m.asunto, m.mensaje, m.tipo, m.nombre_contacto, m.usuarios?.nombre_completo].some((v) => normalizar(v).includes(q));
    return okFiltro && okQ;
  }), [buzon, filtro, q]);

  const notisFiltradas = useMemo(() => notificaciones.filter((n) => {
    const prioridad = normalizar(n.prioridad);
    const okFiltro = filtro === 'todos' || prioridad === normalizar(filtro);
    const okQ = !q || [n.titulo, n.mensaje, n.tipo, n.referencia_tipo].some((v) => normalizar(v).includes(q));
    return okFiltro && okQ;
  }), [filtro, notificaciones, q]);

  const abrirCliente = async (cliente: AdminClienteItem) => {
    setClienteSel(cliente);
    setClienteExtra({ reservas: [], pagos: [], resenas: [], incidencias: [] });
    const [reservas, pagos, resenas, incidencias] = await Promise.all([
      obtenerReservasClienteAdministrador(cliente.id),
      obtenerPagosClienteAdministrador(cliente.id),
      obtenerResenasClienteAdministrador(cliente.id),
      obtenerIncidenciasClienteAdministrador(cliente.id),
    ]);
    setClienteExtra({ reservas, pagos, resenas, incidencias });
  };

  const aprobarPermiso = (permiso: AdminSolicitudPermiso, aprobado: boolean) => pedirConfirmacion(
    aprobado ? 'Aprobar permiso' : 'Rechazar permiso',
    `${permiso.nombre} solicitó ${permiso.tipo} del ${fecha(permiso.fecha_inicio)} al ${fecha(permiso.fecha_fin)}. Se guardará en historial si el RPC lo permite.`,
    async () => {
      setProcesando(permiso.id);
      try {
        await aprobarPermisoAdministrador(permiso.id, aprobado);
        await cargar();
        mostrarMensaje(aprobado ? 'Permiso aprobado' : 'Permiso rechazado', 'El trabajador será notificado por el sistema web/app si la base lo tiene habilitado.', aprobado ? 'ok' : 'warning');
      } catch (e: any) { mostrarMensaje('No se pudo actualizar', e.message, 'error'); }
      finally { setProcesando(null); }
    },
    !aprobado,
  );

  const abrirCambioRol = (empleado: AdminEmpleadoDetalle) => {
    setPersonalSel(empleado);
    setRolForm({ rol: empleado.rol ?? 'Empleado', codigo: '', motivo: '' });
    setModalRol(true);
  };

  const guardarRol = () => {
    if (!personalSel) return;
    if (!ROLES.includes(rolForm.rol)) return mostrarMensaje('Rol inválido', 'Selecciona un rol válido.', 'warning');
    if (rolForm.codigo.trim() !== 'CAMBIAR ROL') return mostrarMensaje('Confirmación requerida', 'Escribe CAMBIAR ROL para confirmar una acción de seguridad.', 'warning');
    if (rolForm.motivo.trim().length < 8) return mostrarMensaje('Motivo requerido', 'Explica por qué se cambia el rol.', 'warning');
    pedirConfirmacion('Cambio de rol sensible', `Se cambiará el rol de ${personalSel.nombre} a ${rolForm.rol}. Esto afecta permisos y seguridad.`, async () => {
      setProcesando('rol');
      try {
        await cambiarRolEmpleadoAdministrador({
          personalId: personalSel.id,
          nombre: personalSel.nombre,
          cargo: personalSel.cargo,
          area: personalSel.area,
          rol: rolForm.rol,
          documento: personalSel.documento,
          telefono: personalSel.telefono,
          direccion: personalSel.direccion,
          fechaContratacion: personalSel.fecha_contratacion,
        });
        setModalRol(false);
        await cargar();
        mostrarMensaje('Rol actualizado', 'El cambio fue enviado al RPC de empleados.', 'ok');
      } catch (e: any) { mostrarMensaje('No se pudo cambiar rol', e.message, 'error'); }
      finally { setProcesando(null); }
    }, true, 'CAMBIAR ROL');
  };

  const enviarRespuesta = async () => {
    if (!mensajeSel) return;
    if (respuesta.trim().length < 6) return mostrarMensaje('Respuesta muy corta', 'Escribe una respuesta clara para el cliente o empleado.', 'warning');
    if (!['en_revision', 'respondido', 'cerrado', 'descartado'].includes(estadoRespuesta)) return mostrarMensaje('Estado inválido', 'Selecciona un estado válido.', 'warning');
    setProcesando('respuesta');
    try {
      await responderBuzonAdministrador(mensajeSel.id, respuesta, estadoRespuesta);
      setMensajeSel(null);
      await cargar();
      mostrarMensaje('Respuesta enviada', 'El mensaje quedó actualizado en el buzón.', 'ok');
    } catch (e: any) { mostrarMensaje('No se pudo responder', e.message, 'error'); }
    finally { setProcesando(null); }
  };

  const crearAnuncio = async () => {
    if (anuncioForm.titulo.trim().length < 5) return mostrarMensaje('Título requerido', 'El anuncio necesita un título claro.', 'warning');
    if (anuncioForm.descripcion.trim().length < 10) return mostrarMensaje('Mensaje requerido', 'Escribe el contenido del anuncio.', 'warning');
    if (!TIPOS_ANUNCIO.includes(anuncioForm.tipo)) return mostrarMensaje('Tipo inválido', 'Selecciona un tipo válido.', 'warning');
    setProcesando('anuncio');
    try {
      await crearAnuncioAdministrador(anuncioForm);
      setModalAnuncio(false);
      setAnuncioForm({ titulo: '', descripcion: '', tipo: 'informativo', destinatario: 'todos' });
      await cargar();
      mostrarMensaje('Anuncio enviado', 'El comunicado quedó registrado para los destinatarios seleccionados.', 'ok');
    } catch (e: any) { mostrarMensaje('No se pudo crear anuncio', e.message, 'error'); }
    finally { setProcesando(null); }
  };

  const abrirNotificacion = (notificacion: AdminNotificacionItem) => {
    const tipo = normalizar(`${notificacion.tipo} ${notificacion.referencia_tipo}`);
    if (tipo.includes('housekeeping') || tipo.includes('limpieza')) {
      navigation.navigate('AdminControl', { seccion: 'housekeeping' });
      return;
    }
    if (tipo.includes('incidencia') || tipo.includes('mantenimiento')) {
      navigation.navigate('AdminControl', { seccion: 'incidencias' });
      return;
    }
    if (tipo.includes('pago')) {
      navigation.navigate('AdminOperaciones', { seccion: 'pagos' });
      return;
    }
    if (tipo.includes('checkin')) {
      navigation.navigate('AdminOperaciones', { seccion: 'checkin' });
      return;
    }
    if (tipo.includes('checkout')) {
      navigation.navigate('AdminOperaciones', { seccion: 'checkout' });
      return;
    }
    if (tipo.includes('reserva')) {
      navigation.navigate('AdminOperaciones', { seccion: 'reservas' });
      return;
    }
    if (tipo.includes('habitacion')) {
      navigation.navigate('AdminHabitaciones');
      return;
    }
    setSeccion('comunicacion');
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>ADMINISTRACIÓN</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Gestión</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Personal, clientes, comunicación y alertas</Text>
      </View>

      <View style={styles.tabShell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {SECCIONES.map((item) => {
            const active = seccion === item.id;
            return <TouchableOpacity key={item.id} style={[styles.tab, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]} onPress={() => { setSeccion(item.id); setFiltro('todos'); setBusqueda(''); }}>
              <Ionicons name={item.icon} size={16} color={active ? colors.gold.primary : colors.text.muted} />
              <Text style={{ color: active ? colors.gold.primary : colors.text.muted, fontSize: 10, fontWeight: '700' }}>{item.label}</Text>
            </TouchableOpacity>;
          })}
        </ScrollView>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
          <Ionicons name="search-outline" size={16} color={colors.text.muted} />
          <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre, código, estado..." placeholderTextColor={colors.text.muted} style={[styles.searchInput, { color: colors.text.primary }]} />
        </View>
        {seccion === 'comunicacion' ? <TouchableOpacity style={[styles.newButton, { backgroundColor: colors.gold.primary }]} onPress={() => setModalAnuncio(true)}><Ionicons name="megaphone-outline" size={20} color={colors.text.inverse} /></TouchableOpacity> : null}
      </View>

      <View style={styles.filterShell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filtros.map((f) => {
            const active = filtro === f;
            return <TouchableOpacity key={f} onPress={() => setFiltro(f)} style={[styles.filter, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}>
              <Text numberOfLines={1} style={{ color: active ? colors.gold.primary : colors.text.muted, fontSize: 10, textTransform: 'capitalize' }}>{f.replace('_', ' ')}</Text>
            </TouchableOpacity>;
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}>
        {error ? <Text style={[styles.message, { color: colors.status.error }]}>{error}</Text> : null}

        {seccion === 'personal' ? (
          <>
            <StatsRow colors={colors} stats={[['Activos', empleados.filter((e) => normalizar(e.estado) === 'activo').length], ['En tarea', tiempoReal.filter((p) => Number(p.tareas_pendientes ?? 0) > 0).length], ['Permisos', permisos.filter((p) => normalizar(p.estado) === 'pendiente').length]]} />
            {permisos.filter((p) => normalizar(p.estado) === 'pendiente').slice(0, 3).map((p) => <PermisoCard key={p.id} colors={colors} permiso={p} procesando={procesando} onAprobar={() => aprobarPermiso(p, true)} onRechazar={() => aprobarPermiso(p, false)} />)}
            {empleadosFiltrados.map((e) => <EmpleadoCard key={e.id} colors={colors} empleado={e} tiempo={mapaTiempo.get(e.id)} onPress={() => setPersonalSel(e)} onCambiarRol={() => abrirCambioRol(e)} />)}
          </>
        ) : null}

        {seccion === 'clientes' ? (
          <>
            <StatsRow colors={colors} stats={[['Clientes', clientes.length], ['VIP', clientes.filter((c) => ['oro', 'platino', 'diamante'].includes(normalizar(c.nivel_fidelidad))).length], ['Bloqueados', clientes.filter((c) => normalizar(c.estado) === 'bloqueado').length]]} />
            {clientesFiltrados.map((c) => <ClienteCard key={c.id} colors={colors} cliente={c} onPress={() => void abrirCliente(c)} />)}
          </>
        ) : null}

        {seccion === 'comunicacion' ? (
          <>
            <StatsRow colors={colors} stats={[['Mensajes', buzon.length], ['Nuevos', buzon.filter((m) => normalizar(m.estado) === 'nuevo').length], ['Anuncios', anuncios.length]]} />
            {buzonFiltrado.map((m) => <MensajeCard key={m.id} colors={colors} mensaje={m} onPress={() => { setMensajeSel(m); setRespuesta(m.respuesta ?? ''); setEstadoRespuesta(m.estado === 'nuevo' ? 'en_revision' : m.estado); }} />)}
            <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Anuncios recientes</Text>
            {anuncios.slice(0, 5).map((a) => <AnuncioCard key={a.id} colors={colors} anuncio={a} />)}
          </>
        ) : null}

        {seccion === 'notificaciones' ? (
          <>
            <PushInfo colors={colors} />
            {notisFiltradas.map((n) => <NotificacionCard key={n.id} colors={colors} notificacion={n} onPress={() => abrirNotificacion(n)} />)}
          </>
        ) : null}

        {!error && ((seccion === 'personal' && !empleadosFiltrados.length) || (seccion === 'clientes' && !clientesFiltrados.length) || (seccion === 'comunicacion' && !buzonFiltrado.length) || (seccion === 'notificaciones' && !notisFiltradas.length)) ? (
          <Text style={[styles.message, { color: colors.text.muted }]}>No hay datos para este filtro.</Text>
        ) : null}
      </ScrollView>

      <EmpleadoDetalle visible={Boolean(personalSel) && !modalRol} colors={colors} empleado={personalSel} tiempo={personalSel ? mapaTiempo.get(personalSel.id) : null} permisos={permisos.filter((p) => p.personal_id === personalSel?.id)} onClose={() => setPersonalSel(null)} onCambiarRol={() => personalSel && abrirCambioRol(personalSel)} />
      <ClienteDetalle visible={Boolean(clienteSel)} colors={colors} cliente={clienteSel} extra={clienteExtra} onClose={() => setClienteSel(null)} />
      <RolModal visible={modalRol} colors={colors} form={rolForm} setForm={(p: Partial<typeof rolForm>) => setRolForm((v) => ({ ...v, ...p }))} procesando={procesando} onClose={() => setModalRol(false)} onGuardar={guardarRol} />
      <RespuestaModal visible={Boolean(mensajeSel)} colors={colors} mensaje={mensajeSel} respuesta={respuesta} setRespuesta={setRespuesta} estado={estadoRespuesta} setEstado={setEstadoRespuesta} procesando={procesando} onClose={() => setMensajeSel(null)} onGuardar={() => void enviarRespuesta()} />
      <AnuncioModal visible={modalAnuncio} colors={colors} form={anuncioForm} setForm={(p: Partial<typeof anuncioForm>) => setAnuncioForm((v) => ({ ...v, ...p }))} procesando={procesando} onClose={() => setModalAnuncio(false)} onGuardar={() => void crearAnuncio()} />
      <ConfirmacionModal visible={Boolean(confirmacion)} colors={colors} data={confirmacion} onClose={() => setConfirmacion(null)} onConfirmar={async () => { const actual = confirmacion; setConfirmacion(null); await actual?.accion(); }} />
      <MensajeModal visible={Boolean(mensaje)} colors={colors} data={mensaje} onClose={() => setMensaje(null)} />
    </View>
  );
}

function StatsRow({ colors, stats }: { colors: any; stats: [string, number][] }) {
  return <View style={styles.statsRow}>{stats.map(([label, value]) => <AppCard key={label} style={styles.statCard}><Text style={[styles.statValue, { color: colors.text.primary }]}>{value}</Text><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{label}</Text></AppCard>)}</View>;
}

function EmpleadoCard({ colors, empleado, tiempo, onPress, onCambiarRol }: any) {
  const enTarea = Number(tiempo?.tareas_pendientes ?? 0) > 0;
  const estado = enTarea ? 'En tarea' : (tiempo?.estado_asistencia ?? empleado.estado ?? 'Sin registro');
  const color = enTarea ? colors.status.info : normalizar(estado) === 'activo' || normalizar(estado) === 'presente' ? colors.status.success : normalizar(estado) === 'vacaciones' ? colors.status.info : colors.text.muted;
  return <TouchableOpacity activeOpacity={0.9} onPress={onPress}><AppCard style={styles.card}><View style={styles.cardTop}><View style={[styles.avatar, { backgroundColor: `${color}18` }]}><Ionicons name="person-outline" size={18} color={color} /></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text.primary }]}>{empleado.nombre}</Text><Text style={[styles.meta, { color: colors.text.secondary }]}>{empleado.cargo ?? 'Sin cargo'} · {empleado.area ?? empleado.rol ?? 'Sin área'}</Text></View><Text style={{ color, fontSize: 10, fontWeight: '800' }}>{estado}</Text></View><View style={styles.footer}><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{tiempo?.turno ?? empleado.turno_hoy ?? 'Sin turno hoy'}</Text><TouchableOpacity onPress={onCambiarRol}><Text style={{ color: colors.gold.primary, fontSize: 12, fontWeight: '800' }}>Cambiar rol</Text></TouchableOpacity></View></AppCard></TouchableOpacity>;
}

function PermisoCard({ colors, permiso, procesando, onAprobar, onRechazar }: any) {
  return <AppCard style={{ ...styles.card, borderTopWidth: 3, borderTopColor: colors.status.warning }}><Text style={[styles.code, { color: colors.status.warning }]}>SOLICITUD DE PERMISO</Text><Text style={[styles.name, { color: colors.text.primary }]}>{permiso.nombre}</Text><Text style={[styles.meta, { color: colors.text.secondary }]}>{permiso.tipo} · {fecha(permiso.fecha_inicio)} → {fecha(permiso.fecha_fin)}</Text><Text style={[styles.metaSmall, { color: colors.text.muted }]} numberOfLines={2}>{permiso.motivo ?? 'Sin motivo registrado'}</Text><View style={styles.footer}><TouchableOpacity disabled={procesando === permiso.id} onPress={onRechazar}><Text style={{ color: colors.status.error, fontWeight: '800' }}>Rechazar</Text></TouchableOpacity><TouchableOpacity disabled={procesando === permiso.id} onPress={onAprobar}><Text style={{ color: colors.status.success, fontWeight: '800' }}>Aprobar</Text></TouchableOpacity></View></AppCard>;
}

function ClienteCard({ colors, cliente, onPress }: any) {
  const nivel = cliente.nivel_fidelidad ?? 'Visitante';
  const vip = ['Oro', 'Platino', 'Diamante'].includes(nivel);
  return <TouchableOpacity activeOpacity={0.9} onPress={onPress}><AppCard style={styles.card}><View style={styles.cardTop}><ClienteAvatar colors={colors} cliente={cliente} vip={vip} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text.primary }]}>{cliente.nombre_completo}</Text><Text style={[styles.meta, { color: colors.text.secondary }]}>{cliente.correo || 'Correo pendiente'} · {cliente.telefono || 'Teléfono pendiente'}</Text></View><Text style={{ color: vip ? colors.gold.primary : colors.text.muted, fontSize: 10, fontWeight: '800' }}>{nivel}</Text></View><View style={styles.footer}><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{cliente.ciudad ?? 'Sin ciudad'}, {cliente.pais ?? 'Sin país'}</Text><Text style={{ color: colors.status.success, fontWeight: '700' }}>{money(cliente.total_gastado)}</Text></View></AppCard></TouchableOpacity>;
}

function ClienteAvatar({ colors, cliente, vip, size = 38 }: any) {
  const borderColor = vip ? colors.gold.primary : colors.border.primary;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: vip ? `${colors.gold.primary}18` : colors.bg.tertiary, borderColor }]}>
      {cliente.foto_url ? (
        <Image source={{ uri: cliente.foto_url }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} resizeMode="cover" />
      ) : (
        <Text style={{ color: vip ? colors.gold.primary : colors.text.secondary, fontWeight: '800', fontSize: size > 50 ? 18 : 12 }}>{iniciales(cliente.nombre_completo)}</Text>
      )}
    </View>
  );
}

function MensajeCard({ colors, mensaje, onPress }: any) {
  const nuevo = normalizar(mensaje.estado) === 'nuevo';
  return <TouchableOpacity activeOpacity={0.9} onPress={onPress}><AppCard style={{ ...styles.card, borderLeftWidth: 3, borderLeftColor: nuevo ? colors.gold.primary : colors.border.primary }}><View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={[styles.code, { color: colors.gold.primary }]}>{mensaje.tipo?.toUpperCase()}</Text><Text style={[styles.name, { color: colors.text.primary }]}>{mensaje.asunto}</Text></View><Text style={{ color: nuevo ? colors.gold.primary : colors.text.muted, fontSize: 10, fontWeight: '800' }}>{mensaje.estado}</Text></View><Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={2}>{mensaje.mensaje}</Text><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{mensaje.anonimo ? 'Anónimo' : mensaje.usuarios?.nombre_completo ?? mensaje.nombre_contacto ?? 'Sin remitente'} · {fecha(mensaje.created_at)}</Text></AppCard></TouchableOpacity>;
}

function AnuncioCard({ colors, anuncio }: any) {
  return <AppCard style={styles.card}><View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={[styles.code, { color: colors.gold.primary }]}>{anuncio.tipo?.toUpperCase()}</Text><Text style={[styles.name, { color: colors.text.primary }]}>{anuncio.titulo}</Text></View><Text style={{ color: anuncio.activo ? colors.status.success : colors.text.muted, fontSize: 10, fontWeight: '800' }}>{anuncio.activo ? 'Activo' : 'Inactivo'}</Text></View><Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={2}>{anuncio.descripcion ?? anuncio.subtitulo ?? 'Sin descripción'}</Text></AppCard>;
}

function NotificacionCard({ colors, notificacion, onPress }: any) {
  const pr = normalizar(notificacion.prioridad);
  const color = pr === 'critica' ? colors.status.error : pr === 'alta' ? colors.status.warning : pr === 'media' ? colors.gold.primary : colors.text.muted;
  return <TouchableOpacity activeOpacity={0.9} onPress={onPress}><AppCard style={styles.card}><View style={styles.cardTop}><Ionicons name={pr === 'critica' ? 'alert-circle-outline' : 'notifications-outline'} size={20} color={color} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text.primary }]}>{notificacion.titulo}</Text><Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={2}>{notificacion.mensaje}</Text></View><Text style={{ color, fontSize: 10, fontWeight: '800' }}>{notificacion.prioridad ?? 'media'}</Text></View><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{notificacion.tipo} · {fecha(notificacion.created_at)} · Toca para abrir módulo</Text></AppCard></TouchableOpacity>;
}

function PushInfo({ colors }: any) {
  return <AppCard style={{ ...styles.card, borderTopWidth: 3, borderTopColor: colors.gold.primary }}><Text style={[styles.name, { color: colors.text.primary }]}>Notificaciones push tipo WhatsApp</Text><Text style={[styles.meta, { color: colors.text.secondary }]}>La app ya clasifica prioridades y muestra alertas. Para sonar/vibrar con la app cerrada falta conectar expo-notifications, token del dispositivo y envío desde backend/Supabase Edge Function.</Text><View style={styles.priorityGrid}>{[['Baja', 'sin sonido fuerte'], ['Media', 'sonido normal'], ['Alta', 'sonido + vibración'], ['Crítica', 'alerta persistente']].map(([a, b]) => <View key={a} style={[styles.priorityItem, { borderColor: colors.border.primary }]}><Text style={[styles.code, { color: colors.gold.primary }]}>{a}</Text><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{b}</Text></View>)}</View></AppCard>;
}

function EmpleadoDetalle({ visible, colors, empleado, tiempo, permisos, onClose, onCambiarRol }: any) {
  if (!empleado) return null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}><ScrollView contentContainerStyle={styles.modalContent}><ModalHeader colors={colors} title={empleado.nombre} subtitle="Ficha personal" onClose={onClose} /><InfoGrid colors={colors} items={[['Rol', empleado.rol], ['Cargo', empleado.cargo], ['Área', empleado.area], ['Estado', empleado.estado], ['Asistencia', tiempo?.estado_asistencia ?? empleado.asistencia_hoy], ['Turno', tiempo?.turno ?? empleado.turno_hoy], ['Tareas', tiempo?.tareas_pendientes ?? 0], ['Teléfono', empleado.telefono]]} /><TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary }]} onPress={onCambiarRol}><Text style={{ color: colors.text.inverse, fontWeight: '800' }}>Cambiar rol con confirmación</Text></TouchableOpacity><Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Permisos / vacaciones</Text>{permisos.length ? permisos.map((p: AdminSolicitudPermiso) => <Text key={p.id} style={[styles.meta, { color: colors.text.secondary }]}>{p.tipo} · {fecha(p.fecha_inicio)} · {p.estado}</Text>) : <Text style={[styles.meta, { color: colors.text.muted }]}>Sin solicitudes registradas.</Text>}</ScrollView></View></View></Modal>;
}

function ClienteDetalle({ visible, colors, cliente, extra, onClose }: any) {
  if (!cliente) return null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}><ScrollView contentContainerStyle={styles.modalContent}><ModalHeader colors={colors} title={cliente.nombre_completo} subtitle="Ficha cliente" onClose={onClose} /><View style={styles.clientHeader}><ClienteAvatar colors={colors} cliente={cliente} vip={['Oro', 'Platino', 'Diamante'].includes(cliente.nivel_fidelidad ?? '')} size={68} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text.primary }]}>{cliente.nombre_completo}</Text><Text style={[styles.meta, { color: colors.text.secondary }]}>{cliente.correo || 'Correo pendiente'}</Text><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{cliente.telefono || 'Teléfono pendiente'}</Text></View></View><InfoGrid colors={colors} items={[['Nivel', cliente.nivel_fidelidad], ['Puntos', cliente.puntos_fidelidad ?? 0], ['Documento', `${cliente.tipo_documento ?? ''} ${cliente.numero_documento ?? ''}`.trim()], ['Total gastado', money(cliente.total_gastado)], ['Reservas', cliente.total_reservas_completadas ?? extra.reservas.length], ['Estado', cliente.estado], ['Ciudad', cliente.ciudad], ['País', cliente.pais]]} /><Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Historial de reservas</Text>{extra.reservas.slice(0, 5).map((r: any) => <HistoryRow key={r.id ?? r.codigo_reserva} colors={colors} title={r.codigo_reserva ?? 'Reserva'} text={`${fecha(r.fecha_entrada)} → ${fecha(r.fecha_salida)} · ${r.estado ?? ''}`} />)}<Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Pagos / reseñas / incidencias</Text><Text style={[styles.meta, { color: colors.text.secondary }]}>Pagos: {extra.pagos.length} · Reseñas: {extra.resenas.length} · Quejas/incidencias: {extra.incidencias.length}</Text>{['Oro', 'Platino', 'Diamante'].includes(cliente.nivel_fidelidad ?? '') ? <View style={[styles.vipBox, { borderColor: colors.gold.primary, backgroundColor: `${colors.gold.primary}12` }]}><Ionicons name="sparkles-outline" size={18} color={colors.gold.primary} /><Text style={{ color: colors.gold.primary, flex: 1 }}>Huésped frecuente/VIP. Revisa preferencias antes de su llegada.</Text></View> : null}</ScrollView></View></View></Modal>;
}

function RolModal({ visible, colors, form, setForm, procesando, onClose, onGuardar }: any) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.centerOverlay}><View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: colors.status.error }]}><Ionicons name="shield-checkmark-outline" size={30} color={colors.status.error} /><Text style={[styles.centerTitle, { color: colors.text.primary }]}>Cambio de rol</Text><Text style={[styles.centerText, { color: colors.text.secondary }]}>Acción sensible. Requiere motivo y escribir CAMBIAR ROL.</Text><ChipGrid colors={colors} items={ROLES.map((r) => ({ id: r, label: r }))} selected={form.rol} onSelect={(rol) => setForm({ rol })} /><Input colors={colors} label="Motivo" value={form.motivo} onChangeText={(motivo: string) => setForm({ motivo })} placeholder="Ej. Cambio autorizado por gerencia" multiline /><Input colors={colors} label="Confirmación" value={form.codigo} onChangeText={(codigo: string) => setForm({ codigo })} placeholder="CAMBIAR ROL" /><View style={styles.centerActions}><TouchableOpacity style={[styles.centerBtn, { borderColor: colors.border.primary }]} onPress={onClose}><Text style={{ color: colors.text.secondary }}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[styles.centerBtn, { backgroundColor: colors.status.error, borderColor: colors.status.error }]} disabled={procesando === 'rol'} onPress={onGuardar}><Text style={{ color: colors.text.inverse }}>{procesando === 'rol' ? 'Guardando...' : 'Cambiar'}</Text></TouchableOpacity></View></View></View></Modal>;
}

function RespuestaModal({ visible, colors, mensaje, respuesta, setRespuesta, estado, setEstado, procesando, onClose, onGuardar }: any) {
  if (!mensaje) return null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}><ScrollView contentContainerStyle={styles.modalContent}><ModalHeader colors={colors} title={mensaje.asunto} subtitle="Responder mensaje" onClose={onClose} /><View style={[styles.noteBox, { borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}><Text style={{ color: colors.text.secondary }}>{mensaje.mensaje}</Text></View><Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Estado</Text><ChipGrid colors={colors} items={['en_revision', 'respondido', 'cerrado', 'descartado'].map((e) => ({ id: e, label: e.replace('_', ' ') }))} selected={estado} onSelect={setEstado} /><Input colors={colors} label="Respuesta" value={respuesta} onChangeText={setRespuesta} placeholder="Escribe una respuesta clara..." multiline /><TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary }]} disabled={procesando === 'respuesta'} onPress={onGuardar}><Text style={{ color: colors.text.inverse, fontWeight: '800' }}>{procesando === 'respuesta' ? 'Enviando...' : 'Responder'}</Text></TouchableOpacity></ScrollView></View></View></Modal>;
}

function AnuncioModal({ visible, colors, form, setForm, procesando, onClose, onGuardar }: any) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: colors.bg.primary }]}><ScrollView contentContainerStyle={styles.modalContent}><ModalHeader colors={colors} title="Nuevo anuncio" subtitle="Comunicación" onClose={onClose} /><Input colors={colors} label="Título" value={form.titulo} onChangeText={(titulo: string) => setForm({ titulo })} placeholder="Ej. Desayuno hasta las 10:00" /><Input colors={colors} label="Mensaje" value={form.descripcion} onChangeText={(descripcion: string) => setForm({ descripcion })} placeholder="Contenido del comunicado" multiline /><Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Destinatarios</Text><ChipGrid colors={colors} items={[{ id: 'todos', label: 'Todos' }, { id: 'clientes', label: 'Clientes' }, { id: 'personal', label: 'Personal' }]} selected={form.destinatario} onSelect={(destinatario) => setForm({ destinatario })} /><Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Tipo</Text><ChipGrid colors={colors} items={TIPOS_ANUNCIO.map((t) => ({ id: t, label: t }))} selected={form.tipo} onSelect={(tipo) => setForm({ tipo })} /><TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary }]} disabled={procesando === 'anuncio'} onPress={onGuardar}><Text style={{ color: colors.text.inverse, fontWeight: '800' }}>{procesando === 'anuncio' ? 'Enviando...' : 'Enviar anuncio'}</Text></TouchableOpacity></ScrollView></View></View></Modal>;
}

function HistoryRow({ colors, title, text }: any) {
  return <View style={[styles.historyRow, { borderColor: colors.border.primary }]}><Text style={[styles.name, { color: colors.text.primary }]}>{title}</Text><Text style={[styles.metaSmall, { color: colors.text.muted }]}>{text}</Text></View>;
}

function ModalHeader({ colors, title, subtitle, onClose }: any) {
  return <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={[styles.eyebrow, { color: colors.gold.primary }]}>{subtitle.toUpperCase()}</Text><Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text></View><TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}><Ionicons name="close" size={22} color={colors.text.primary} /></TouchableOpacity></View>;
}

function InfoGrid({ colors, items }: { colors: any; items: [string, string | number | null | undefined][] }) {
  return <View style={styles.infoGrid}>{items.map(([label, value]) => <View key={label} style={[styles.infoBox, { borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}><Text style={[styles.infoLabel, { color: colors.text.muted }]}>{label}</Text><Text style={{ color: colors.text.primary, fontSize: Typography.sm }}>{value ?? '—'}</Text></View>)}</View>;
}

function ChipGrid({ colors, items, selected, onSelect }: { colors: any; items: { id: string; label: string }[]; selected: string; onSelect: (id: string) => void }) {
  return <View style={styles.chips}>{items.map((item) => { const active = selected === item.id; return <TouchableOpacity key={`${item.id}-${item.label}`} onPress={() => onSelect(item.id)} style={[styles.chip, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}><Text numberOfLines={1} style={{ color: active ? colors.gold.primary : colors.text.secondary, fontSize: 11 }}>{item.label}</Text></TouchableOpacity>; })}</View>;
}

function Input({ colors, label, value, onChangeText, placeholder, multiline }: any) {
  return <View style={styles.inputGroup}><Text style={[styles.infoLabel, { color: colors.text.muted }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.text.muted} multiline={multiline} style={[styles.input, multiline && styles.inputMulti, { color: colors.text.primary, backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]} /></View>;
}

function ConfirmacionModal({ visible, colors, data, onClose, onConfirmar }: any) {
  return <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}><View style={styles.centerOverlay}><View style={[styles.centerCard, { backgroundColor: colors.bg.secondary, borderColor: data?.peligro ? colors.status.error : colors.border.gold }]}><Ionicons name={data?.peligro ? 'warning-outline' : 'shield-checkmark-outline'} size={30} color={data?.peligro ? colors.status.error : colors.gold.primary} /><Text style={[styles.centerTitle, { color: colors.text.primary }]}>{data?.titulo}</Text><Text style={[styles.centerText, { color: colors.text.secondary }]}>{data?.mensaje}</Text>{data?.clave ? <Text style={[styles.metaSmall, { color: colors.status.error, textAlign: 'center' }]}>Confirmación reforzada: {data.clave}</Text> : null}<View style={styles.centerActions}><TouchableOpacity style={[styles.centerBtn, { borderColor: colors.border.primary }]} onPress={onClose}><Text style={{ color: colors.text.secondary }}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[styles.centerBtn, { backgroundColor: data?.peligro ? colors.status.error : colors.gold.primary, borderColor: data?.peligro ? colors.status.error : colors.gold.primary }]} onPress={onConfirmar}><Text style={{ color: colors.text.inverse }}>Confirmar</Text></TouchableOpacity></View></View></View></Modal>;
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
  tabShell: { minHeight: 48, marginBottom: 6 },
  tabs: { gap: 7, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  tab: { width: 112, minHeight: 38, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', gap: 3 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, marginBottom: 8 },
  searchBox: { flex: 1, height: 42, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.sm, padding: 0 },
  newButton: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  filterShell: { minHeight: 46, marginBottom: 8 },
  filters: { gap: 7, paddingHorizontal: Spacing.md, paddingVertical: 4, alignItems: 'center' },
  filter: { width: 108, height: 31, borderWidth: 1, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  list: { padding: Spacing.md, paddingBottom: 36 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: { flex: 1 },
  statValue: { fontSize: Typography.lg, fontWeight: '800' },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  clientHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  code: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  name: { fontSize: Typography.sm, fontWeight: '700', marginTop: 3 },
  meta: { fontSize: Typography.xs, lineHeight: 18, marginTop: 6 },
  metaSmall: { fontSize: 10, lineHeight: 16, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 },
  message: { textAlign: 'center', padding: 32, fontSize: Typography.sm },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 10, textTransform: 'uppercase' },
  priorityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  priorityItem: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.md, padding: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  modalContent: { padding: Spacing.md, paddingTop: 18, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 26, fontWeight: '800', marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoBox: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.md, padding: 11 },
  infoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  historyRow: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, marginBottom: 8 },
  vipBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  noteBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  inputGroup: { alignSelf: 'stretch', marginBottom: 10 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, fontSize: Typography.sm },
  inputMulti: { minHeight: 92, paddingTop: 10, textAlignVertical: 'top' },
  button: { borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', minHeight: 46, paddingHorizontal: 14, marginTop: 8 },
  centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  centerCard: { width: '100%', maxHeight: '90%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center' },
  centerTitle: { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  centerText: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  centerActions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 10 },
  centerBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
