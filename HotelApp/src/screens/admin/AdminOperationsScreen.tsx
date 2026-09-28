import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import AppCard from '../../components/common/AppCard';
import DatePickerModal from '../../components/common/DatePickerModal';
import LoadingScreen from '../../components/common/LoadingScreen';
import type { AdminClienteBusqueda, AdminHabitacionDisponible, AdminPagoResumen, AdminReserva, AdminReservaDetalle } from '../../interfaces';
import {
  actualizarClienteAdministrador,
  buscarClientesAdministrador,
  cambiarFechasReservaAdministrador,
  cambiarHabitacionReservaAdministrador,
  cancelarReservaAdministrador,
  confirmarReservaAdministrador,
  crearReservaManualAdministrador,
  marcarNoShowAdministrador,
  obtenerDetalleReservaAdministrador,
  obtenerClienteFichaAdministrador,
  obtenerHabitacionesDisponiblesAdministrador,
  obtenerMetodosPagoAdministrador,
  obtenerReservasAdministrador,
  obtenerResumenPagosAdministrador,
  registrarPagoReservaAdministrador,
  registrarCheckinAdministrador,
  registrarCheckoutAdministrador,
} from '../../services/adminService';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

type Seccion = 'reservas' | 'checkin' | 'checkout' | 'pagos';
type FiltroReserva = 'hoy' | 'pendientes' | 'confirmadas' | 'canceladas' | 'checkin' | 'checkout' | 'no_show';
type MetodoPagoAdmin = { id: string; nombre: string };
type MensajeAdmin = { titulo: string; mensaje: string; tipo?: 'ok' | 'error' | 'warning' | 'info' } | null;
type ConfirmacionAdmin = {
  titulo: string;
  mensaje: string;
  accion: () => Promise<void> | void;
  peligro?: boolean;
} | null;
type FlujoOperacion = 'checkin' | 'checkout';
type CancelacionExcepcion = { reserva: AdminReservaDetalle; motivo: string } | null;
type CambioFechas = { reserva: AdminReservaDetalle; fechaEntrada: string; fechaSalida: string } | null;
type ClienteEdicion = {
  reservaId: string;
  clienteId: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  codigoTelefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  pais: string;
  ciudad: string;
  fechaNacimiento: string;
  nacionalidad: string;
  direccion: string;
  observacionesCliente: string;
} | null;

const PAIS_DATA = [
  { pais: 'Bolivia', codigo: '+591', nacionalidad: 'Boliviana', ciudades: ['La Paz', 'El Alto', 'Cochabamba', 'Santa Cruz de la Sierra', 'Sucre', 'Oruro', 'Potosí', 'Tarija', 'Trinidad', 'Cobija', 'Sacaba', 'Quillacollo', 'Montero', 'Riberalta', 'Yacuiba', 'Villazón', 'Tupiza', 'Camiri', 'Warnes', 'Viacha'] },
  { pais: 'Argentina', codigo: '+54', nacionalidad: 'Argentina', ciudades: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan'] },
  { pais: 'Brasil', codigo: '+55', nacionalidad: 'Brasileña', ciudades: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'] },
  { pais: 'Chile', codigo: '+56', nacionalidad: 'Chilena', ciudades: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Iquique', 'Puerto Montt', 'Arica'] },
  { pais: 'Colombia', codigo: '+57', nacionalidad: 'Colombiana', ciudades: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Manizales'] },
  { pais: 'Ecuador', codigo: '+593', nacionalidad: 'Ecuatoriana', ciudades: ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Manta', 'Portoviejo', 'Loja', 'Ambato', 'Riobamba'] },
  { pais: 'Paraguay', codigo: '+595', nacionalidad: 'Paraguaya', ciudades: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Encarnación', 'Caaguazú', 'Pedro Juan Caballero'] },
  { pais: 'Perú', codigo: '+51', nacionalidad: 'Peruana', ciudades: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco', 'Iquitos', 'Huancayo', 'Tacna', 'Puno'] },
  { pais: 'Uruguay', codigo: '+598', nacionalidad: 'Uruguaya', ciudades: ['Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes', 'Artigas'] },
  { pais: 'Venezuela', codigo: '+58', nacionalidad: 'Venezolana', ciudades: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'San Cristóbal', 'Maturín', 'Barcelona', 'Mérida'] },
  { pais: 'México', codigo: '+52', nacionalidad: 'Mexicana', ciudades: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Mérida', 'Cancún', 'Querétaro', 'Toluca'] },
  { pais: 'España', codigo: '+34', nacionalidad: 'Española', ciudades: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante'] },
  { pais: 'Estados Unidos', codigo: '+1', nacionalidad: 'Estadounidense', ciudades: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Miami'] },
  { pais: 'Canadá', codigo: '+1', nacionalidad: 'Canadiense', ciudades: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Quebec', 'Winnipeg', 'Hamilton', 'Halifax'] },
  { pais: 'Francia', codigo: '+33', nacionalidad: 'Francesa', ciudades: ['París', 'Marsella', 'Lyon', 'Toulouse', 'Niza', 'Nantes', 'Montpellier', 'Estrasburgo', 'Burdeos', 'Lille'] },
  { pais: 'Italia', codigo: '+39', nacionalidad: 'Italiana', ciudades: ['Roma', 'Milán', 'Nápoles', 'Turín', 'Palermo', 'Génova', 'Bolonia', 'Florencia', 'Venecia', 'Verona'] },
  { pais: 'Alemania', codigo: '+49', nacionalidad: 'Alemana', ciudades: ['Berlín', 'Hamburgo', 'Múnich', 'Colonia', 'Fráncfort', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'] },
  { pais: 'Reino Unido', codigo: '+44', nacionalidad: 'Británica', ciudades: ['Londres', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds', 'Glasgow', 'Edimburgo', 'Bristol', 'Cardiff', 'Belfast'] },
  { pais: 'China', codigo: '+86', nacionalidad: 'China', ciudades: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Wuhan', 'Xi’an', 'Hangzhou', 'Nanjing', 'Tianjin'] },
  { pais: 'Japón', codigo: '+81', nacionalidad: 'Japonesa', ciudades: ['Tokio', 'Osaka', 'Kioto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Hiroshima', 'Sendai'] },
];
const PAISES = PAIS_DATA.map((p) => p.pais);
const getPaisData = (pais?: string | null) => PAIS_DATA.find((p) => normalizar(p.pais) === normalizar(pais));
const getCiudadesPais = (pais?: string | null) => getPaisData(pais)?.ciudades ?? [];
const soloLetrasNombre = (value: string) => value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ'´` -]/g, '');
const soloDigitos = (value: string) => value.replace(/\D/g, '');
const tieneLetras = (value: string) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value);
const separarTelefono = (telefono?: string | null) => {
  const raw = (telefono ?? '').trim();
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  return {
    codigo: match?.[1] ?? '+591',
    numero: soloDigitos(match?.[2] ?? raw),
  };
};

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'reservas', label: 'Reservas' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'checkout', label: 'Check-out' },
  { id: 'pagos', label: 'Pagos' },
];

const FILTROS: { id: FiltroReserva; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'confirmadas', label: 'Confirmadas' },
  { id: 'canceladas', label: 'Canceladas' },
  { id: 'checkin', label: 'Check-in pend.' },
  { id: 'checkout', label: 'Check-out pend.' },
  { id: 'no_show', label: 'No show' },
];

const PETICIONES_RESERVA = [
  'Cama extra',
  'Desayuno incluido',
  'Cena incluida',
  'Almuerzo incluido',
  'Habitación silenciosa',
  'Decoración especial',
  'Transporte aeropuerto',
  'Late check-out',
];

const hoy = () => new Date().toISOString().slice(0, 10);
const normalizar = (texto?: string | null) => (texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const idReserva = (r: AdminReserva) => r.reserva_id ?? r.id ?? '';
const money = (value?: number | null) => `Bs ${Number(value ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaCorta = (fecha?: string | null) => fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : '—';
const fechaBusqueda = (fecha?: string | null) => {
  if (!fecha) return [];
  const date = new Date(`${fecha}T00:00:00`);
  return [
    fecha,
    fecha.replaceAll('-', '/'),
    date.toLocaleDateString('es-BO'),
    date.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }),
    date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
  ];
};
const sumarDias = (fecha: string, cantidad: number) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + cantidad);
  return base.toISOString().slice(0, 10);
};
const fechaLarga = (fecha?: string | null) => fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'long' }) : 'Seleccionar';

export default function AdminOperationsScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const [seccion, setSeccion] = useState<Seccion>('reservas');
  const [filtro, setFiltro] = useState<FiltroReserva>('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [reservas, setReservas] = useState<AdminReserva[]>([]);
  const [pagos, setPagos] = useState<AdminPagoResumen | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPagoAdmin[]>([]);
  const [detalle, setDetalle] = useState<AdminReservaDetalle | null>(null);
  const [flujoTipo, setFlujoTipo] = useState<FlujoOperacion | null>(null);
  const [flujoDetalle, setFlujoDetalle] = useState<AdminReservaDetalle | null>(null);
  const [pasoFlujo, setPasoFlujo] = useState(0);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalHabitacion, setModalHabitacion] = useState(false);
  const [modalPagoConfirmacion, setModalPagoConfirmacion] = useState(false);
  const [cancelacionExcepcion, setCancelacionExcepcion] = useState<CancelacionExcepcion>(null);
  const [cambioFechas, setCambioFechas] = useState<CambioFechas>(null);
  const [clienteEdicion, setClienteEdicion] = useState<ClienteEdicion>(null);
  const [mensaje, setMensaje] = useState<MensajeAdmin>(null);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionAdmin>(null);
  const [habitacionesDisp, setHabitacionesDisp] = useState<AdminHabitacionDisponible[]>([]);
  const [clientes, setClientes] = useState<AdminClienteBusqueda[]>([]);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteSel, setClienteSel] = useState<AdminClienteBusqueda | null>(null);
  const [fechaEntrada, setFechaEntrada] = useState(hoy());
  const [fechaSalida, setFechaSalida] = useState('');
  const [habitacionSel, setHabitacionSel] = useState('');
  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [obsOperacion, setObsOperacion] = useState('');
  const [cargosExtra, setCargosExtra] = useState(0);
  const [descuentoCheckout, setDescuentoCheckout] = useState(0);
  const [multaLlegadaTardia, setMultaLlegadaTardia] = useState(0);
  const [multaCambioUltimaHora, setMultaCambioUltimaHora] = useState(0);
  const [motivoMulta, setMotivoMulta] = useState('');
  const [sinDanos, setSinDanos] = useState(true);
  const [notaDanos, setNotaDanos] = useState('');
  const [peticiones, setPeticiones] = useState<string[]>([]);
  const [montoPago, setMontoPago] = useState(0);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [tipoPago, setTipoPago] = useState<'anticipo' | 'pago_total'>('anticipo');
  const [pagoModo, setPagoModo] = useState<'confirmar' | 'registrar'>('confirmar');
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setError('');
      const [r, p, m] = await Promise.all([
        obtenerReservasAdministrador(),
        obtenerResumenPagosAdministrador().catch(() => null),
        obtenerMetodosPagoAdministrador().catch(() => []),
      ]);
      setReservas(r);
      setPagos(p);
      setMetodosPago(m);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las reservas.');
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (route.params?.seccion) setSeccion(route.params.seccion);
    void cargar();
  }, [cargar, route.params?.seccion]));

  useEffect(() => {
    const q = clienteQuery.trim();
    if (q.length < 2 || clienteSel) {
      setClientes([]);
      return;
    }
    const timer = setTimeout(() => {
      buscarClientesAdministrador(q).then(setClientes).catch(() => setClientes([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [clienteQuery, clienteSel]);

  const reservaVisiblePorFiltro = useCallback((r: AdminReserva) => {
    const estado = normalizar(r.estado);
    const now = hoy();
    if (filtro === 'hoy') return r.fecha_entrada === now || r.fecha_salida === now;
    if (filtro === 'pendientes') return estado === 'pendiente';
    if (filtro === 'confirmadas') return estado === 'confirmada';
    if (filtro === 'canceladas') return estado === 'cancelada';
    if (filtro === 'checkin') return r.fecha_entrada <= now && ['confirmada', 'pendiente'].includes(estado);
    if (filtro === 'checkout') return r.fecha_salida <= now && ['en_estadia', 'hospedado'].includes(estado);
    if (filtro === 'no_show') return estado === 'no_show';
    return true;
  }, [filtro]);

  const visibles = useMemo(() => {
    let base = reservas;
    if (seccion === 'checkin') base = reservas.filter((r) => ['confirmada', 'pendiente'].includes(normalizar(r.estado)));
    if (seccion === 'checkout') base = reservas.filter((r) => ['en_estadia', 'hospedado'].includes(normalizar(r.estado)));
    if (seccion === 'pagos') base = reservas.filter((r) => Number(r.total_estimado ?? 0) > Number(r.total_pagado ?? 0));
    if (seccion === 'reservas') base = base.filter(reservaVisiblePorFiltro);
    const q = normalizar(busqueda);
    if (!q) return base;
    return base.filter((r) => [
      r.codigo_reserva, r.cliente_nombre, r.habitacion_numero, r.estado,
      ...fechaBusqueda(r.fecha_entrada),
      ...fechaBusqueda(r.fecha_salida),
    ].some((v) => normalizar(v).includes(q)));
  }, [busqueda, reservaVisiblePorFiltro, reservas, seccion]);

  const estadoColor = (estadoRaw: string) => {
    const estado = normalizar(estadoRaw);
    if (estado === 'confirmada') return colors.status.success;
    if (estado === 'pendiente') return colors.status.warning;
    if (['cancelada', 'no_show'].includes(estado)) return colors.status.error;
    if (['en_estadia', 'hospedado'].includes(estado)) return colors.status.info;
    return colors.gold.primary;
  };

  const mostrarMensaje = (titulo: string, mensajeTexto: string, tipo: NonNullable<MensajeAdmin>['tipo'] = 'info') => {
    setMensaje({ titulo, mensaje: mensajeTexto, tipo });
  };

  const pedirConfirmacion = (titulo: string, mensajeTexto: string, accion: () => Promise<void> | void, peligro = false) => {
    setConfirmacion({ titulo, mensaje: mensajeTexto, accion, peligro });
  };

  const abrirDetalle = async (reserva: AdminReserva) => {
    const id = idReserva(reserva);
    if (!id) return;
    setProcesando(`detalle-${id}`);
    try {
      setDetalle(await obtenerDetalleReservaAdministrador(id));
    } catch (e: any) {
      mostrarMensaje('No se pudo cargar el detalle', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const abrirFlujoOperacion = async (reserva: AdminReserva | AdminReservaDetalle, tipo: FlujoOperacion) => {
    const id = 'id' in reserva ? reserva.id : idReserva(reserva);
    if (!id) return;
    setProcesando(`flujo-${id}`);
    try {
      const d = 'cliente' in reserva ? reserva : await obtenerDetalleReservaAdministrador(id);
      const hoyIso = hoy();
      if (tipo === 'checkin' && d.fecha_entrada !== hoyIso) {
        mostrarMensaje(
          'Check-in fuera de fecha',
          `Esta reserva está programada para llegar el ${fechaCorta(d.fecha_entrada)}. Hoy no se puede ocupar esa habitación con esta reserva. Si el huésped llegó hoy, crea una nueva reserva o modifica las fechas desde la web antes de hacer check-in.`,
          'warning',
        );
        return;
      }
      if (tipo === 'checkout' && d.fecha_salida > hoyIso) {
        mostrarMensaje(
          'Check-out fuera de fecha',
          `La salida registrada es el ${fechaCorta(d.fecha_salida)}. No se puede finalizar hoy porque la estadía todavía no corresponde a salida. Si el huésped sale antes, ajusta la reserva antes de hacer check-out.`,
          'warning',
        );
        return;
      }
      setFlujoDetalle(d);
      setFlujoTipo(tipo);
      setPasoFlujo(0);
      setObsOperacion('');
      setCargosExtra(0);
      setDescuentoCheckout(0);
      setMultaLlegadaTardia(0);
      setMultaCambioUltimaHora(0);
      setMotivoMulta('');
      setSinDanos(true);
      setNotaDanos('');
    } catch (e: any) {
      mostrarMensaje('No se pudo abrir el flujo', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const ejecutarReserva = async (reservaId: string, accion: string, fn: () => Promise<void>) => {
    setProcesando(accion);
    try {
      await fn();
      await cargar();
      if (detalle?.id === reservaId) {
        obtenerDetalleReservaAdministrador(reservaId).then(setDetalle).catch(() => setDetalle(null));
      }
      mostrarMensaje('Listo', 'La acción se completó correctamente.', 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo completar', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const confirmarAccion = (titulo: string, mensaje: string, onPress: () => void, peligro = false) => {
    pedirConfirmacion(titulo, mensaje, onPress, peligro);
  };

  const abrirCancelacionExcepcion = (reserva: AdminReservaDetalle) => {
    setCancelacionExcepcion({ reserva, motivo: '' });
  };

  const abrirCambioFechas = (reserva: AdminReservaDetalle) => {
    setCambioFechas({
      reserva,
      fechaEntrada: reserva.fecha_entrada,
      fechaSalida: reserva.fecha_salida,
    });
  };

  const abrirEditarCliente = async (reserva: AdminReservaDetalle) => {
    const tel = separarTelefono(reserva.cliente.telefono);
    setClienteEdicion({
      reservaId: reserva.id,
      clienteId: reserva.cliente.id,
      nombreCompleto: reserva.cliente.nombre_completo ?? '',
      correo: reserva.cliente.correo ?? '',
      codigoTelefono: tel.codigo,
      telefono: tel.numero,
      tipoDocumento: reserva.cliente.tipo_documento ?? '',
      numeroDocumento: reserva.cliente.numero_documento ?? '',
      pais: 'Bolivia',
      ciudad: '',
      fechaNacimiento: '',
      nacionalidad: 'Boliviana',
      direccion: '',
      observacionesCliente: '',
    });
    const ficha = await obtenerClienteFichaAdministrador(reserva.cliente.id);
    if (ficha) {
      const fichaTel = separarTelefono(ficha.telefono ?? reserva.cliente.telefono);
      setClienteEdicion((prev) => prev ? {
        ...prev,
        nombreCompleto: ficha.nombre_completo ?? prev.nombreCompleto,
        codigoTelefono: fichaTel.codigo,
        telefono: fichaTel.numero,
        tipoDocumento: ficha.tipo_documento ?? prev.tipoDocumento,
        numeroDocumento: ficha.numero_documento ?? prev.numeroDocumento,
        pais: ficha.pais ?? prev.pais,
        ciudad: ficha.ciudad ?? prev.ciudad,
        fechaNacimiento: ficha.fecha_nacimiento ?? prev.fechaNacimiento,
        nacionalidad: ficha.nacionalidad ?? prev.nacionalidad,
        direccion: ficha.direccion ?? prev.direccion,
        observacionesCliente: ficha.observaciones ?? prev.observacionesCliente,
      } : prev);
    }
  };

  const confirmarCancelacionExcepcion = async () => {
    if (!cancelacionExcepcion) return;
    const motivo = cancelacionExcepcion.motivo.trim();
    if (motivo.length < 8) {
      mostrarMensaje('Motivo requerido', 'Para cancelar por excepción debes escribir un motivo claro.', 'warning');
      return;
    }
    const reserva = cancelacionExcepcion.reserva;
    await ejecutarReserva(reserva.id, 'cancelar', async () => {
      await cancelarReservaAdministrador(reserva.id, `Excepción administrativa: ${motivo}`);
      setCancelacionExcepcion(null);
      setDetalle(null);
    });
  };

  const confirmarCambioFechas = async () => {
    if (!cambioFechas) return;
    if (cambioFechas.fechaSalida <= cambioFechas.fechaEntrada) {
      mostrarMensaje('Fechas inválidas', 'La salida debe ser posterior a la llegada.', 'warning');
      return;
    }
    setProcesando('cambiar-fechas');
    try {
      const resultado = await cambiarFechasReservaAdministrador({
        reservaId: cambioFechas.reserva.id,
        fechaEntrada: cambioFechas.fechaEntrada,
        fechaSalida: cambioFechas.fechaSalida,
      });
      await cargar();
      const actualizada = await obtenerDetalleReservaAdministrador(cambioFechas.reserva.id);
      setDetalle(actualizada);
      setCambioFechas(null);
      setCancelacionExcepcion(null);
      mostrarMensaje(
        'Fechas actualizadas',
        resultado
          ? `La reserva quedó en ${resultado.noches} noche(s). Nuevo total: ${money(resultado.nuevo_total)}.`
          : 'La reserva fue actualizada correctamente.',
        'ok',
      );
    } catch (e: any) {
      const msg = String(e.message ?? '');
      mostrarMensaje(
        'No se pudieron cambiar las fechas',
        msg.toLowerCase().includes('extract')
          ? 'La base de datos todavía tiene el cálculo de noches roto en el RPC de modificación de fechas. No se cambió la reserva para evitar afectar pagos o totales.'
          : msg,
        'error',
      );
    } finally {
      setProcesando(null);
    }
  };

  const guardarClienteReserva = async () => {
    if (!clienteEdicion) return;
    if (!clienteEdicion.nombreCompleto.trim()) {
      mostrarMensaje('Nombre requerido', 'El huésped debe tener nombre completo.', 'warning');
      return;
    }
    if (/\d/.test(clienteEdicion.nombreCompleto)) {
      mostrarMensaje('Nombre inválido', 'El nombre no debe contener números.', 'warning');
      return;
    }
    if (!clienteEdicion.tipoDocumento.trim() || !clienteEdicion.numeroDocumento.trim()) {
      mostrarMensaje('Documento requerido', 'Completa tipo y número de documento para continuar con datos confiables.', 'warning');
      return;
    }
    if (!/^\d+$/.test(clienteEdicion.numeroDocumento.trim())) {
      mostrarMensaje('Documento inválido', 'El número de carnet o ID debe contener solo números.', 'warning');
      return;
    }
    const telefonoDigits = soloDigitos(clienteEdicion.telefono);
    const esBolivia = clienteEdicion.codigoTelefono === '+591';
    if (!telefonoDigits || (esBolivia ? ![7, 8].includes(telefonoDigits.length) : telefonoDigits.length < 5 || telefonoDigits.length > 15)) {
      mostrarMensaje('Teléfono inválido', esBolivia ? 'Para Bolivia usa 7 u 8 dígitos después del código +591.' : 'El teléfono debe tener entre 5 y 15 dígitos.', 'warning');
      return;
    }
    if (!clienteEdicion.pais.trim() || !clienteEdicion.ciudad.trim()) {
      mostrarMensaje('Ubicación requerida', 'Selecciona país y ciudad del huésped.', 'warning');
      return;
    }
    if (/\d/.test(clienteEdicion.pais) || /\d/.test(clienteEdicion.ciudad)) {
      mostrarMensaje('Ubicación inválida', 'País y ciudad no deben contener números.', 'warning');
      return;
    }
    if (clienteEdicion.direccion.trim() && !tieneLetras(clienteEdicion.direccion)) {
      mostrarMensaje('Dirección inválida', 'La dirección no puede ser solo números; agrega calle, zona o referencia.', 'warning');
      return;
    }
    if (!clienteEdicion.fechaNacimiento) {
      mostrarMensaje('Fecha requerida', 'Selecciona la fecha de nacimiento del huésped.', 'warning');
      return;
    }
    if (clienteEdicion.fechaNacimiento > hoy()) {
      mostrarMensaje('Fecha inválida', 'La fecha de nacimiento no puede ser futura.', 'warning');
      return;
    }
    setProcesando('guardar-cliente');
    try {
      const telefonoCompleto = `${clienteEdicion.codigoTelefono || '+591'} ${soloDigitos(clienteEdicion.telefono)}`.trim();
      await actualizarClienteAdministrador({
        clienteId: clienteEdicion.clienteId,
        nombreCompleto: clienteEdicion.nombreCompleto,
        telefono: telefonoCompleto,
        tipoDocumento: clienteEdicion.tipoDocumento,
        numeroDocumento: clienteEdicion.numeroDocumento,
        pais: clienteEdicion.pais,
        ciudad: clienteEdicion.ciudad,
        fechaNacimiento: clienteEdicion.fechaNacimiento,
        nacionalidad: clienteEdicion.nacionalidad,
        direccion: clienteEdicion.direccion,
        observaciones: clienteEdicion.observacionesCliente,
      });
      const actualizada = await obtenerDetalleReservaAdministrador(clienteEdicion.reservaId);
      setDetalle(actualizada);
      setClienteEdicion(null);
      mostrarMensaje('Cliente actualizado', 'Los datos del huésped fueron guardados correctamente.', 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo actualizar el cliente', e.message ?? 'Inténtalo nuevamente.', 'error');
    } finally {
      setProcesando(null);
    }
  };

  const abrirPagoConfirmacion = (reserva: AdminReservaDetalle, modo: 'confirmar' | 'registrar' = 'confirmar') => {
    const total = Number(reserva.total_estimado ?? 0);
    const pagado = Number(reserva.total_pagado ?? 0);
    const minimoPendiente = Math.max(0, total * 0.3 - pagado);
    const saldo = Math.max(0, total - pagado);
    const montoInicial = modo === 'confirmar' ? Math.max(minimoPendiente, Math.min(saldo, total * 0.3)) : saldo;
    setPagoModo(modo);
    setMontoPago(Number(montoInicial.toFixed(2)));
    setMetodoPagoId('');
    setTipoPago(montoInicial >= total - pagado ? 'pago_total' : 'anticipo');
    setModalPagoConfirmacion(true);
  };

  const abrirRegistroPago = async (reserva: AdminReserva) => {
    const reservaId = idReserva(reserva);
    if (!reservaId) {
      mostrarMensaje('Reserva inválida', 'No se encontró el identificador de la reserva para registrar el pago.', 'error');
      return;
    }
    const saldo = Math.max(0, Number(reserva.total_estimado ?? 0) - Number(reserva.total_pagado ?? 0));
    if (saldo <= 0) {
      void abrirDetalle(reserva);
      return;
    }
    setProcesando(`pago-${reservaId}`);
    try {
      const detallePago = await obtenerDetalleReservaAdministrador(reservaId);
      setDetalle(detallePago);
      abrirPagoConfirmacion(detallePago, 'registrar');
    } catch (e: any) {
      mostrarMensaje('No se pudo abrir pagos', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const solicitarConfirmarReserva = (reserva: AdminReservaDetalle) => {
    const total = Number(reserva.total_estimado ?? 0);
    const pagado = Number(reserva.total_pagado ?? 0);
    const minimo = total * 0.3;
    if (total <= 0) {
      mostrarMensaje(
        'Total no calculado',
        'No se puede confirmar una reserva sin total estimado. Revisa la habitación y las fechas antes de continuar.',
        'warning',
      );
      return;
    }
    if (total > 0 && pagado < minimo) {
      abrirPagoConfirmacion(reserva);
      return;
    }
    pedirConfirmacion(
      '¿Confirmar esta reserva?',
      `La reserva ${reserva.codigo_reserva} ya cumple el pago mínimo del 30%. Revisa los datos antes de continuar.`,
      () => ejecutarReserva(reserva.id, 'confirmar', () => confirmarReservaAdministrador(reserva.id)),
    );
  };

  const registrarPagoYConfirmar = async () => {
    if (!detalle) return;
    const total = Number(detalle.total_estimado ?? 0);
    const pagado = Number(detalle.total_pagado ?? 0);
    const saldo = Math.max(0, total - pagado);
    const minimoPendiente = Math.max(0, total * 0.3 - pagado);
    if (!metodoPagoId) {
      mostrarMensaje('Método requerido', 'Selecciona un método de pago para registrar el anticipo.', 'warning');
      return;
    }
    if (pagoModo === 'confirmar' && montoPago < minimoPendiente) {
      mostrarMensaje('Pago insuficiente', `Para confirmar se requiere al menos ${money(minimoPendiente)} adicionales.`, 'warning');
      return;
    }
    if (montoPago <= 0) {
      mostrarMensaje('Monto inválido', 'El monto del pago debe ser mayor a cero.', 'warning');
      return;
    }
    if (montoPago > saldo) {
      mostrarMensaje('Monto inválido', `El pago no puede superar el saldo pendiente de ${money(saldo)}.`, 'warning');
      return;
    }
    if (tipoPago === 'pago_total' && montoPago < saldo) {
      mostrarMensaje('Tipo de pago incorrecto', `Para marcar pago total debe cubrir todo el saldo pendiente: ${money(saldo)}.`, 'warning');
      return;
    }
    setProcesando('pago-confirmar');
    try {
      await registrarPagoReservaAdministrador({
        reservaId: detalle.id,
        monto: montoPago,
        metodoPagoId,
        tipoPago: montoPago >= saldo ? 'pago_total' : tipoPago,
      });
      if (pagoModo === 'confirmar') {
        await confirmarReservaAdministrador(detalle.id);
      }
      await cargar();
      setDetalle(await obtenerDetalleReservaAdministrador(detalle.id));
      setModalPagoConfirmacion(false);
      mostrarMensaje(pagoModo === 'confirmar' ? 'Reserva confirmada' : 'Pago registrado', pagoModo === 'confirmar' ? 'Se registró el pago y la reserva quedó confirmada.' : 'Se registró el pago y se actualizó el saldo de la reserva.', 'ok');
    } catch (e: any) {
      mostrarMensaje(pagoModo === 'confirmar' ? 'No se pudo confirmar' : 'No se pudo registrar', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const finalizarCheckin = async () => {
    if (!flujoDetalle) return;
    if (flujoDetalle.fecha_entrada !== hoy()) {
      mostrarMensaje(
        'Check-in fuera de fecha',
        `La llegada registrada es el ${fechaCorta(flujoDetalle.fecha_entrada)}. Para hacer check-in hoy, primero registra una reserva válida para la fecha actual.`,
        'warning',
      );
      return;
    }
    const saldo = Math.max(0, Number(flujoDetalle.total_estimado) - Number(flujoDetalle.total_pagado));
    if (Number(flujoDetalle.total_estimado) <= 0) {
      mostrarMensaje('Total no calculado', 'No se puede realizar check-in sin total estimado.', 'warning');
      return;
    }
    if (saldo > 0 && Number(flujoDetalle.total_pagado) < Number(flujoDetalle.total_estimado) * 0.3) {
      mostrarMensaje('Pago mínimo requerido', 'Antes del check-in la reserva debe tener al menos el 30% pagado.', 'warning');
      return;
    }
    setProcesando('finalizar-checkin');
    try {
      const multas = [
        multaLlegadaTardia > 0 ? `Multa por llegada tardía sin aviso: ${money(multaLlegadaTardia)}` : '',
        multaCambioUltimaHora > 0 ? `Multa por cambio de reserva 24h/mismo día: ${money(multaCambioUltimaHora)}` : '',
        motivoMulta.trim() ? `Motivo multa: ${motivoMulta.trim()}` : '',
      ].filter(Boolean).join(' | ');
      await registrarCheckinAdministrador(flujoDetalle.id, [obsOperacion.trim(), multas].filter(Boolean).join(' | '));
      await cargar();
      setFlujoTipo(null);
      setFlujoDetalle(null);
      setDetalle(null);
      const habitacion = flujoDetalle.habitaciones[0]?.numero ? `Habitación ${flujoDetalle.habitaciones[0].numero}` : 'Habitación asignada';
      mostrarMensaje('Check-in realizado', `${habitacion} ocupada por ${flujoDetalle.cliente.nombre_completo}.`, 'ok');
    } catch (e: any) {
      mostrarMensaje('No se pudo realizar check-in', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const finalizarCheckout = async () => {
    if (!flujoDetalle) return;
    if (flujoDetalle.fecha_salida > hoy()) {
      mostrarMensaje(
        'Check-out fuera de fecha',
        `La salida registrada es el ${fechaCorta(flujoDetalle.fecha_salida)}. No se puede realizar check-out antes de esa fecha sin modificar la reserva.`,
        'warning',
      );
      return;
    }
    const totalMultas = multaLlegadaTardia + multaCambioUltimaHora;
    const totalCargosExtra = cargosExtra + totalMultas;
    const saldoFinal = Math.max(
      0,
      Number(flujoDetalle.total_estimado) - Number(flujoDetalle.total_pagado) + totalCargosExtra - descuentoCheckout,
    );
    if (saldoFinal > 0) {
      mostrarMensaje(
        'Pago pendiente',
        `Antes de realizar check-out se debe cancelar el saldo pendiente de ${money(saldoFinal)}.`,
        'warning',
      );
      return;
    }
    setProcesando('finalizar-checkout');
    try {
      const multas = [
        multaLlegadaTardia > 0 ? `Multa por llegada tardía sin aviso: ${money(multaLlegadaTardia)}` : '',
        multaCambioUltimaHora > 0 ? `Multa por cambio de reserva 24h/mismo día: ${money(multaCambioUltimaHora)}` : '',
        motivoMulta.trim() ? `Motivo multa: ${motivoMulta.trim()}` : '',
      ].filter(Boolean).join(' | ');
      const obsCompleta = [obsOperacion.trim(), multas, !sinDanos && notaDanos.trim() ? `Daños: ${notaDanos.trim()}` : '']
        .filter(Boolean)
        .join(' | ');
      await registrarCheckoutAdministrador({
        reservaId: flujoDetalle.id,
        cargosExtra: totalCargosExtra,
        descuento: descuentoCheckout,
        observaciones: obsCompleta || null,
      });
      await cargar();
      setFlujoTipo(null);
      setFlujoDetalle(null);
      setDetalle(null);
      const habitacion = flujoDetalle.habitaciones[0]?.numero ? `habitación ${flujoDetalle.habitaciones[0].numero}` : 'habitación';
      mostrarMensaje(
        'Check-out realizado',
        `La ${habitacion} pasó a limpieza. Housekeeping recibirá la tarea de limpieza posterior al check-out.`,
        'ok',
      );
    } catch (e: any) {
      mostrarMensaje('No se pudo realizar check-out', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const abrirNuevaReserva = () => {
    setModalNueva(true);
    setClienteQuery('');
    setClienteSel(null);
    setClientes([]);
    setFechaEntrada(hoy());
    setFechaSalida(sumarDias(hoy(), 1));
    setHabitacionSel('');
    setHabitacionesDisp([]);
    setAdultos(1);
    setNinos(0);
    setObservaciones('');
    setPeticiones([]);
  };

  const buscarHabitaciones = async (entrada = fechaEntrada, salida = fechaSalida) => {
    if (!entrada || !salida) {
      mostrarMensaje('Fechas requeridas', 'Selecciona fecha de llegada y salida desde el calendario.', 'warning');
      return;
    }
    if (salida <= entrada) {
      mostrarMensaje('Fechas inválidas', 'La fecha de salida debe ser posterior a la fecha de llegada.', 'warning');
      return;
    }
    setProcesando('buscar-habitaciones');
    try {
      setHabitacionesDisp(await obtenerHabitacionesDisponiblesAdministrador(entrada, salida));
    } catch (e: any) {
      mostrarMensaje('No se pudieron buscar habitaciones', e.message, 'error');
    } finally {
      setProcesando(null);
    }
  };

  const crearReserva = async () => {
    if (!clienteSel || !habitacionSel || !fechaEntrada || !fechaSalida) {
      mostrarMensaje('Faltan datos', 'Selecciona cliente, fechas y habitación.', 'warning');
      return;
    }
    if (fechaSalida <= fechaEntrada) {
      mostrarMensaje('Fechas inválidas', 'La reserva necesita una salida posterior a la llegada.', 'warning');
      return;
    }
    setProcesando('crear-reserva');
    try {
      const creada = await crearReservaManualAdministrador({
        clienteId: clienteSel.id,
        habitacionId: habitacionSel,
        fechaEntrada,
        fechaSalida,
        adultos,
        ninos,
        observaciones: [peticiones.length ? `Peticiones: ${peticiones.join(', ')}` : '', observaciones.trim()].filter(Boolean).join('\n'),
      });
      await cargar();
      setModalNueva(false);
      if (creada.reservaId) {
        const detalleCreada = await obtenerDetalleReservaAdministrador(creada.reservaId);
        setDetalle(detalleCreada);
        abrirPagoConfirmacion(detalleCreada);
      } else {
        mostrarMensaje(
          'Reserva creada',
          'La reserva fue creada como pendiente, pero no pude abrir el pago automáticamente. Búscala en pendientes para registrar el anticipo.',
          'warning',
        );
      }
    } catch (e: any) {
      const msg = String(e.message ?? '');
      mostrarMensaje(
        'No se pudo crear la reserva',
        msg.toLowerCase().includes('extract')
          ? 'La base de datos tiene un problema al calcular las noches de esta reserva. Ya validé las fechas en la app; falta corregir el RPC de creación en Supabase para que use la diferencia de fechas como número de noches.'
          : msg,
        'error',
      );
    } finally {
      setProcesando(null);
    }
  };

  const abrirCambioHabitacion = async () => {
    if (!detalle) return;
    setModalHabitacion(true);
    setHabitacionSel('');
    await buscarHabitaciones(detalle.fecha_entrada, detalle.fecha_salida);
  };

  const cambiarHabitacion = async () => {
    if (!detalle || !habitacionSel) return;
    await ejecutarReserva(detalle.id, 'cambiar-habitacion', async () => {
      await cambiarHabitacionReservaAdministrador(detalle.id, habitacionSel);
      setModalHabitacion(false);
    });
  };

  if (cargando) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>OPERACIÓN</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Reservas y estadías</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Consulta, confirma y administra reservas desde el celular</Text>
      </View>

      <View style={styles.tabs}>
        {SECCIONES.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setSeccion(item.id)} style={[
            styles.tab,
            { borderColor: seccion === item.id ? colors.gold.primary : colors.border.primary, backgroundColor: seccion === item.id ? `${colors.gold.primary}18` : colors.bg.secondary },
          ]}>
            <Text numberOfLines={1} style={{ color: seccion === item.id ? colors.gold.primary : colors.text.muted, fontSize: 11, fontWeight: '500' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
          <Ionicons name="search-outline" size={17} color={colors.text.muted} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Nombre, código, fecha, habitación o estado"
            placeholderTextColor={colors.text.muted}
            style={[styles.searchInput, { color: colors.text.primary }]}
          />
          {busqueda ? (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {seccion === 'reservas' ? (
          <TouchableOpacity style={[styles.newButton, { backgroundColor: colors.gold.primary }]} onPress={abrirNuevaReserva}>
            <Ionicons name="add" size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        ) : null}
      </View>

      {seccion === 'reservas' ? (
        <View style={styles.filterArea}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTROS.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => setFiltro(item.id)} style={[
                styles.filter,
                { borderColor: filtro === item.id ? colors.gold.primary : colors.border.primary, backgroundColor: filtro === item.id ? `${colors.gold.primary}18` : colors.bg.secondary },
              ]}>
                <Text numberOfLines={1} style={[styles.filterText, { color: filtro === item.id ? colors.gold.primary : colors.text.muted }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar(); }} tintColor={colors.gold.primary} />}
      >
        {seccion === 'pagos' && pagos ? (
          <View style={styles.paymentGrid}>
            {[
              ['Hoy', money(pagos.hoy_total)],
              ['Mes', money(pagos.mes_total)],
              ['Pagos hoy', pagos.pagos_hoy],
              ['Pendientes', pagos.pendientes],
            ].map(([label, value]) => (
              <AppCard key={String(label)} style={styles.paymentCard}>
                <Text style={[styles.paymentValue, { color: colors.text.primary }]}>{value}</Text>
                <Text style={[styles.cardMeta, { color: colors.text.muted }]}>{label}</Text>
              </AppCard>
            ))}
          </View>
        ) : null}

        {error ? <Text style={[styles.message, { color: colors.status.error }]}>{error}</Text> : null}
        {!error && visibles.length === 0 ? <Text style={[styles.message, { color: colors.text.muted }]}>No hay reservas para este filtro.</Text> : null}

        {visibles.map((reserva) => {
          const id = idReserva(reserva) || reserva.codigo_reserva;
          const color = estadoColor(reserva.estado);
          const saldo = Math.max(0, Number(reserva.total_estimado ?? 0) - Number(reserva.total_pagado ?? 0));
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.9}
              onPress={() => {
                if (seccion === 'checkin') void abrirFlujoOperacion(reserva, 'checkin');
                else if (seccion === 'checkout') void abrirFlujoOperacion(reserva, 'checkout');
                else void abrirDetalle(reserva);
              }}
              disabled={procesando === `detalle-${idReserva(reserva)}` || procesando === `flujo-${idReserva(reserva)}`}
            >
              <AppCard style={{ ...styles.card, borderTopColor: color, borderTopWidth: 3 }}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.code, { color: colors.gold.primary }]}>{reserva.codigo_reserva}</Text>
                    <Text style={[styles.name, { color: colors.text.primary }]}>{reserva.cliente_nombre ?? 'Cliente'}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
                    <Text style={{ color, fontSize: 10, fontWeight: '500', textTransform: 'capitalize' }}>{reserva.estado.replace('_', ' ')}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="bed-outline" size={15} color={colors.text.muted} />
                  <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>Hab. {reserva.habitacion_numero ?? 'Sin asignar'}</Text>
                  <Text style={[styles.cardMeta, { color: colors.text.muted }]}>{fechaCorta(reserva.fecha_entrada)} → {fechaCorta(reserva.fecha_salida)}</Text>
                </View>
                <View style={[styles.balance, { borderTopColor: colors.border.primary }]}>
                  <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>Pago: {saldo > 0 ? 'Pendiente' : 'Al día'}</Text>
                  <Text style={{ color: saldo > 0 ? colors.status.warning : colors.status.success, fontWeight: '500' }}>{money(saldo)}</Text>
                </View>
                {seccion === 'pagos' ? (
                  <TouchableOpacity
                    style={[styles.inlineAction, { backgroundColor: saldo > 0 ? colors.gold.primary : colors.bg.secondary, borderColor: saldo > 0 ? colors.gold.primary : colors.border.primary }]}
                    onPress={() => void abrirRegistroPago(reserva)}
                    disabled={procesando === `pago-${idReserva(reserva)}`}
                  >
                    <Ionicons name={saldo > 0 ? 'card-outline' : 'receipt-outline'} size={16} color={saldo > 0 ? colors.text.inverse : colors.text.secondary} />
                    <Text style={{ color: saldo > 0 ? colors.text.inverse : colors.text.secondary, fontWeight: '700' }}>
                      {procesando === `pago-${idReserva(reserva)}` ? 'Abriendo...' : saldo > 0 ? 'Registrar pago' : 'Ver historial'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ReservaDetalleModal
        visible={Boolean(detalle)}
        detalle={detalle}
        colors={colors}
        procesando={procesando}
        onClose={() => setDetalle(null)}
        onConfirmar={() => detalle && solicitarConfirmarReserva(detalle)}
        onCancelar={() => detalle && abrirCancelacionExcepcion(detalle)}
        onNoShow={() => detalle && confirmarAccion('Marcar no show', 'Se registrará que el huésped no se presentó. Revisa la política del hotel antes de continuar.', () => void ejecutarReserva(detalle.id, 'no-show', () => marcarNoShowAdministrador(detalle.id)), true)}
        onCheckin={() => detalle && void abrirFlujoOperacion(detalle, 'checkin')}
        onCheckout={() => detalle && void abrirFlujoOperacion(detalle, 'checkout')}
        onCambiarHabitacion={() => void abrirCambioHabitacion()}
        onCambiarFecha={() => detalle && abrirCambioFechas(detalle)}
        onEditarCliente={() => detalle && void abrirEditarCliente(detalle)}
        onVerPago={() => { setDetalle(null); setSeccion('pagos'); }}
      />

      <NuevaReservaModal
        visible={modalNueva}
        colors={colors}
        clienteQuery={clienteQuery}
        setClienteQuery={(text) => { setClienteSel(null); setClienteQuery(text); }}
        clientes={clientes}
        clienteSel={clienteSel}
        seleccionarCliente={(c) => { setClienteSel(c); setClienteQuery(c.nombre_completo); setClientes([]); }}
        fechaEntrada={fechaEntrada}
        setFechaEntrada={setFechaEntrada}
        fechaSalida={fechaSalida}
        setFechaSalida={setFechaSalida}
        habitaciones={habitacionesDisp}
        habitacionSel={habitacionSel}
        setHabitacionSel={setHabitacionSel}
        buscarHabitaciones={() => void buscarHabitaciones()}
        adultos={adultos}
        setAdultos={setAdultos}
        ninos={ninos}
        setNinos={setNinos}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        peticiones={peticiones}
        setPeticiones={setPeticiones}
        procesando={procesando}
        onCrear={() => void crearReserva()}
        onClose={() => setModalNueva(false)}
      />

      <HabitacionModal
        visible={modalHabitacion}
        colors={colors}
        habitaciones={habitacionesDisp}
        habitacionSel={habitacionSel}
        setHabitacionSel={setHabitacionSel}
        procesando={procesando}
        onConfirmar={() => void cambiarHabitacion()}
        onClose={() => setModalHabitacion(false)}
      />

      <OperacionFlujoModal
        visible={Boolean(flujoTipo && flujoDetalle)}
        tipo={flujoTipo}
        detalle={flujoDetalle}
        colors={colors}
        paso={pasoFlujo}
        setPaso={setPasoFlujo}
        observaciones={obsOperacion}
        setObservaciones={setObsOperacion}
        cargosExtra={cargosExtra}
        setCargosExtra={setCargosExtra}
        descuento={descuentoCheckout}
        setDescuento={setDescuentoCheckout}
        multaLlegadaTardia={multaLlegadaTardia}
        setMultaLlegadaTardia={setMultaLlegadaTardia}
        multaCambioUltimaHora={multaCambioUltimaHora}
        setMultaCambioUltimaHora={setMultaCambioUltimaHora}
        motivoMulta={motivoMulta}
        setMotivoMulta={setMotivoMulta}
        sinDanos={sinDanos}
        setSinDanos={setSinDanos}
        notaDanos={notaDanos}
        setNotaDanos={setNotaDanos}
        procesando={procesando}
        onVerPago={() => { setFlujoTipo(null); setFlujoDetalle(null); setSeccion('pagos'); }}
        onFinalizar={() => flujoTipo === 'checkin' ? void finalizarCheckin() : void finalizarCheckout()}
        onClose={() => { setFlujoTipo(null); setFlujoDetalle(null); }}
      />

      <PagoConfirmacionModal
        visible={modalPagoConfirmacion}
        colors={colors}
        detalle={detalle}
        metodos={metodosPago}
        metodoPagoId={metodoPagoId}
        setMetodoPagoId={setMetodoPagoId}
        montoPago={montoPago}
        setMontoPago={setMontoPago}
        tipoPago={tipoPago}
        setTipoPago={setTipoPago}
        modo={pagoModo}
        procesando={procesando}
        onConfirmar={() => void registrarPagoYConfirmar()}
        onClose={() => setModalPagoConfirmacion(false)}
      />

      <CancelacionExcepcionModal
        visible={Boolean(cancelacionExcepcion)}
        colors={colors}
        data={cancelacionExcepcion}
        setMotivo={(motivo) => setCancelacionExcepcion((prev) => prev ? { ...prev, motivo } : prev)}
        procesando={procesando}
        onCambiarFecha={() => {
          if (cancelacionExcepcion?.reserva) abrirCambioFechas(cancelacionExcepcion.reserva);
          setCancelacionExcepcion(null);
        }}
        onConfirmar={() => void confirmarCancelacionExcepcion()}
        onClose={() => setCancelacionExcepcion(null)}
      />

      <CambioFechasModal
        visible={Boolean(cambioFechas)}
        colors={colors}
        data={cambioFechas}
        setFechaEntrada={(fecha) => setCambioFechas((prev) => prev ? {
          ...prev,
          fechaEntrada: fecha,
          fechaSalida: prev.fechaSalida <= fecha ? sumarDias(fecha, 1) : prev.fechaSalida,
        } : prev)}
        setFechaSalida={(fecha) => setCambioFechas((prev) => prev ? { ...prev, fechaSalida: fecha } : prev)}
        procesando={procesando}
        onConfirmar={() => void confirmarCambioFechas()}
        onClose={() => setCambioFechas(null)}
      />

      <ClienteReservaModal
        visible={Boolean(clienteEdicion)}
        colors={colors}
        data={clienteEdicion}
        setData={(patch) => setClienteEdicion((prev) => prev ? { ...prev, ...patch } : prev)}
        procesando={procesando}
        onConfirmar={() => void guardarClienteReserva()}
        onClose={() => setClienteEdicion(null)}
      />

      <ConfirmacionModal
        visible={Boolean(confirmacion)}
        colors={colors}
        data={confirmacion}
        procesando={procesando}
        onClose={() => setConfirmacion(null)}
        onConfirmar={async () => {
          const actual = confirmacion;
          if (!actual) return;
          setConfirmacion(null);
          await actual.accion();
        }}
      />

      <MensajeModal
        visible={Boolean(mensaje)}
        colors={colors}
        data={mensaje}
        onClose={() => setMensaje(null)}
      />
    </View>
  );
}

function OperacionFlujoModal(props: {
  visible: boolean;
  tipo: FlujoOperacion | null;
  detalle: AdminReservaDetalle | null;
  colors: any;
  paso: number;
  setPaso: (v: number) => void;
  observaciones: string;
  setObservaciones: (v: string) => void;
  cargosExtra: number;
  setCargosExtra: (v: number) => void;
  descuento: number;
  setDescuento: (v: number) => void;
  multaLlegadaTardia: number;
  setMultaLlegadaTardia: (v: number) => void;
  multaCambioUltimaHora: number;
  setMultaCambioUltimaHora: (v: number) => void;
  motivoMulta: string;
  setMotivoMulta: (v: string) => void;
  sinDanos: boolean;
  setSinDanos: (v: boolean) => void;
  notaDanos: string;
  setNotaDanos: (v: string) => void;
  procesando: string | null;
  onVerPago: () => void;
  onFinalizar: () => void;
  onClose: () => void;
}) {
  const { colors, detalle, tipo } = props;
  if (!detalle || !tipo) return null;
  const esCheckin = tipo === 'checkin';
  const pasos = esCheckin
    ? ['Huésped', 'Reserva', 'Pago', 'Habitación', 'Finalizar']
    : ['Huésped', 'Pagos', 'Habitación', 'Observaciones', 'Finalizar'];
  const saldoBase = Math.max(0, Number(detalle.total_estimado) - Number(detalle.total_pagado));
  const totalMultas = props.multaLlegadaTardia + props.multaCambioUltimaHora;
  const saldoCheckout = Math.max(0, saldoBase + props.cargosExtra + totalMultas - props.descuento);
  const pagoMinimoOk = Number(detalle.total_estimado) <= 0
    ? false
    : Number(detalle.total_pagado) >= Number(detalle.total_estimado) * 0.3;
  const habitacion = detalle.habitaciones[0];

  const avanzar = () => props.setPaso(Math.min(props.paso + 1, pasos.length - 1));
  const retroceder = () => props.setPaso(Math.max(props.paso - 1, 0));

  const bloqueoFinal = esCheckin ? !pagoMinimoOk : saldoCheckout > 0;

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>{esCheckin ? 'CHECK-IN GUIADO' : 'CHECK-OUT GUIADO'}</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{detalle.codigo_reserva}</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{detalle.cliente.nombre_completo}</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.stepRow}>
              {pasos.map((p, i) => {
                const active = i === props.paso;
                const done = i < props.paso;
                return (
                  <View key={p} style={styles.stepItem}>
                    <View style={[
                      styles.stepDot,
                      {
                        backgroundColor: active || done ? colors.gold.primary : colors.bg.secondary,
                        borderColor: active || done ? colors.gold.primary : colors.border.primary,
                      },
                    ]}>
                      <Text style={{ color: active || done ? colors.text.inverse : colors.text.muted, fontSize: 10 }}>{done ? '✓' : i + 1}</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.stepLabel, { color: active ? colors.gold.primary : colors.text.muted }]}>{p}</Text>
                  </View>
                );
              })}
            </View>

            {props.paso === 0 ? (
              <View>
                <Info colors={colors} title="Huésped" value={detalle.cliente.nombre_completo} detail={`${detalle.cliente.correo}${detalle.cliente.telefono ? ` · ${detalle.cliente.telefono}` : ''}`} />
                <Info colors={colors} title="Documento / identidad" value={`${detalle.cliente.tipo_documento ?? 'Documento'} ${detalle.cliente.numero_documento ?? 'sin registrar'}`} detail={`Nivel: ${detalle.cliente.nivel_fidelidad ?? 'Sin nivel'}`} />
              </View>
            ) : null}

            {props.paso === 1 && esCheckin ? (
              <View>
                <Info colors={colors} title="Validación de reserva" value={detalle.estado.replace('_', ' ')} detail={`${fechaCorta(detalle.fecha_entrada)} → ${fechaCorta(detalle.fecha_salida)} · ${detalle.cantidad_adultos} adulto(s), ${detalle.cantidad_ninos} niño(s)`} />
                <Info colors={colors} title="Observaciones de reserva" value={detalle.observaciones || 'Sin observaciones'} detail="Revisa peticiones especiales antes de entregar la habitación." />
              </View>
            ) : null}

            {props.paso === 1 && !esCheckin ? (
              <View>
                <Info colors={colors} title="Estado de pago" value={saldoCheckout > 0 ? `Pendiente ${money(saldoCheckout)}` : 'Pago completo'} detail={`Total ${money(detalle.total_estimado)} · Pagado ${money(detalle.total_pagado)}`} />
                <View style={styles.twoCols}>
                  <Input colors={colors} label="Cargos extra" value={String(props.cargosExtra || '')} onChangeText={(v) => props.setCargosExtra(Number(v.replace(',', '.')) || 0)} placeholder="0.00" />
                  <Input colors={colors} label="Descuento" value={String(props.descuento || '')} onChangeText={(v) => props.setDescuento(Number(v.replace(',', '.')) || 0)} placeholder="0.00" />
                </View>
                <PenaltyFields
                  colors={colors}
                  llegada={props.multaLlegadaTardia}
                  setLlegada={props.setMultaLlegadaTardia}
                  cambio={props.multaCambioUltimaHora}
                  setCambio={props.setMultaCambioUltimaHora}
                  motivo={props.motivoMulta}
                  setMotivo={props.setMotivoMulta}
                />
                {saldoCheckout > 0 ? (
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.status.warning }]} onPress={props.onVerPago}>
                    <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>Ir a pagos</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {props.paso === 2 && esCheckin ? (
              <View>
                <Info colors={colors} title="Estado de pago" value={pagoMinimoOk ? 'Anticipo válido' : 'Falta anticipo mínimo'} detail={`Total ${money(detalle.total_estimado)} · Pagado ${money(detalle.total_pagado)} · Mínimo 30%`} />
                <PenaltyFields
                  colors={colors}
                  llegada={props.multaLlegadaTardia}
                  setLlegada={props.setMultaLlegadaTardia}
                  cambio={props.multaCambioUltimaHora}
                  setCambio={props.setMultaCambioUltimaHora}
                  motivo={props.motivoMulta}
                  setMotivo={props.setMotivoMulta}
                />
                {totalMultas > 0 ? (
                  <View style={[styles.noticeBox, { backgroundColor: colors.status.warningBg, borderColor: colors.status.warning }]}>
                    <Ionicons name="cash-outline" size={18} color={colors.status.warning} />
                    <Text style={[styles.noticeText, { color: colors.status.warning }]}>Multas registradas: {money(totalMultas)}. Deben cobrarse según política del hotel y quedarán en observaciones del check-in.</Text>
                  </View>
                ) : null}
                {!pagoMinimoOk ? (
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.status.warning }]} onPress={props.onVerPago}>
                    <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>Registrar anticipo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {props.paso === 2 && !esCheckin ? (
              <View>
                <Info colors={colors} title="Habitación asignada" value={habitacion ? `Hab. ${habitacion.numero} · ${habitacion.tipo}` : 'Sin habitación'} detail={habitacion ? `Piso ${habitacion.piso ?? '—'} · Al finalizar pasará a limpieza` : 'Revisa la asignación antes de continuar'} />
                <View style={[styles.noticeBox, { backgroundColor: `${colors.gold.primary}12`, borderColor: colors.border.gold }]}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.gold.primary} />
                  <Text style={[styles.noticeText, { color: colors.text.secondary }]}>Después del check-out, la habitación queda en limpieza y housekeeping debe recibir la tarea posterior.</Text>
                </View>
              </View>
            ) : null}

            {props.paso === 3 && esCheckin ? (
              <View>
                <Info colors={colors} title="Confirmación de habitación" value={habitacion ? `Hab. ${habitacion.numero} · ${habitacion.tipo}` : 'Sin habitación'} detail={habitacion ? `Piso ${habitacion.piso ?? '—'} · Se marcará como ocupada` : 'No hay habitación asignada'} />
                <Input colors={colors} label="Observaciones del check-in" value={props.observaciones} onChangeText={props.setObservaciones} placeholder="Notas de llegada, documento, solicitudes..." multiline />
              </View>
            ) : null}

            {props.paso === 3 && !esCheckin ? (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Estado de habitación</Text>
                <View style={styles.payOptions}>
                  <TouchableOpacity
                    onPress={() => props.setSinDanos(true)}
                    style={[styles.payOption, { borderColor: props.sinDanos ? colors.gold.primary : colors.border.primary, backgroundColor: props.sinDanos ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                  >
                    <Text style={[styles.payOptionLabel, { color: props.sinDanos ? colors.gold.primary : colors.text.primary }]}>Sin daños</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => props.setSinDanos(false)}
                    style={[styles.payOption, { borderColor: !props.sinDanos ? colors.status.warning : colors.border.primary, backgroundColor: !props.sinDanos ? colors.status.warningBg : colors.bg.secondary }]}
                  >
                    <Text style={[styles.payOptionLabel, { color: !props.sinDanos ? colors.status.warning : colors.text.primary }]}>Con observación</Text>
                  </TouchableOpacity>
                </View>
                {!props.sinDanos ? <Input colors={colors} label="Detalle de daños/observación" value={props.notaDanos} onChangeText={props.setNotaDanos} placeholder="Describe lo encontrado..." multiline /> : null}
                <Input colors={colors} label="Observaciones del check-out" value={props.observaciones} onChangeText={props.setObservaciones} placeholder="Notas de salida, consumos, estado general..." multiline />
              </View>
            ) : null}

            {props.paso === 4 ? (
              <View>
                <Info colors={colors} title={esCheckin ? 'Finalizar check-in' : 'Finalizar check-out'} value={esCheckin ? 'Habitación ocupada' : 'Habitación a limpieza'} detail={esCheckin ? 'Se registrará hora real de entrada y auditoría.' : 'Se registrará hora real de salida y se activará el flujo de housekeeping.'} />
                {bloqueoFinal ? (
                  <View style={[styles.noticeBox, { backgroundColor: colors.status.warningBg, borderColor: colors.status.warning }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.status.warning} />
                    <Text style={[styles.noticeText, { color: colors.status.warning }]}>{esCheckin ? 'Falta validar el anticipo mínimo del 30%.' : `Aún existe saldo pendiente: ${money(saldoCheckout)}.`}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.wizardActions}>
              <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.border.primary }]} onPress={props.paso === 0 ? props.onClose : retroceder}>
                <Text style={[styles.confirmBtnText, { color: colors.text.secondary }]}>{props.paso === 0 ? 'Cerrar' : 'Atrás'}</Text>
              </TouchableOpacity>
              {props.paso < pasos.length - 1 ? (
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.gold.primary, borderColor: colors.gold.primary }]} onPress={avanzar}>
                  <Text style={[styles.confirmBtnText, { color: colors.text.inverse }]}>Continuar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: bloqueoFinal ? colors.text.muted : colors.gold.primary, borderColor: bloqueoFinal ? colors.text.muted : colors.gold.primary }]}
                  onPress={props.onFinalizar}
                  disabled={bloqueoFinal || Boolean(props.procesando)}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.text.inverse }]}>
                    {props.procesando === 'finalizar-checkin' || props.procesando === 'finalizar-checkout'
                      ? 'Procesando...'
                      : esCheckin ? 'Realizar check-in' : 'Realizar check-out'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CancelacionExcepcionModal(props: {
  visible: boolean;
  colors: any;
  data: CancelacionExcepcion;
  setMotivo: (v: string) => void;
  procesando: string | null;
  onCambiarFecha: () => void;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const { colors, data } = props;
  return (
    <Modal visible={props.visible} animationType="fade" transparent onRequestClose={props.onClose}>
      <View style={styles.centerOverlay}>
        <View style={[styles.confirmCard, styles.cancelCard, { backgroundColor: colors.bg.secondary, borderColor: colors.status.warning, alignItems: 'stretch' }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cancelCardContent}>
            <View style={[styles.confirmIcon, { backgroundColor: colors.status.warningBg, alignSelf: 'center' }]}>
              <Ionicons name="alert-circle-outline" size={26} color={colors.status.warning} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text.primary }]}>Evita cancelar la reserva</Text>
            <Text style={[styles.confirmText, { color: colors.text.secondary }]}>
              Si el huésped necesita otra fecha, lo correcto es cambiar la fecha de la reserva para no perder historial, pago ni disponibilidad. Cancela solo si es una excepción administrativa.
            </Text>
            <View style={[styles.noticeBox, { backgroundColor: `${colors.gold.primary}12`, borderColor: colors.border.gold, marginTop: 12 }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.gold.primary} />
              <Text style={[styles.noticeText, { color: colors.text.secondary }]}>
                Reserva {data?.reserva.codigo_reserva ?? ''}: {fechaCorta(data?.reserva.fecha_entrada)} → {fechaCorta(data?.reserva.fecha_salida)}
              </Text>
            </View>
            <Input
              colors={colors}
              label="Motivo de excepción"
              value={data?.motivo ?? ''}
              onChangeText={props.setMotivo}
              placeholder="Ej. Error de registro, duplicada, caso autorizado por gerencia..."
              multiline
            />
            <View style={styles.cancelActions}>
              <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.border.primary }]} onPress={props.onClose}>
                <Text style={[styles.confirmBtnText, { color: colors.text.secondary }]}>Cerrar</Text>
              </TouchableOpacity>
              {false ? (
                <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.gold.primary, backgroundColor: `${colors.gold.primary}14` }]} onPress={props.onCambiarFecha}>
                  <Text style={[styles.confirmBtnText, { color: colors.gold.primary }]}>Cambiar fecha</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.status.error, borderColor: colors.status.error, opacity: props.procesando === 'cancelar' ? 0.6 : 1 }]}
                disabled={props.procesando === 'cancelar'}
                onPress={props.onConfirmar}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text.inverse }]}>{props.procesando === 'cancelar' ? 'Cancelando...' : 'Cancelar por excepción'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CambioFechasModal(props: {
  visible: boolean;
  colors: any;
  data: CambioFechas;
  setFechaEntrada: (v: string) => void;
  setFechaSalida: (v: string) => void;
  procesando: string | null;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const { colors, data } = props;
  const [picker, setPicker] = useState<'entrada' | 'salida' | null>(null);
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSmall, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>CAMBIAR FECHA</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{data?.reserva.codigo_reserva ?? 'Reserva'}</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Selecciona el nuevo rango de estadía.</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateSection}>
              <DateButton colors={colors} label="Nueva llegada" value={data?.fechaEntrada ?? hoy()} icon="log-in-outline" onPress={() => setPicker('entrada')} />
              <View style={[styles.dateDivider, { backgroundColor: colors.border.primary }]} />
              <DateButton colors={colors} label="Nueva salida" value={data?.fechaSalida ?? sumarDias(data?.fechaEntrada ?? hoy(), 1)} icon="log-out-outline" onPress={() => setPicker('salida')} />
            </View>

            <View style={[styles.noticeBox, { backgroundColor: `${colors.gold.primary}12`, borderColor: colors.border.gold }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.gold.primary} />
              <Text style={[styles.noticeText, { color: colors.text.secondary }]}>El sistema validará disponibilidad y recalculará el total usando la misma función que la web.</Text>
            </View>

            <View style={styles.cancelActions}>
              <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.border.primary }]} onPress={props.onClose}>
                <Text style={[styles.confirmBtnText, { color: colors.text.secondary }]}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.gold.primary, borderColor: colors.gold.primary, opacity: props.procesando === 'cambiar-fechas' ? 0.6 : 1 }]}
                onPress={props.onConfirmar}
                disabled={props.procesando === 'cambiar-fechas'}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text.inverse }]}>{props.procesando === 'cambiar-fechas' ? 'Guardando...' : 'Guardar fechas'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <DatePickerModal
            visible={picker === 'entrada'}
            titulo="Nueva fecha de llegada"
            valorActual={data?.fechaEntrada ?? hoy()}
            fechaMinima={hoy()}
            onSeleccionar={(fecha) => {
              props.setFechaEntrada(fecha);
              setPicker(null);
            }}
            onCerrar={() => setPicker(null)}
          />
          <DatePickerModal
            visible={picker === 'salida'}
            titulo="Nueva fecha de salida"
            valorActual={data?.fechaSalida ?? sumarDias(data?.fechaEntrada ?? hoy(), 1)}
            fechaMinima={sumarDias(data?.fechaEntrada ?? hoy(), 1)}
            onSeleccionar={(fecha) => {
              props.setFechaSalida(fecha);
              setPicker(null);
            }}
            onCerrar={() => setPicker(null)}
          />
        </View>
      </View>
    </Modal>
  );
}

function ClienteReservaModal(props: {
  visible: boolean;
  colors: any;
  data: ClienteEdicion;
  setData: (patch: Partial<NonNullable<ClienteEdicion>>) => void;
  procesando: string | null;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const { colors, data } = props;
  const faltaDocumento = !data?.tipoDocumento || !data?.numeroDocumento;
  const faltaTelefono = !data?.telefono;
  const [pickerNacimiento, setPickerNacimiento] = useState(false);
  const paisesSugeridos = PAISES.filter((p) => normalizar(p).includes(normalizar(data?.pais || ''))).slice(0, 6);
  const paisActual = getPaisData(data?.pais) ?? PAIS_DATA[0];
  const ciudadesDelPais = getCiudadesPais(data?.pais);
  const ciudadesSugeridas = ciudadesDelPais
    .filter((c) => normalizar(c).includes(normalizar(data?.ciudad || '')))
    .slice(0, 8);
  const seleccionarPais = (pais: string) => {
    const info = getPaisData(pais);
    props.setData({
      pais,
      ciudad: '',
      codigoTelefono: info?.codigo ?? data?.codigoTelefono ?? '+591',
      nacionalidad: info?.nacionalidad ?? data?.nacionalidad ?? '',
    });
  };
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSmall, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>DATOS DEL HUÉSPED</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Completar cliente</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Actualiza solo datos existentes del cliente; no se crea información extra.</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {(faltaDocumento || faltaTelefono) ? (
              <View style={[styles.noticeBox, { backgroundColor: colors.status.warningBg, borderColor: colors.status.warning }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.status.warning} />
                <Text style={[styles.noticeText, { color: colors.status.warning }]}>
                  {`Faltan datos del cliente: ${[faltaTelefono ? 'teléfono' : '', faltaDocumento ? 'documento' : ''].filter(Boolean).join(' y ')}.`}
                </Text>
              </View>
            ) : null}

            <Input colors={colors} label="Nombre completo" value={data?.nombreCompleto ?? ''} onChangeText={(v) => props.setData({ nombreCompleto: soloLetrasNombre(v) })} placeholder="Nombre del huésped" />
            <Info colors={colors} title="Correo registrado" value={data?.correo || 'Sin correo'} detail="El correo pertenece a la cuenta del usuario; aquí solo se completan datos de huésped." />

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>País</Text>
            <Input
              colors={colors}
              label=""
              value={data?.pais ?? ''}
              onChangeText={(v) => {
                const pais = soloLetrasNombre(v);
                const exacto = getPaisData(pais);
                props.setData({
                  pais,
                  ciudad: exacto ? '' : data?.ciudad ?? '',
                  codigoTelefono: exacto?.codigo ?? data?.codigoTelefono ?? '+591',
                  nacionalidad: exacto?.nacionalidad ?? data?.nacionalidad ?? '',
                });
              }}
              placeholder="Escribe país: bo, arg, per..."
            />
            <OptionChips colors={colors} items={paisesSugeridos.length ? paisesSugeridos : PAISES.slice(0, 8)} selected={data?.pais ?? ''} onSelect={seleccionarPais} />

            <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Ciudad</Text>
            <Input colors={colors} label="" value={data?.ciudad ?? ''} onChangeText={(v) => props.setData({ ciudad: soloLetrasNombre(v) })} placeholder="Ej. La Paz" />
            <OptionChips colors={colors} items={ciudadesSugeridas.length ? ciudadesSugeridas : ciudadesDelPais.slice(0, 8)} selected={data?.ciudad ?? ''} onSelect={(ciudad) => props.setData({ ciudad })} />

            <View style={styles.twoCols}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Código</Text>
                <View style={styles.optionGrid}>
                  {[paisActual, ...PAIS_DATA.filter((p) => p.pais !== paisActual.pais).slice(0, 5)].map((item) => {
                    const active = data?.codigoTelefono === item.codigo;
                    return (
                      <TouchableOpacity
                        key={item.codigo}
                        onPress={() => props.setData({ codigoTelefono: item.codigo, pais: item.pais, nacionalidad: item.nacionalidad, ciudad: '' })}
                        style={[styles.optionChip, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]}
                      >
                        <Text style={[styles.optionText, { color: active ? colors.gold.primary : colors.text.secondary }]}>{item.codigo} · {item.pais}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <Input colors={colors} label="Teléfono" value={data?.telefono ?? ''} onChangeText={(v) => props.setData({ telefono: soloDigitos(v).slice(0, data?.codigoTelefono === '+591' ? 8 : 15) })} placeholder={data?.codigoTelefono === '+591' ? '7xxxxxxx' : 'Número'} />
            </View>

            <View style={styles.twoCols}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text.muted }]}>Tipo doc.</Text>
                <OptionChips colors={colors} items={['CI', 'ID', 'Pasaporte', 'Otro']} selected={data?.tipoDocumento ?? ''} onSelect={(tipoDocumento) => props.setData({ tipoDocumento })} compact />
              </View>
              <Input colors={colors} label="Número documento" value={data?.numeroDocumento ?? ''} onChangeText={(v) => props.setData({ numeroDocumento: soloDigitos(v).slice(0, 12) })} placeholder="Solo números" />
            </View>

            <DateButton
              colors={colors}
              label="Fecha de nacimiento"
              value={data?.fechaNacimiento || '1998-01-01'}
              icon="calendar-outline"
              onPress={() => setPickerNacimiento(true)}
            />
            <Input colors={colors} label="Dirección" value={data?.direccion ?? ''} onChangeText={(v) => props.setData({ direccion: v })} placeholder="Zona, calle, referencia..." />

            <View style={styles.cancelActions}>
              <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.border.primary }]} onPress={props.onClose}>
                <Text style={[styles.confirmBtnText, { color: colors.text.secondary }]}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.gold.primary, borderColor: colors.gold.primary, opacity: props.procesando === 'guardar-cliente' ? 0.6 : 1 }]}
                disabled={props.procesando === 'guardar-cliente'}
                onPress={props.onConfirmar}
              >
                <Text style={[styles.confirmBtnText, { color: colors.text.inverse }]}>{props.procesando === 'guardar-cliente' ? 'Guardando...' : 'Guardar datos'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <DatePickerModal
            visible={pickerNacimiento}
            titulo="Fecha de nacimiento"
            valorActual={data?.fechaNacimiento || '1998-01-01'}
            fechaMinima="1900-01-01"
            onSeleccionar={(fecha) => {
              props.setData({ fechaNacimiento: fecha });
              setPickerNacimiento(false);
            }}
            onCerrar={() => setPickerNacimiento(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

function OptionChips({ colors, items, selected, onSelect, compact }: { colors: any; items: string[]; selected: string; onSelect: (v: string) => void; compact?: boolean }) {
  return (
    <View style={styles.optionGrid}>
      {items.map((item) => {
        const active = normalizar(selected) === normalizar(item);
        return (
          <TouchableOpacity
            key={item}
            onPress={() => onSelect(item)}
            style={[
              styles.optionChip,
              compact && styles.optionChipCompact,
              { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary },
            ]}
          >
            <Text style={[styles.optionText, { color: active ? colors.gold.primary : colors.text.secondary }]}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReservaDetalleModal(props: {
  visible: boolean;
  detalle: AdminReservaDetalle | null;
  colors: any;
  procesando: string | null;
  onClose: () => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  onNoShow: () => void;
  onCheckin: () => void;
  onCheckout: () => void;
  onCambiarHabitacion: () => void;
  onCambiarFecha: () => void;
  onEditarCliente: () => void;
  onVerPago: () => void;
}) {
  const { visible, detalle, colors } = props;
  const saldo = detalle ? Math.max(0, Number(detalle.total_estimado) - Number(detalle.total_pagado)) : 0;
  const estado = normalizar(detalle?.estado);
  const faltanDatosCliente = Boolean(detalle && (!detalle.cliente.telefono || !detalle.cliente.tipo_documento || !detalle.cliente.numero_documento));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          {detalle ? (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>DETALLE DE RESERVA</Text>
                  <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{detalle.codigo_reserva}</Text>
                  <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{detalle.cliente.nombre_completo}</Text>
                </View>
                <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                  <Ionicons name="close" size={22} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <Info colors={colors} title="Huésped" value={detalle.cliente.nombre_completo} detail={`${detalle.cliente.correo}${detalle.cliente.telefono ? ` · ${detalle.cliente.telefono}` : ' · Teléfono pendiente'}`} />
              {faltanDatosCliente ? (
                <View style={[styles.noticeBox, { backgroundColor: colors.status.warningBg, borderColor: colors.status.warning }]}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.status.warning} />
                  <Text style={[styles.noticeText, { color: colors.status.warning }]}>Al cliente le falta llenar datos importantes: teléfono y/o documento. Puedes completarlos desde esta reserva.</Text>
                </View>
              ) : null}
              <Info colors={colors} title="Fechas" value={`${fechaCorta(detalle.fecha_entrada)} → ${fechaCorta(detalle.fecha_salida)}`} detail={`${detalle.cantidad_adultos} adulto(s) · ${detalle.cantidad_ninos} niño(s) · Origen ${detalle.origen}`} />
              <Info colors={colors} title="Habitación asignada" value={detalle.habitaciones.map((h) => `${h.numero} · ${h.tipo}`).join(', ') || 'Sin habitación'} detail={detalle.habitaciones.map((h) => `Piso ${h.piso ?? '—'} · ${money(h.subtotal)}`).join(' / ') || 'Sin detalle'} />
              <Info colors={colors} title="Pago" value={`${money(detalle.total_pagado)} pagado de ${money(detalle.total_estimado)}`} detail={saldo > 0 ? `Saldo pendiente ${money(saldo)}` : 'Pago al día'} />
              <Info colors={colors} title="Observaciones" value={detalle.observaciones || 'Sin observaciones'} detail={detalle.motivo_cancelacion ? `Motivo: ${detalle.motivo_cancelacion}` : `Estado: ${detalle.estado.replace('_', ' ')}`} />

              <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Acciones rápidas</Text>
              <View style={styles.actions}>
                {estado === 'pendiente' ? <Action colors={colors} label="Confirmar reserva" icon="checkmark-circle-outline" color={colors.status.success} loading={props.procesando === 'confirmar'} onPress={props.onConfirmar} /> : null}
                {['pendiente', 'confirmada'].includes(estado) ? <Action colors={colors} label="Registrar check-in" icon="log-in-outline" color={colors.status.info} loading={props.procesando === 'checkin'} onPress={props.onCheckin} /> : null}
                {['en_estadia', 'hospedado'].includes(estado) ? <Action colors={colors} label="Registrar check-out" icon="log-out-outline" color={colors.gold.primary} loading={props.procesando === 'checkout'} onPress={props.onCheckout} /> : null}
                <Action colors={colors} label={faltanDatosCliente ? 'Completar datos del cliente' : 'Editar datos del cliente'} icon="person-circle-outline" color={faltanDatosCliente ? colors.status.warning : colors.status.info} loading={props.procesando === 'guardar-cliente'} onPress={props.onEditarCliente} />
                {false && !['cancelada', 'finalizada', 'no_show'].includes(estado) ? <Action colors={colors} label="Cambiar fecha" icon="calendar-outline" color={colors.status.info} loading={props.procesando === 'cambiar-fechas'} onPress={props.onCambiarFecha} /> : null}
                {false && !['cancelada', 'finalizada', 'no_show'].includes(estado) ? <Action colors={colors} label="Cambiar habitación" icon="swap-horizontal-outline" color={colors.gold.primary} loading={props.procesando === 'buscar-habitaciones'} onPress={props.onCambiarHabitacion} /> : null}
                <Action colors={colors} label="Ver pago" icon="card-outline" color={saldo > 0 ? colors.status.warning : colors.status.success} onPress={props.onVerPago} />
                {!['cancelada', 'finalizada', 'no_show'].includes(estado) ? <Action colors={colors} label="Marcar no show" icon="person-remove-outline" color="#a06ad4" loading={props.procesando === 'no-show'} onPress={props.onNoShow} /> : null}
                {!['cancelada', 'finalizada', 'no_show'].includes(estado) ? <Action colors={colors} label="Cancelar reserva" icon="close-circle-outline" color={colors.status.error} loading={props.procesando === 'cancelar'} onPress={props.onCancelar} /> : null}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Pagos registrados</Text>
              {detalle.pagos.length ? detalle.pagos.map((p) => (
                <View key={p.id} style={[styles.historyRow, { borderColor: colors.border.primary }]}>
                  <Text style={[styles.historyGuest, { color: colors.text.primary }]}>{money(p.monto)} · {p.metodo}</Text>
                  <Text style={[styles.cardMeta, { color: colors.text.muted }]}>{p.tipo_pago} · {p.estado} · {p.fecha_pago ? fechaCorta(p.fecha_pago.slice(0, 10)) : 'Sin fecha'}</Text>
                </View>
              )) : <Text style={[styles.message, { color: colors.text.muted }]}>Sin pagos registrados.</Text>}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function PagoConfirmacionModal(props: {
  visible: boolean;
  colors: any;
  detalle: AdminReservaDetalle | null;
  metodos: MetodoPagoAdmin[];
  metodoPagoId: string;
  setMetodoPagoId: (v: string) => void;
  montoPago: number;
  setMontoPago: (v: number) => void;
  tipoPago: 'anticipo' | 'pago_total';
  setTipoPago: (v: 'anticipo' | 'pago_total') => void;
  modo: 'confirmar' | 'registrar';
  procesando: string | null;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const { colors, detalle } = props;
  const esConfirmacion = props.modo === 'confirmar';
  const total = Number(detalle?.total_estimado ?? 0);
  const pagado = Number(detalle?.total_pagado ?? 0);
  const saldo = Math.max(0, total - pagado);
  const minimoPendiente = Math.max(0, total * 0.3 - pagado);
  const opciones = [
    { label: '30%', value: Math.max(minimoPendiente, total * 0.3) },
    { label: 'Mitad', value: Math.max(minimoPendiente, total * 0.5) },
    { label: 'Total', value: saldo },
  ].filter((o) => o.value > 0);

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>{esConfirmacion ? 'CONFIRMAR CON PAGO' : 'REGISTRAR PAGO'}</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Reserva {detalle?.codigo_reserva ?? ''}</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{esConfirmacion ? 'Para confirmar se requiere mínimo 30% del total.' : 'Registra el abono, anticipo o pago total con validación del saldo pendiente.'}</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.paySummary, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
              <View>
                <Text style={[styles.cardMeta, { color: colors.text.muted }]}>Total</Text>
                <Text style={[styles.payValue, { color: colors.text.primary }]}>{money(total)}</Text>
              </View>
              <View>
                <Text style={[styles.cardMeta, { color: colors.text.muted }]}>Pagado</Text>
                <Text style={[styles.payValue, { color: colors.status.success }]}>{money(pagado)}</Text>
              </View>
              <View>
                <Text style={[styles.cardMeta, { color: colors.text.muted }]}>Mínimo falta</Text>
                <Text style={[styles.payValue, { color: minimoPendiente > 0 ? colors.status.warning : colors.status.success }]}>{money(minimoPendiente)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Monto a registrar</Text>
            <View style={styles.payOptions}>
              {opciones.map((op) => {
                const active = Math.abs(props.montoPago - op.value) < 0.01;
                return (
                  <TouchableOpacity
                    key={op.label}
                    onPress={() => {
                      props.setMontoPago(Number(op.value.toFixed(2)));
                      props.setTipoPago(op.value >= saldo ? 'pago_total' : 'anticipo');
                    }}
                    style={[
                      styles.payOption,
                      {
                        borderColor: active ? colors.gold.primary : colors.border.primary,
                        backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary,
                      },
                    ]}
                  >
                    <Text style={[styles.payOptionLabel, { color: active ? colors.gold.primary : colors.text.primary }]}>{op.label}</Text>
                    <Text style={[styles.cardMeta, { color: colors.text.muted }]}>{money(op.value)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Input
              colors={colors}
              label="Monto personalizado"
              value={String(props.montoPago || '')}
              onChangeText={(v) => {
                const n = Number(v.replace(',', '.')) || 0;
                props.setMontoPago(n);
                props.setTipoPago(n >= saldo ? 'pago_total' : 'anticipo');
              }}
              placeholder="0.00"
            />

            <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Método de pago</Text>
            <View style={styles.roomList}>
              {props.metodos.map((m) => {
                const active = props.metodoPagoId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => props.setMetodoPagoId(m.id)}
                    style={[
                      styles.selectorRow,
                      {
                        borderColor: active ? colors.gold.primary : colors.border.primary,
                        backgroundColor: active ? `${colors.gold.primary}18` : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.historyGuest, { color: active ? colors.gold.primary : colors.text.primary }]}>{m.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.payOptions}>
              {[
                { id: 'anticipo' as const, label: 'Anticipo' },
                { id: 'pago_total' as const, label: 'Pago total' },
              ].map((t) => {
                const active = props.tipoPago === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => props.setTipoPago(t.id)}
                    style={[
                      styles.payOption,
                      {
                        borderColor: active ? colors.gold.primary : colors.border.primary,
                        backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary,
                      },
                    ]}
                  >
                    <Text style={[styles.payOptionLabel, { color: active ? colors.gold.primary : colors.text.primary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.gold.primary, opacity: props.procesando === 'pago-confirmar' ? 0.6 : 1 }]}
              onPress={props.onConfirmar}
              disabled={props.procesando === 'pago-confirmar'}
            >
              <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>
                {props.procesando === 'pago-confirmar' ? 'Registrando...' : esConfirmacion ? 'Registrar pago y confirmar' : 'Registrar pago'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmacionModal(props: {
  visible: boolean;
  colors: any;
  data: ConfirmacionAdmin;
  procesando: string | null;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  const { colors, data } = props;
  const [segundos, setSegundos] = useState(30);

  useEffect(() => {
    if (!props.visible) return;
    setSegundos(30);
    const timer = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          clearInterval(timer);
          props.onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [props.visible]);

  return (
    <Modal visible={props.visible} animationType="fade" transparent onRequestClose={props.onClose}>
      <View style={styles.centerOverlay}>
        <View style={[styles.confirmCard, { backgroundColor: colors.bg.secondary, borderColor: data?.peligro ? colors.status.error : colors.border.gold }]}>
          <View style={[styles.confirmIcon, { backgroundColor: data?.peligro ? colors.status.errorBg : `${colors.gold.primary}18` }]}>
            <Ionicons name={data?.peligro ? 'warning-outline' : 'shield-checkmark-outline'} size={25} color={data?.peligro ? colors.status.error : colors.gold.primary} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.text.primary }]}>{data?.titulo}</Text>
          <Text style={[styles.confirmText, { color: colors.text.secondary }]}>{data?.mensaje}</Text>
          <View style={[styles.timerPill, { backgroundColor: colors.bg.primary, borderColor: colors.border.primary }]}>
            <Ionicons name="time-outline" size={15} color={colors.gold.primary} />
            <Text style={[styles.timerText, { color: colors.text.secondary }]}>Esta confirmación se cerrará en {segundos}s</Text>
          </View>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={[styles.confirmBtn, { borderColor: colors.border.primary }]} onPress={props.onClose}>
              <Text style={[styles.confirmBtnText, { color: colors.text.secondary }]}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: data?.peligro ? colors.status.error : colors.gold.primary, borderColor: data?.peligro ? colors.status.error : colors.gold.primary }]}
              onPress={props.onConfirmar}
              disabled={Boolean(props.procesando)}
            >
              <Text style={[styles.confirmBtnText, { color: colors.text.inverse }]}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MensajeModal({ visible, colors, data, onClose }: { visible: boolean; colors: any; data: MensajeAdmin; onClose: () => void }) {
  const tipo = data?.tipo ?? 'info';
  const color = tipo === 'ok' ? colors.status.success : tipo === 'error' ? colors.status.error : tipo === 'warning' ? colors.status.warning : colors.gold.primary;
  const icon = tipo === 'ok' ? 'checkmark-circle-outline' : tipo === 'error' ? 'close-circle-outline' : tipo === 'warning' ? 'alert-circle-outline' : 'information-circle-outline';
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.centerOverlay}>
        <View style={[styles.messageCard, { backgroundColor: colors.bg.secondary, borderColor: color }]}>
          <View style={[styles.confirmIcon, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon as any} size={25} color={color} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.text.primary }]}>{data?.titulo}</Text>
          <Text style={[styles.confirmText, { color: colors.text.secondary }]}>{data?.mensaje}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: color, alignSelf: 'stretch' }]} onPress={onClose}>
            <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function NuevaReservaModal(props: {
  visible: boolean; colors: any; clienteQuery: string; setClienteQuery: (v: string) => void;
  clientes: AdminClienteBusqueda[]; clienteSel: AdminClienteBusqueda | null; seleccionarCliente: (c: AdminClienteBusqueda) => void;
  fechaEntrada: string; setFechaEntrada: (v: string) => void; fechaSalida: string; setFechaSalida: (v: string) => void;
  habitaciones: AdminHabitacionDisponible[]; habitacionSel: string; setHabitacionSel: (v: string) => void; buscarHabitaciones: () => void;
  adultos: number; setAdultos: (v: number) => void; ninos: number; setNinos: (v: number) => void;
  observaciones: string; setObservaciones: (v: string) => void;
  peticiones: string[]; setPeticiones: (v: string[]) => void;
  procesando: string | null; onCrear: () => void; onClose: () => void;
}) {
  const { colors } = props;
  const [picker, setPicker] = useState<'entrada' | 'salida' | null>(null);
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.bg.primary }]}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>NUEVA RESERVA</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Reserva rápida</Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Selecciona fechas desde el calendario</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Input colors={colors} label="Cliente" value={props.clienteQuery} onChangeText={props.setClienteQuery} placeholder="Buscar por nombre, correo o documento" />
            {props.clientes.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.selectorRow, { borderColor: colors.border.primary }]} onPress={() => props.seleccionarCliente(c)}>
                <Text style={[styles.historyGuest, { color: colors.text.primary }]}>{c.nombre_completo}</Text>
                <Text style={[styles.cardMeta, { color: colors.text.muted }]}>{c.correo}</Text>
              </TouchableOpacity>
            ))}
            {props.clienteSel ? <Text style={[styles.okText, { color: colors.status.success }]}>Cliente seleccionado: {props.clienteSel.nombre_completo}</Text> : null}

            <View style={styles.dateSection}>
              <DateButton
                colors={colors}
                label="Llegada"
                value={props.fechaEntrada}
                icon="log-in-outline"
                onPress={() => setPicker('entrada')}
              />
              <View style={[styles.dateDivider, { backgroundColor: colors.border.primary }]} />
              <DateButton
                colors={colors}
                label="Salida"
                value={props.fechaSalida}
                icon="log-out-outline"
                onPress={() => setPicker('salida')}
              />
            </View>
            <View style={styles.twoCols}>
              <Counter colors={colors} label="Adultos" value={props.adultos} setValue={(v) => props.setAdultos(Math.max(1, v))} />
              <Counter colors={colors} label="Niños" value={props.ninos} setValue={(v) => props.setNinos(Math.max(0, v))} />
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary }]} onPress={props.buscarHabitaciones} disabled={props.procesando === 'buscar-habitaciones'}>
              <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>{props.procesando === 'buscar-habitaciones' ? 'Buscando...' : 'Buscar habitaciones disponibles'}</Text>
            </TouchableOpacity>
            <HabitacionList colors={colors} habitaciones={props.habitaciones} selected={props.habitacionSel} onSelect={props.setHabitacionSel} />

            <Text style={[styles.sectionTitle, { color: colors.text.muted }]}>Peticiones del huésped</Text>
            <View style={styles.requestGrid}>
              {PETICIONES_RESERVA.map((item) => {
                const active = props.peticiones.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => props.setPeticiones(active ? props.peticiones.filter((p) => p !== item) : [...props.peticiones, item])}
                    style={[
                      styles.requestChip,
                      {
                        borderColor: active ? colors.gold.primary : colors.border.primary,
                        backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary,
                      },
                    ]}
                  >
                    <Ionicons name={active ? 'checkmark-circle' : 'add-circle-outline'} size={15} color={active ? colors.gold.primary : colors.text.muted} />
                    <Text style={[styles.requestText, { color: active ? colors.gold.primary : colors.text.secondary }]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Input colors={colors} label="Observaciones" value={props.observaciones} onChangeText={props.setObservaciones} placeholder="Notas internas o solicitud del huésped" multiline />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.status.success }]} onPress={props.onCrear} disabled={props.procesando === 'crear-reserva'}>
              <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>{props.procesando === 'crear-reserva' ? 'Creando...' : 'Crear y continuar a pago'}</Text>
            </TouchableOpacity>
          </ScrollView>
          <DatePickerModal
            visible={picker === 'entrada'}
            titulo="Fecha de llegada"
            valorActual={props.fechaEntrada}
            fechaMinima={hoy()}
            onSeleccionar={(fecha) => {
              props.setFechaEntrada(fecha);
              if (!props.fechaSalida || props.fechaSalida <= fecha) props.setFechaSalida(sumarDias(fecha, 1));
              props.setHabitacionSel('');
            }}
            onCerrar={() => setPicker(null)}
          />
          <DatePickerModal
            visible={picker === 'salida'}
            titulo="Fecha de salida"
            valorActual={props.fechaSalida || sumarDias(props.fechaEntrada, 1)}
            fechaMinima={sumarDias(props.fechaEntrada, 1)}
            onSeleccionar={(fecha) => {
              props.setFechaSalida(fecha);
              props.setHabitacionSel('');
            }}
            onCerrar={() => setPicker(null)}
          />
        </View>
      </View>
    </Modal>
  );
}

function HabitacionModal(props: {
  visible: boolean; colors: any; habitaciones: AdminHabitacionDisponible[]; habitacionSel: string; setHabitacionSel: (v: string) => void;
  procesando: string | null; onConfirmar: () => void; onClose: () => void;
}) {
  const { colors } = props;
  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSmall, { backgroundColor: colors.bg.primary }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: colors.gold.primary }]}>CAMBIAR HABITACIÓN</Text>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Disponibles</Text>
              </View>
              <TouchableOpacity onPress={props.onClose} style={[styles.close, { backgroundColor: colors.bg.secondary }]}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <HabitacionList colors={colors} habitaciones={props.habitaciones} selected={props.habitacionSel} onSelect={props.setHabitacionSel} />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.gold.primary }]} onPress={props.onConfirmar} disabled={!props.habitacionSel || props.procesando === 'cambiar-habitacion'}>
              <Text style={{ color: colors.text.inverse, fontWeight: '600' }}>{props.procesando === 'cambiar-habitacion' ? 'Cambiando...' : 'Confirmar cambio'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HabitacionList({ colors, habitaciones, selected, onSelect }: { colors: any; habitaciones: AdminHabitacionDisponible[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={styles.roomList}>
      {habitaciones.map((h) => {
        const id = h.habitacion_id ?? h.id ?? '';
        const active = selected === id;
        return (
          <TouchableOpacity key={id || h.numero} style={[styles.roomOption, { borderColor: active ? colors.gold.primary : colors.border.primary, backgroundColor: active ? `${colors.gold.primary}18` : colors.bg.secondary }]} onPress={() => onSelect(id)}>
            <Text style={[styles.historyGuest, { color: colors.text.primary }]}>Hab. {h.numero} · Piso {h.piso}</Text>
            <Text style={[styles.cardMeta, { color: colors.text.muted }]}>{h.nombre_tipo ?? h.tipo_habitacion ?? 'Habitación'} · {money(h.precio ?? h.precio_base ?? 0)}</Text>
          </TouchableOpacity>
        );
      })}
      {!habitaciones.length ? <Text style={[styles.message, { color: colors.text.muted }]}>Busca habitaciones disponibles para continuar.</Text> : null}
    </View>
  );
}

function PenaltyFields({ colors, llegada, setLlegada, cambio, setCambio, motivo, setMotivo }: {
  colors: any;
  llegada: number;
  setLlegada: (v: number) => void;
  cambio: number;
  setCambio: (v: number) => void;
  motivo: string;
  setMotivo: (v: string) => void;
}) {
  const total = llegada + cambio;
  return (
    <View style={[styles.penaltyBox, { backgroundColor: `${colors.status.warning}10`, borderColor: colors.status.warning }]}>
      <View style={styles.penaltyHeader}>
        <Ionicons name="cash-outline" size={18} color={colors.status.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.status.warning, marginTop: 0, marginBottom: 2 }]}>Multas operativas</Text>
          <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>Úsalas si llegó tarde sin avisar o cambió la reserva dentro de 24h/mismo día.</Text>
        </View>
      </View>
      <View style={styles.twoCols}>
        <Input colors={colors} label="Llegada tardía" value={String(llegada || '')} onChangeText={(v) => setLlegada(Number(v.replace(',', '.')) || 0)} placeholder="0.00" />
        <Input colors={colors} label="Cambio última hora" value={String(cambio || '')} onChangeText={(v) => setCambio(Number(v.replace(',', '.')) || 0)} placeholder="0.00" />
      </View>
      <Input colors={colors} label="Motivo / política aplicada" value={motivo} onChangeText={setMotivo} placeholder="Ej. Llegó 3 horas tarde sin aviso..." multiline />
      {total > 0 ? <Text style={[styles.cardMeta, { color: colors.status.warning }]}>Total multas: {money(total)}</Text> : null}
    </View>
  );
}

function Input({ colors, label, value, onChangeText, placeholder, multiline }: { colors: any; label: string; value: string; onChangeText: (v: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.text.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMulti, { color: colors.text.primary, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}
      />
    </View>
  );
}

function DateButton({ colors, label, value, icon, onPress }: { colors: any; label: string; value: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.dateButton, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}
    >
      <View style={[styles.dateIcon, { backgroundColor: `${colors.gold.primary}18` }]}>
        <Ionicons name={icon} size={18} color={colors.gold.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.dateLabel, { color: colors.text.muted }]}>{label}</Text>
        <Text style={[styles.dateValue, { color: colors.text.primary }]} numberOfLines={1}>{fechaLarga(value)}</Text>
        <Text style={[styles.dateIso, { color: colors.text.muted }]}>{value}</Text>
      </View>
      <Ionicons name="calendar-outline" size={18} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

function Counter({ colors, label, value, setValue }: { colors: any; label: string; value: number; setValue: (v: number) => void }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.text.muted }]}>{label}</Text>
      <View style={[styles.counter, { borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }]}>
        <TouchableOpacity onPress={() => setValue(value - 1)}><Ionicons name="remove-circle-outline" size={24} color={colors.gold.primary} /></TouchableOpacity>
        <Text style={[styles.counterValue, { color: colors.text.primary }]}>{value}</Text>
        <TouchableOpacity onPress={() => setValue(value + 1)}><Ionicons name="add-circle-outline" size={24} color={colors.gold.primary} /></TouchableOpacity>
      </View>
    </View>
  );
}

function Info({ title, value, detail, colors }: { title: string; value: string; detail: string; colors: any }) {
  return (
    <View style={[styles.infoBox, { backgroundColor: colors.bg.secondary, borderColor: colors.border.primary }]}>
      <Text style={[styles.infoTitle, { color: colors.text.muted }]}>{title}</Text>
      <Text style={[styles.infoValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.cardMeta, { color: colors.text.secondary }]}>{detail}</Text>
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
  header: { paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: 14 },
  eyebrow: { fontSize: Typography.xs, fontWeight: '600', letterSpacing: 1.5 },
  title: { fontSize: Typography.xxl, fontWeight: '500', marginTop: 4 },
  subtitle: { fontSize: Typography.sm, marginTop: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 6, marginBottom: 8 },
  tab: { flex: 1, height: 38, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, marginBottom: 8 },
  searchBox: { flex: 1, height: 42, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.sm, padding: 0 },
  newButton: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  filterArea: { height: 44 },
  filters: { gap: 7, paddingHorizontal: Spacing.md, height: 38, alignItems: 'center' },
  filter: { width: 112, height: 32, borderWidth: 1, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  filterText: { fontSize: 10, fontWeight: '500' },
  list: { padding: Spacing.md, paddingBottom: 36 },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  code: { fontSize: Typography.xs, fontWeight: '600', letterSpacing: 1 },
  name: { fontSize: Typography.md, fontWeight: '500', marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, flexWrap: 'wrap' },
  cardMeta: { fontSize: Typography.xs, lineHeight: 17 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  inlineAction: { marginTop: 10, minHeight: 40, borderWidth: 1, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  paymentCard: { width: '48%' },
  paymentValue: { fontSize: Typography.lg, fontWeight: '500' },
  message: { textAlign: 'center', padding: 24, fontSize: Typography.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { maxHeight: '92%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  modalSmall: { maxHeight: '72%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  modalContent: { padding: Spacing.md, paddingTop: 18, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 27, fontWeight: '500', marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 9 },
  infoTitle: { fontSize: 10, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  infoValue: { fontSize: Typography.md, fontWeight: '500', marginBottom: 3 },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '500', letterSpacing: 1.2, marginTop: 16, marginBottom: 10, textTransform: 'uppercase' },
  actions: { gap: 8 },
  action: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionText: { flex: 1, fontSize: Typography.sm, fontWeight: '500' },
  historyRow: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, marginBottom: 8 },
  historyGuest: { fontSize: Typography.sm, fontWeight: '500', marginBottom: 3 },
  inputGroup: { flex: 1, marginBottom: 10 },
  inputLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  input: { minHeight: 42, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, fontSize: Typography.sm },
  inputMulti: { minHeight: 78, paddingTop: 10, textAlignVertical: 'top' },
  twoCols: { flexDirection: 'row', gap: 10 },
  selectorRow: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 11, marginBottom: 7 },
  okText: { fontSize: Typography.xs, fontWeight: '500', marginBottom: 10 },
  counter: { height: 42, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterValue: { fontSize: Typography.md, fontWeight: '500' },
  button: { borderRadius: BorderRadius.md, alignItems: 'center', padding: 12, marginTop: 6, marginBottom: 10 },
  requestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  requestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 11, paddingVertical: 8 },
  requestText: { fontSize: Typography.xs, fontWeight: '500' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  optionChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 8 },
  optionChipCompact: { paddingHorizontal: 10, paddingVertical: 7 },
  optionText: { fontSize: 11, fontWeight: '600' },
  paySummary: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 13, flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  payValue: { fontSize: Typography.sm, fontWeight: '500', marginTop: 3 },
  payOptions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  payOption: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  payOptionLabel: { fontSize: Typography.sm, fontWeight: '500', marginBottom: 2 },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  stepItem: { flex: 1, alignItems: 'center', gap: 5 },
  stepDot: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 9, textAlign: 'center' },
  noticeBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 10 },
  noticeText: { flex: 1, fontSize: Typography.xs, lineHeight: 17 },
  penaltyBox: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 12, marginTop: 12, marginBottom: 12 },
  penaltyHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  wizardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  confirmCard: { width: '100%', maxWidth: 390, borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center' },
  cancelCard: { maxHeight: '86%', padding: 0, overflow: 'hidden' },
  cancelCardContent: { padding: Spacing.lg },
  cancelActions: { gap: 10, marginTop: 14, alignSelf: 'stretch' },
  messageCard: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center' },
  confirmIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: Typography.xl, fontWeight: '500', textAlign: 'center' },
  confirmText: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 7, marginTop: 16 },
  timerText: { fontSize: Typography.xs },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  confirmBtn: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, padding: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: Typography.sm, fontWeight: '600' },
  dateSection: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 10 },
  dateButton: { minHeight: 76, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  dateIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateDivider: { height: 1, marginHorizontal: 12 },
  dateLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  dateValue: { fontSize: Typography.md, fontWeight: '400', textTransform: 'capitalize' },
  dateIso: { fontSize: 10, marginTop: 2 },
  roomList: { gap: 8, marginBottom: 10 },
  roomOption: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 12 },
});
