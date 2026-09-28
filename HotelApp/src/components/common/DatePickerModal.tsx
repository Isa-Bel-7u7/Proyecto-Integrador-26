// SRP: componente exclusivo para seleccionar una fecha en un calendario visual.
// No requiere paquetes externos — usa solo componentes React Native.
import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, Typography } from '../../utils/theme';

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

interface Props {
  visible: boolean;
  titulo: string;
  valorActual: string;       // 'YYYY-MM-DD'
  fechaMinima?: string;      // 'YYYY-MM-DD'
  onSeleccionar: (fecha: string) => void;
  onCerrar: () => void;
}

function parseFecha(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatFecha(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DatePickerModal({
  visible, titulo, valorActual, fechaMinima, onSeleccionar, onCerrar,
}: Props) {
  const { colors } = useTheme();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const inicial = valorActual ? parseFecha(valorActual) : hoy;
  const [mesActual, setMesActual] = useState(new Date(inicial.getFullYear(), inicial.getMonth(), 1));
  const [seleccionada, setSeleccionada] = useState<Date | null>(valorActual ? parseFecha(valorActual) : null);

  const minFecha = fechaMinima ? parseFecha(fechaMinima) : hoy;

  // Sincroniza el calendario cada vez que se abre. El modal permanece montado
  // entre aperturas y, sin esto, conservaba el mes/valor de una sesión anterior.
  useEffect(() => {
    if (!visible) return;
    const valor = valorActual ? parseFecha(valorActual) : minFecha;
    setSeleccionada(valor);
    setMesActual(new Date(valor.getFullYear(), valor.getMonth(), 1));
  }, [visible, valorActual, fechaMinima]);

  const irMesAnterior = () => {
    const nuevo = new Date(mesActual);
    nuevo.setMonth(nuevo.getMonth() - 1);
    const primerMesPermitido = new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
    if (nuevo >= primerMesPermitido) setMesActual(nuevo);
  };

  const irAnioAnterior = () => {
    const nuevo = new Date(mesActual);
    nuevo.setFullYear(nuevo.getFullYear() - 1);
    const primerMesPermitido = new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
    setMesActual(nuevo >= primerMesPermitido ? nuevo : primerMesPermitido);
  };

  const irMesSiguiente = () => {
    const nuevo = new Date(mesActual);
    nuevo.setMonth(nuevo.getMonth() + 1);
    setMesActual(nuevo);
  };

  const irAnioSiguiente = () => {
    const nuevo = new Date(mesActual);
    nuevo.setFullYear(nuevo.getFullYear() + 1);
    setMesActual(nuevo);
  };

  const construirDias = () => {
    const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
    const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
    const dias: (Date | null)[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < primerDia.getDay(); i++) dias.push(null);

    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(new Date(mesActual.getFullYear(), mesActual.getMonth(), d));
    }
    // Completar última fila
    while (dias.length % 7 !== 0) dias.push(null);
    return dias;
  };

  const dias = construirDias();

  const esSeleccionada = (d: Date) =>
    seleccionada ? formatFecha(d) === formatFecha(seleccionada) : false;

  const esHoy = (d: Date) => formatFecha(d) === formatFecha(hoy);

  const esBloqueada = (d: Date) => {
    const f = new Date(d);
    f.setHours(0, 0, 0, 0);
    const m = new Date(minFecha);
    m.setHours(0, 0, 0, 0);
    return f < m;
  };

  const elegirFecha = (fecha: Date) => {
    if (esBloqueada(fecha)) return;
    setSeleccionada(fecha);
    // Un toque confirma la fecha; no se requiere mantener pulsado ni un segundo paso.
    onSeleccionar(formatFecha(fecha));
    onCerrar();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} />
        <View style={[styles.modal, { backgroundColor: colors.bg.secondary, borderColor: colors.border.gold }]}>
          {/* Cabecera visual */}
          <View style={[styles.hero, { backgroundColor: `${colors.gold.primary}18` }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.gold.primary }]}>
              <Ionicons name="calendar" size={20} color={colors.text.inverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroEyebrow, { color: colors.gold.primary }]}>SELECCIONAR FECHA</Text>
              <Text style={[styles.titulo, { color: colors.text.primary }]}>{titulo}</Text>
            </View>
            <TouchableOpacity
              onPress={onCerrar}
              accessibilityLabel="Cerrar calendario"
              style={[styles.closeBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Navegación del mes */}
          <View style={styles.navMes}>
            <TouchableOpacity onPress={irAnioAnterior} style={[styles.navBtn, { borderColor: colors.border.primary }]}>
              <Ionicons name="play-skip-back" size={17} color={colors.gold.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={irMesAnterior} style={[styles.navBtn, { borderColor: colors.border.primary }]}>
              <Ionicons name="chevron-back" size={20} color={colors.gold.primary} />
            </TouchableOpacity>
            <Text style={[styles.mesLabel, { color: colors.text.primary }]}>
              {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
            </Text>
            <TouchableOpacity onPress={irMesSiguiente} style={[styles.navBtn, { borderColor: colors.border.primary }]}>
              <Ionicons name="chevron-forward" size={20} color={colors.gold.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={irAnioSiguiente} style={[styles.navBtn, { borderColor: colors.border.primary }]}>
              <Ionicons name="play-skip-forward" size={17} color={colors.gold.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.semanRow}>
            {DIAS_SEMANA.map((d) => (
              <Text key={d} style={[styles.diaSemana, { color: colors.text.muted }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {dias.map((dia, i) => {
              if (!dia) return <View key={`empty-${i}`} style={styles.celdaVacia} />;
              const sel = esSeleccionada(dia);
              const hoyD = esHoy(dia);
              const bloq = esBloqueada(dia);
              return (
                <TouchableOpacity
                  key={formatFecha(dia)}
                  onPress={() => elegirFecha(dia)}
                  disabled={bloq}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar ${dia.getDate()} de ${MESES[dia.getMonth()]}`}
                  style={styles.celdaToque}
                >
                  <View style={[
                    styles.celda,
                    sel && { backgroundColor: colors.gold.primary },
                    hoyD && !sel && { borderWidth: 1, borderColor: colors.gold.primary },
                  ]}>
                    <Text style={[
                      styles.celdaText,
                      { color: bloq ? colors.text.muted : sel ? colors.text.inverse : colors.text.primary },
                      bloq && { opacity: 0.3 },
                    ]}>
                      {dia.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
            <Ionicons name="finger-print-outline" size={16} color={colors.gold.primary} />
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>Toca un día para guardarlo</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modal: { borderRadius: BorderRadius.xl, borderWidth: 1, width: '100%', maxWidth: 390, overflow: 'hidden', elevation: 18 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md },
  heroIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  heroEyebrow: { fontSize: 9, fontWeight: '600', letterSpacing: 1.4, marginBottom: 2 },
  titulo: { fontSize: Typography.lg, fontWeight: '500' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  navMes: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, gap: 7 },
  navBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  mesLabel: { flex: 1, textAlign: 'center', fontSize: Typography.md, fontWeight: '500', textTransform: 'capitalize' },
  semanRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm },
  diaSemana: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '500', paddingVertical: 7, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
  celdaToque: { width: `${100 / 7}%`, height: 44, justifyContent: 'center', alignItems: 'center' },
  celda: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  celdaVacia: { width: `${100 / 7}%`, height: 44 },
  celdaText: { fontSize: Typography.sm, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderTopWidth: 1, paddingVertical: 13 },
  footerText: { fontSize: Typography.xs, fontWeight: '400' },
});
