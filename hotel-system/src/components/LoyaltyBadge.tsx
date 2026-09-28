import type { NivelFidelidad } from '../types'

export type BadgeVariant = 'card' | 'mini' | 'inline'

interface Props {
  nivel: NivelFidelidad | null
  reservas: number
  puntos: number
  gastado?: number
  variant?: BadgeVariant
}

const NIVELES: Record<NivelFidelidad, {
  emoji: string
  color: string
  glow: string
  border: string
  siguiente: NivelFidelidad | null
  reservasNecesarias: number
  beneficios: string[]
}> = {
  Visitante: {
    emoji: '⭐',
    color: 'rgba(180,180,180,0.6)',
    glow: 'rgba(180,180,180,0.1)',
    border: 'rgba(180,180,180,0.2)',
    siguiente: 'Bronce',
    reservasNecesarias: 1,
    beneficios: ['Acceso a reservas online', 'Pre check-in digital'],
  },
  Bronce: {
    emoji: '🥉',
    color: '#cd7f32',
    glow: 'rgba(205,127,50,0.15)',
    border: 'rgba(205,127,50,0.35)',
    siguiente: 'Plata',
    reservasNecesarias: 3,
    beneficios: ['5% descuento en próxima reserva', 'Pre check-in prioritario'],
  },
  Plata: {
    emoji: '🥈',
    color: '#a8a9ad',
    glow: 'rgba(168,169,173,0.15)',
    border: 'rgba(168,169,173,0.35)',
    siguiente: 'Oro',
    reservasNecesarias: 6,
    beneficios: ['5% descuento en reservas', 'Check-out tardío gratis (14:00)', 'Bienvenida especial'],
  },
  Oro: {
    emoji: '🥇',
    color: '#d4af6a',
    glow: 'rgba(212,175,106,0.18)',
    border: 'rgba(212,175,106,0.4)',
    siguiente: 'Platino',
    reservasNecesarias: 10,
    beneficios: ['10% descuento en reservas', 'Check-out tardío gratis', 'Upgrade de habitación*', '15% descuento en Spa'],
  },
  Platino: {
    emoji: '💎',
    color: '#b9f2ff',
    glow: 'rgba(185,242,255,0.15)',
    border: 'rgba(185,242,255,0.35)',
    siguiente: 'Diamante',
    reservasNecesarias: 999,
    beneficios: ['15% descuento en reservas', 'Noche gratis cada 5 reservas', 'Check-in/out prioritario', 'Acceso a suite lounge', 'Upgrade garantizado'],
  },
  Diamante: {
    emoji: '👑',
    color: '#f8e4ff',
    glow: 'rgba(248,228,255,0.2)',
    border: 'rgba(248,228,255,0.4)',
    siguiente: null,
    reservasNecesarias: 999,
    beneficios: ['20% descuento permanente', 'Butler personal', 'Traslado VIP aeropuerto', 'Acceso a todas las suites', 'Atención preferencial 24/7', 'Invitaciones a eventos exclusivos'],
  },
}

const progreso = (nivel: NivelFidelidad, reservas: number) => {
  const umbral: Record<NivelFidelidad, { desde: number; hasta: number }> = {
    Visitante: { desde: 0,  hasta: 1  },
    Bronce:    { desde: 1,  hasta: 3  },
    Plata:     { desde: 3,  hasta: 6  },
    Oro:       { desde: 6,  hasta: 10 },
    Platino:   { desde: 10, hasta: 10 },
    Diamante:  { desde: 10, hasta: 10 },
  }
  const { desde, hasta } = umbral[nivel]
  if (hasta === desde) return 100
  return Math.min(100, Math.round(((reservas - desde) / (hasta - desde)) * 100))
}

export default function LoyaltyBadge({ nivel, reservas, puntos, gastado, variant = 'card' }: Props) {
  const n = nivel ?? 'Visitante'
  const cfg = NIVELES[n]
  const pct = progreso(n, reservas)
  const faltanParaSiguiente = cfg.siguiente
    ? Math.max(0, NIVELES[cfg.siguiente].reservasNecesarias - reservas)
    : 0

  /* ── MINI (avatar border indicator) ── */
  if (variant === 'mini') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
        color: cfg.color, fontFamily: 'Montserrat,sans-serif',
      }}>
        {cfg.emoji} {n}
      </span>
    )
  }

  /* ── INLINE (small row, used in navbar or header) ── */
  if (variant === 'inline') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: cfg.glow, border: `1px solid ${cfg.border}`,
        borderRadius: 20, padding: '3px 10px',
      }}>
        <span style={{ fontSize: '0.8rem' }}>{cfg.emoji}</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: cfg.color, fontFamily: 'Montserrat,sans-serif', textTransform: 'uppercase' }}>
          {n}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.4)', fontFamily: 'Montserrat,sans-serif' }}>
          · {puntos} pts
        </span>
      </div>
    )
  }

  /* ── CARD (full loyalty card) ── */
  return (
    <div style={{
      background: `linear-gradient(135deg, #111118, #16161f)`,
      border: `1px solid ${cfg.border}`,
      borderRadius: 16,
      padding: '24px',
      boxShadow: `0 0 30px ${cfg.glow}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow de fondo decorativo */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 140, height: 140, borderRadius: '50%',
        background: cfg.glow, filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', fontSize: '1.8rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: cfg.glow, border: `2px solid ${cfg.border}`,
          boxShadow: `0 0 16px ${cfg.glow}`, flexShrink: 0,
        }}>
          {cfg.emoji}
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.35)', fontFamily: 'Montserrat,sans-serif', fontWeight: 600, marginBottom: 3 }}>
            Grand Rewards
          </div>
          <div style={{ fontSize: '1.4rem', fontFamily: 'Cormorant Garamond,serif', color: cfg.color, lineHeight: 1 }}>
            {n}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(240,236,228,0.45)', fontFamily: 'Montserrat,sans-serif', marginTop: 3 }}>
            {reservas} estadía{reservas !== 1 ? 's' : ''} completada{reservas !== 1 ? 's' : ''}
            {gastado ? ` · Bs. ${gastado.toLocaleString()} invertidos` : ''}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: cfg.color, fontFamily: 'Montserrat,sans-serif' }}>
            {puntos.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(240,236,228,0.3)', fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.1em' }}>
            PUNTOS
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      {cfg.siguiente && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(240,236,228,0.4)', fontFamily: 'Montserrat,sans-serif' }}>
              Progreso hacia {NIVELES[cfg.siguiente].emoji} {cfg.siguiente}
            </span>
            <span style={{ fontSize: '0.6rem', color: cfg.color, fontFamily: 'Montserrat,sans-serif', fontWeight: 700 }}>
              {faltanParaSiguiente > 0 ? `${faltanParaSiguiente} estadía${faltanParaSiguiente > 1 ? 's' : ''} más` : '¡Nivel alcanzado!'}
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${cfg.border}, ${cfg.color})`,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      )}

      {n === 'Diamante' && (
        <div style={{ marginBottom: 20, fontSize: '0.7rem', color: cfg.color, fontFamily: 'Montserrat,sans-serif', fontWeight: 600, textAlign: 'center', letterSpacing: '0.1em' }}>
          ✨ Miembro Diamante — Nivel máximo alcanzado ✨
        </div>
      )}

      {/* Beneficios */}
      <div style={{ borderTop: `1px solid ${cfg.border}`, paddingTop: 16 }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)', marginBottom: 10, fontFamily: 'Montserrat,sans-serif' }}>
          Beneficios activos
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cfg.beneficios.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: cfg.color, fontSize: '0.7rem', flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: '0.73rem', color: 'rgba(240,236,228,0.75)', fontFamily: 'Montserrat,sans-serif', lineHeight: 1.4 }}>{b}</span>
            </div>
          ))}
        </div>
        {n !== 'Visitante' && (
          <div style={{ marginTop: 12, fontSize: '0.6rem', color: 'rgba(240,236,228,0.2)', fontFamily: 'Montserrat,sans-serif' }}>
            * Sujeto a disponibilidad
          </div>
        )}
      </div>
    </div>
  )
}
