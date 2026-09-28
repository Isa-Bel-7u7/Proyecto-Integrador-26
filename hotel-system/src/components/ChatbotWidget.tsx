import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Mensaje = {
  id: string
  from: 'bot' | 'user'
  text: string
  opciones?: string[]
}

const BOT_NAME = 'Grand Hôtel Asistente'

const FAQ: { patron: RegExp; respuesta: string; opciones?: string[] }[] = [
  {
    patron: /check.?in|llegada|entrada/i,
    respuesta: '🕐 El **check-in** es a partir de las **14:00 h**.\nSi llegas antes podemos guardar tu equipaje. También puedes hacer tu pre check-in desde "Mis reservas".',
    opciones: ['Check-out', 'Servicios', 'Cancelar reserva', 'Menú principal'],
  },
  {
    patron: /check.?out|salida/i,
    respuesta: '🕛 El **check-out** es hasta las **12:00 h**.\nClientes Oro, Platino y Diamante tienen check-out tardío hasta las 14:00 h sin costo adicional.',
    opciones: ['Check-in', 'Servicios', 'Menú principal'],
  },
  {
    patron: /precio|costo|tarifa|cuanto|valor|noche/i,
    respuesta: '💰 Nuestras tarifas inician desde **Bs. 350/noche** en habitación individual.\n\n• Individual — desde Bs. 350\n• Doble — desde Bs. 480\n• Suite — desde Bs. 750\n• Suite Presidencial — desde Bs. 1,200\n\nLos precios exactos y disponibilidad los ves en tiempo real al reservar.',
    opciones: ['Ver habitaciones', 'Hacer una reserva', 'Menú principal'],
  },
  {
    patron: /habitaci[oó]n|cuarto|suite|tipo/i,
    respuesta: '🛏️ Contamos con 4 categorías de habitaciones:\n\n• **Individual** — 1 cama, ideal para viajeros solos\n• **Doble** — cama matrimonial o 2 camas\n• **Suite** — sala de estar + jacuzzi\n• **Suite Presidencial** — vista panorámica, lujo total\n\nTodas tienen WiFi, TV, A/C y minibar.',
    opciones: ['Precios', 'Ver habitaciones', 'Hacer una reserva', 'Menú principal'],
  },
  {
    patron: /wifi|internet|conexi[oó]n/i,
    respuesta: '📶 El **WiFi es gratuito** en todas las áreas del hotel: habitaciones, lobby, restaurante, piscina y sala de eventos. Velocidad de hasta 300 Mbps.',
    opciones: ['Servicios', 'Menú principal'],
  },
  {
    patron: /piscina|pool/i,
    respuesta: '🏊 Nuestra piscina está disponible para todos los huéspedes:\n• Horario: 07:00 – 21:00 h\n• Agua temperada\n• Bar de piscina incluido\n• Área infantil',
    opciones: ['Servicios', 'Menú principal'],
  },
  {
    patron: /restaurante|comida|desayuno|cena|almuerzo|buffet/i,
    respuesta: '🍽️ Nuestro restaurante **Gastronomía Grand** ofrece:\n• Desayuno buffet: 07:00 – 10:30 h (incluido en suites)\n• Almuerzo: 12:00 – 15:00 h\n• Cena: 19:00 – 22:30 h\n• Room service: 06:00 – 23:00 h',
    opciones: ['Servicios', 'Menú principal'],
  },
  {
    patron: /mascota|perro|gato|animal/i,
    respuesta: '🐾 Por el bienestar de todos nuestros huéspedes, **no se admiten mascotas** en las instalaciones del hotel. Podemos recomendarte hospedajes para mascotas cercanos.',
    opciones: ['Menú principal'],
  },
  {
    patron: /estacionamiento|parking|parqueo|auto|carro/i,
    respuesta: '🚗 Contamos con **estacionamiento privado y vigilado** para huéspedes:\n• Incluido en Suites\n• Individual/Doble: Bs. 30/día\n• Disponible las 24 h',
    opciones: ['Servicios', 'Menú principal'],
  },
  {
    patron: /spa|gimnasio|gym|masaje/i,
    respuesta: '💆 Nuestro **Spa & Wellness** incluye:\n• Gimnasio 24 h con acceso libre\n• Sala de masajes (reserva con 2 h de anticipación)\n• Sauna y jacuzzi\n• Tratamientos faciales y corporales\n\nDescuento del 15% para clientes Oro y superior.',
    opciones: ['Servicios', 'Menú principal'],
  },
  {
    patron: /cancel|cancelaci[oó]n|devoluci[oó]n|reembolso/i,
    respuesta: '📋 Política de cancelación:\n\n• **+7 días antes**: cancelación gratuita, reembolso completo\n• **3–7 días antes**: cargo del 30% del total\n• **Menos de 3 días**: sin reembolso\n\nPuedes cancelar desde "Mis reservas" o contactarnos directamente.',
    opciones: ['Contacto', 'Hacer una reserva', 'Menú principal'],
  },
  {
    patron: /ubicaci[oó]n|direcci[oó]n|d[oó]nde|llegar|mapa/i,
    respuesta: '📍 Nos encontramos en:\n**Plaza 25 de Mayo, Sucre – Bolivia**\n\nA 5 minutos a pie de la Catedral Metropolitana, frente a la plaza principal.\n\nTransporte:\n• Taxi desde el aeropuerto: ~25 min\n• Bus urbano: línea 7',
    opciones: ['Contacto', 'Menú principal'],
  },
  {
    patron: /contacto|tel[eé]fono|correo|email|whatsapp/i,
    respuesta: '📞 Puedes contactarnos por:\n\n• **WhatsApp**: +591 70 000 000\n• **Correo**: reservas@grandhotel.bo\n• **Recepción**: disponible las 24 h\n• **Formulario**: desde tu perfil en "Buzón de mensajes"',
    opciones: ['Ubicación', 'Menú principal'],
  },
  {
    patron: /servicio|incluye|amenidad/i,
    respuesta: '✨ Servicios del Grand Hôtel:\n\n• WiFi gratuito en todo el hotel\n• Piscina temperada\n• Restaurante y room service\n• Spa, gimnasio y sauna\n• Estacionamiento vigilado\n• Lavandería express\n• Traslado al aeropuerto (con costo)\n• Eventos y sala de reuniones',
    opciones: ['Piscina', 'Restaurante', 'Spa', 'Menú principal'],
  },
  {
    patron: /puntos|fidelidad|descuento|beneficio|insignia|nivel/i,
    respuesta: '🏅 Programa de fidelización **Grand Rewards**:\n\n• 🥉 **Bronce** (1 estadía) — 5% descuento\n• 🥈 **Plata** (3 estadías) — check-out tardío gratis\n• 🥇 **Oro** (6 estadías) — upgrade de habitación\n• 💎 **Platino** (10 estadías) — noche gratis cada 5 reservas\n• 👑 **Diamante** — beneficios VIP exclusivos',
    opciones: ['Hacer una reserva', 'Menú principal'],
  },
  {
    patron: /gracias|perfecto|excelente|genial|ok|listo/i,
    respuesta: '😊 ¡Con gusto! Si necesitas algo más, estoy aquí. Que tengas una excelente estadía en Grand Hôtel. 🏨',
    opciones: ['Menú principal'],
  },
]

const OPCIONES_VISITANTE = ['Habitaciones y precios', 'Check-in / Check-out', 'Servicios', 'Ubicación', 'Cancelaciones', 'Contacto']
const OPCIONES_CLIENTE   = ['Mis reservas', 'Habitaciones y precios', 'Check-in / Check-out', 'Servicios', 'Cancelaciones', 'Contacto']

const MENU_RESPUESTA = (nombre?: string | null) =>
  nombre
    ? `Hola ${nombre.split(' ')[0]} 👋 ¿En qué puedo ayudarte hoy?`
    : '¿En qué puedo ayudarte? Selecciona una opción o escribe tu consulta.'

const respuestaFAQ = (texto: string): { respuesta: string; opciones?: string[] } | null => {
  for (const faq of FAQ) {
    if (faq.patron.test(texto)) {
      return { respuesta: faq.respuesta, opciones: faq.opciones }
    }
  }
  return null
}

const mkId = () => Math.random().toString(36).slice(2)

export default function ChatbotWidget() {
  const { perfil } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [abierto, setAbierto]     = useState(false)
  const [msgs, setMsgs]           = useState<Mensaje[]>([])
  const [input, setInput]         = useState('')
  const [escribiendo, setEscribiendo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, escribiendo])

  // No mostrar en páginas de personal (DESPUÉS de todos los hooks)
  if (location.pathname.startsWith('/personal')) return null

  const opciones = perfil?.rol === 'Cliente' ? OPCIONES_CLIENTE : OPCIONES_VISITANTE

  const addBotMsg = (text: string, opciones?: string[], delay = 600) => {
    setEscribiendo(true)
    setTimeout(() => {
      setEscribiendo(false)
      setMsgs(p => [...p, { id: mkId(), from: 'bot', text, opciones }])
    }, delay)
  }

  const handleAbrir = () => {
    if (abierto) { setAbierto(false); return }
    setAbierto(true)
    if (msgs.length === 0) {
      const saludo = perfil
        ? `¡Bienvenido de vuelta, **${perfil.nombre_completo.split(' ')[0]}**! 🌟 Soy tu asistente del Grand Hôtel. ¿En qué puedo ayudarte?`
        : `¡Bienvenido al **Grand Hôtel** de Sucre! 🏨 Soy tu asistente virtual. Puedo ayudarte con información, reservas y servicios.`
      setMsgs([{ id: mkId(), from: 'bot', text: saludo, opciones }])
    }
  }

  const handleOpcion = (op: string) => {
    setMsgs(p => [...p, { id: mkId(), from: 'user', text: op }])

    if (op === 'Menú principal') {
      addBotMsg(MENU_RESPUESTA(perfil?.nombre_completo), opciones)
      return
    }
    if (op === 'Mis reservas' && perfil) {
      addBotMsg('Te llevo a tus reservas ahora mismo. 🗓️', undefined, 400)
      setTimeout(() => { setAbierto(false); navigate('/cliente/inicio') }, 1000)
      return
    }
    if (op === 'Ver habitaciones') {
      addBotMsg('Abriendo el catálogo de habitaciones...', undefined, 400)
      setTimeout(() => { setAbierto(false); navigate('/habitaciones') }, 900)
      return
    }
    if (op === 'Hacer una reserva') {
      if (!perfil) {
        addBotMsg('Para hacer una reserva necesitas iniciar sesión. ¿Te ayudo a registrarte? 😊', ['Ir a registro', 'Ir a inicio de sesión', 'Menú principal'])
        return
      }
      addBotMsg('¡Vamos a reservar! Te llevo al formulario. 🛎️', undefined, 400)
      setTimeout(() => { setAbierto(false); navigate('/cliente/reservar') }, 900)
      return
    }
    if (op === 'Ir a registro') {
      setTimeout(() => { setAbierto(false); navigate('/registro') }, 500)
      return
    }
    if (op === 'Ir a inicio de sesión') {
      setTimeout(() => { setAbierto(false); navigate('/login') }, 500)
      return
    }

    const match = respuestaFAQ(op)
    if (match) {
      addBotMsg(match.respuesta, match.opciones)
    } else {
      addBotMsg('No tengo información específica sobre eso. Puedes contactarnos directamente:', ['Contacto', 'Menú principal'])
    }
  }

  const handleEnviar = () => {
    const texto = input.trim()
    if (!texto) return
    setInput('')
    setMsgs(p => [...p, { id: mkId(), from: 'user', text: texto }])

    const match = respuestaFAQ(texto)
    if (match) {
      addBotMsg(match.respuesta, match.opciones)
    } else if (/hola|buenos|buenas|saludos/i.test(texto)) {
      addBotMsg(MENU_RESPUESTA(perfil?.nombre_completo), opciones)
    } else {
      addBotMsg(
        'No encontré información exacta sobre eso. Puedo ayudarte con estas opciones:',
        ['Habitaciones y precios', 'Servicios', 'Cancelaciones', 'Contacto', 'Menú principal']
      )
    }
  }

  const renderText = (text: string) =>
    text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ))

  return (
    <>
      <style>{`
        .cb-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
        .cb-btn  { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 20px rgba(212,175,106,0.4); transition: transform 0.2s, box-shadow 0.2s; }
        .cb-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(212,175,106,0.55); }
        .cb-badge { position: absolute; top: -3px; right: -3px; width: 14px; height: 14px; border-radius: 50%; background: #e05555; border: 2px solid #0a0a0a; }
        .cb-window { width: 340px; height: 500px; background: #111118; border: 1px solid rgba(212,175,106,0.2); border-radius: 18px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6); animation: cb-in 0.22s ease; }
        @keyframes cb-in { from { opacity:0; transform:scale(0.9) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .cb-header { background: linear-gradient(135deg,#1a1a28,#1e1e30); padding: 14px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(212,175,106,0.12); }
        .cb-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg,#c9a84c,#d4af6a); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .cb-header-info { flex: 1; }
        .cb-header-name { font-family: 'Montserrat',sans-serif; font-size: 0.78rem; font-weight: 700; color: #f0ece4; letter-spacing: 0.04em; }
        .cb-header-status { font-size: 0.62rem; color: #4caf50; letter-spacing: 0.06em; display: flex; align-items: center; gap: 4px; }
        .cb-header-status::before { content:''; width:6px; height:6px; border-radius:50%; background:#4caf50; display:inline-block; }
        .cb-close { background: none; border: none; color: rgba(240,236,228,0.4); cursor: pointer; font-size: 1.1rem; padding: 4px; }
        .cb-msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scrollbar-width: thin; scrollbar-color: rgba(212,175,106,0.15) transparent; }
        .cb-bubble { max-width: 82%; padding: 10px 14px; border-radius: 14px; font-family: 'Montserrat',sans-serif; font-size: 0.75rem; line-height: 1.55; }
        .cb-bubble.bot { background: rgba(255,255,255,0.05); color: #f0ece4; align-self: flex-start; border-bottom-left-radius: 4px; }
        .cb-bubble.user { background: linear-gradient(135deg,#c9a84c,#d4af6a); color: #0a0a0a; align-self: flex-end; border-bottom-right-radius: 4px; font-weight: 600; }
        .cb-opciones { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .cb-op-btn { padding: 5px 10px; border-radius: 20px; background: rgba(212,175,106,0.1); border: 1px solid rgba(212,175,106,0.25); color: #d4af6a; font-family: 'Montserrat',sans-serif; font-size: 0.68rem; font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .cb-op-btn:hover { background: rgba(212,175,106,0.2); border-color: #d4af6a; }
        .cb-typing { align-self: flex-start; display: flex; gap: 4px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 14px; border-bottom-left-radius: 4px; }
        .cb-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(212,175,106,0.5); animation: cb-bounce 1.2s infinite; }
        .cb-dot:nth-child(2) { animation-delay: 0.2s; }
        .cb-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cb-bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        .cb-input-area { padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 8px; }
        .cb-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,106,0.15); border-radius: 20px; padding: 9px 14px; font-family: 'Montserrat',sans-serif; font-size: 0.75rem; color: #f0ece4; outline: none; transition: border-color 0.2s; }
        .cb-input:focus { border-color: rgba(212,175,106,0.4); }
        .cb-input::placeholder { color: rgba(240,236,228,0.25); }
        .cb-send { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#c9a84c,#d4af6a); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; transition: transform 0.15s; }
        .cb-send:hover { transform: scale(1.08); }
        @media (max-width: 480px) { .cb-window { width: calc(100vw - 32px); } }
      `}</style>

      <div className="cb-wrap">
        {abierto && (
          <div className="cb-window">
            <div className="cb-header">
              <div className="cb-avatar">🏨</div>
              <div className="cb-header-info">
                <div className="cb-header-name">{BOT_NAME}</div>
                <div className="cb-header-status">En línea</div>
              </div>
              <button className="cb-close" onClick={() => setAbierto(false)}>✕</button>
            </div>

            <div className="cb-msgs">
              {msgs.map(m => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'bot' ? 'flex-start' : 'flex-end' }}>
                  <div className={`cb-bubble ${m.from}`}>{renderText(m.text)}</div>
                  {m.from === 'bot' && m.opciones && (
                    <div className="cb-opciones">
                      {m.opciones.map(op => (
                        <button key={op} className="cb-op-btn" onClick={() => handleOpcion(op)}>{op}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {escribiendo && (
                <div className="cb-typing">
                  <div className="cb-dot" /><div className="cb-dot" /><div className="cb-dot" />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="cb-input-area">
              <input
                className="cb-input"
                placeholder="Escribe tu consulta..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnviar()}
              />
              <button className="cb-send" onClick={handleEnviar}>➤</button>
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button className="cb-btn" onClick={handleAbrir} title="Asistente del hotel">
            {abierto ? '✕' : '💬'}
          </button>
        </div>
      </div>
    </>
  )
}
