// ============================================================
// SISTEMA DE TEMA — HOTEL APP
//
// PRINCIPIO OCP: agregar un nuevo tema requiere solo agregar
// una nueva clave al objeto 'palettes'; ningún componente
// cambia.
//
// PRINCIPIO DRY: un solo archivo define todos los colores,
// espaciados y radios. Los componentes y pantallas importan
// desde aquí en lugar de hardcodear valores.
//
// PRINCIPIO ISP: ThemeColors, ThemeShadows, etc. son tipos
// separados — los consumidores usan solo lo que necesitan.
// ============================================================

// ── Tipos ─────────────────────────────────────────────────
export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: { primary: string; secondary: string; tertiary: string; overlay: string };
  gold: { primary: string; light: string; pale: string; dark: string };
  text: { primary: string; secondary: string; muted: string; accent: string; inverse: string };
  border: { primary: string; light: string; gold: string };
  status: {
    success: string; successBg: string;
    warning: string; warningBg: string;
    error: string; errorBg: string;
    info: string; infoBg: string;
  };
  input: { bg: string; border: string; placeholder: string };
  tabBar: { bg: string; border: string; active: string; inactive: string };
}

// ── Paletas ─────────────────────────────────────────────────
const darkPalette: ThemeColors = {
  bg: {
    primary: '#0E0E12',
    secondary: '#16161E',
    tertiary: '#1E1E28',
    overlay: 'rgba(0,0,0,0.65)',
  },
  gold: {
    primary: '#C9A84C',
    light: '#E2C06A',
    pale: '#F5E6C3',
    dark: '#9B7A2E',
  },
  text: {
    primary: '#F0ECE4',
    secondary: '#9A9590',
    muted: '#5A5550',
    accent: '#C9A84C',
    inverse: '#0E0E12',
  },
  border: {
    primary: '#26262E',
    light: '#32323C',
    gold: 'rgba(201,168,76,0.35)',
  },
  status: {
    success: '#4ADE80', successBg: '#052E16',
    warning: '#FBBF24', warningBg: '#1C1205',
    error: '#F87171',   errorBg: '#2D0A0A',
    info: '#60A5FA',    infoBg: '#0A1628',
  },
  input: {
    bg: '#0E0E12',
    border: '#2A2A34',
    placeholder: '#4A4A54',
  },
  tabBar: {
    bg: '#0E0E12',
    border: '#1A1A22',
    active: '#C9A84C',
    inactive: '#4A4A54',
  },
};

const lightPalette: ThemeColors = {
  bg: {
    primary: '#F5F2EE',
    secondary: '#FFFFFF',
    tertiary: '#EDE9E4',
    overlay: 'rgba(0,0,0,0.4)',
  },
  gold: {
    primary: '#B8912E',
    light: '#C9A84C',
    pale: '#7A5C14',
    dark: '#8A6B20',
  },
  text: {
    primary: '#1A1714',
    secondary: '#6B6460',
    muted: '#A09890',
    accent: '#B8912E',
    inverse: '#FFFFFF',
  },
  border: {
    primary: '#E4DED8',
    light: '#EDE9E4',
    gold: 'rgba(184,145,46,0.3)',
  },
  status: {
    success: '#16A34A', successBg: '#DCFCE7',
    warning: '#D97706', warningBg: '#FEF3C7',
    error: '#DC2626',   errorBg: '#FEE2E2',
    info: '#2563EB',    infoBg: '#DBEAFE',
  },
  input: {
    bg: '#FFFFFF',
    border: '#D8D2CC',
    placeholder: '#A09890',
  },
  tabBar: {
    bg: '#FFFFFF',
    border: '#E4DED8',
    active: '#B8912E',
    inactive: '#A09890',
  },
};

// OCP: para agregar un nuevo tema solo se agrega aquí
export const palettes: Record<ThemeMode, ThemeColors> = {
  dark: darkPalette,
  light: lightPalette,
};

// ── Compartidos (no cambian con el tema) ─────────────────────
export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const BorderRadius = {
  sm: 6, md: 10, lg: 16, xl: 24, full: 999,
} as const;

export const Typography = {
  xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, hero: 34,
} as const;

export const getShadow = (mode: ThemeMode) => ({
  card: {
    shadowColor: mode === 'dark' ? '#000' : '#00000022',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: mode === 'dark' ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  gold: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

// ── Estado de reservas (mapeado a colores del sistema) ───────
export const getEstadoStyle = (estado: string, colors: ThemeColors) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    pendiente:   { bg: colors.status.warningBg, text: colors.status.warning, border: colors.status.warning },
    confirmada:  { bg: colors.status.successBg, text: colors.status.success, border: colors.status.success },
    en_estadia:  { bg: colors.status.infoBg,    text: colors.status.info,    border: colors.status.info },
    finalizada:  { bg: colors.bg.tertiary,      text: colors.text.muted,     border: colors.border.primary },
    cancelada:   { bg: colors.status.errorBg,   text: colors.status.error,   border: colors.status.error },
    no_show:     { bg: colors.status.errorBg,   text: colors.status.error,   border: colors.status.error },
  };
  return map[estado] ?? map.pendiente;
};

export const EstadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_estadia: 'En estadía',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  no_show: 'No show',
};

// ── Niveles de fidelidad (sin emoji) ────────────────────────
export const NIVEL_CONFIG: Record<string, { color: string; symbol: string }> = {
  Visitante: { color: '#7A7A8A', symbol: 'V' },
  Bronce:    { color: '#A0522D', symbol: 'B' },
  Plata:     { color: '#8C9BAD', symbol: 'P' },
  Oro:       { color: '#C9A84C', symbol: 'O' },
  Platino:   { color: '#7EC8E3', symbol: 'Pt' },
  Diamante:  { color: '#B39DDB', symbol: 'D' },
};

// Retrocompatibilidad — exportar Colors apuntando al tema oscuro
// para pantallas de personal que aún no usan ThemeContext
export const Colors = darkPalette;
export const Shadows = getShadow('dark');
