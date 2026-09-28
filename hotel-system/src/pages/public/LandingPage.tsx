import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { getResenasPublicas } from '../../services/api'
import type { ResenaPublica } from '../../services/api'

type TipoHabitacion = {
  id: string
  nombre: string
  descripcion: string | null
  capacidad_adultos: number
  numero_camas: number
  tipo_cama: string
  precio_base?: number
}

type Idioma = 'ES' | 'EN' | 'FR' | 'PT'

const T: Record<Idioma, {
  nav: { hab: string; serv: string; ev: string; ubic: string; op: string; faq: string }
  hero_pre: string; hero_em: string; hero_post: string; hero_sub: string
  llegada: string; salida: string; buscar: string
  crear_cuenta: string; ver_hab: string
  rooms_eyebrow: string; rooms_title: string; rooms_sub: string
  amen_eyebrow: string; amen_title: string
  exp_real_eyebrow: string; exp_real_title_pre: string; exp_real_title_em: string
  exp_unicas_eyebrow: string; exp_unicas_title_pre: string; exp_unicas_title_em: string; exp_unicas_sub: string
  cta_title_pre: string; cta_title_em: string; cta_sub: string
  reservar: string; contactar: string; ver_todas: string
  desde: string; por_noche: string; consultar: string; ver_mas: string
}> = {
  ES: {
    nav: { hab: 'Habitaciones', serv: 'Servicios', ev: 'Eventos', ubic: 'Ubicación', op: 'Opiniones', faq: 'FAQ' },
    hero_pre: 'Donde el confort ', hero_em: 'supera', hero_post: '\nlas expectativas',
    hero_sub: 'En el corazón de la ciudad blanca, Grand Hôtel ofrece elegancia, servicio personalizado y comodidad en cada detalle.',
    llegada: 'Llegada', salida: 'Salida', buscar: 'Buscar',
    crear_cuenta: 'Crear cuenta', ver_hab: 'Ver habitaciones',
    rooms_eyebrow: 'Nuestras habitaciones', rooms_title: 'Espacios diseñados\npara tu bienestar', rooms_sub: 'Cada habitación es un refugio de tranquilidad con los más altos estándares',
    amen_eyebrow: 'Servicios exclusivos', amen_title: 'Todo lo que necesitas\nen un solo lugar',
    exp_real_eyebrow: 'Lo que dicen nuestros huéspedes', exp_real_title_pre: 'Experiencias ', exp_real_title_em: 'reales',
    exp_unicas_eyebrow: 'Agenda cultural', exp_unicas_title_pre: 'Experiencias ', exp_unicas_title_em: 'únicas', exp_unicas_sub: 'Más que hospedaje — vivencias que enriquecen tu estadía',
    cta_title_pre: '¿Listo para una experiencia ', cta_title_em: 'única', cta_sub: 'Reserva hoy y obtén las mejores tarifas disponibles directamente con nosotros.',
    reservar: 'Reservar ahora', contactar: 'Contactarnos', ver_todas: 'Ver todas las habitaciones',
    desde: 'Desde', por_noche: '/ noche', consultar: 'Consultar precio', ver_mas: 'Ver más',
  },
  EN: {
    nav: { hab: 'Rooms', serv: 'Services', ev: 'Events', ubic: 'Location', op: 'Reviews', faq: 'FAQ' },
    hero_pre: 'Where comfort ', hero_em: 'exceeds', hero_post: '\nexpectations',
    hero_sub: 'In the heart of the white city, Grand Hôtel offers elegance, personalized service and comfort in every detail.',
    llegada: 'Check-in', salida: 'Check-out', buscar: 'Search',
    crear_cuenta: 'Create account', ver_hab: 'View rooms',
    rooms_eyebrow: 'Our rooms', rooms_title: 'Spaces designed\nfor your well-being', rooms_sub: 'Each room is a sanctuary of tranquility with the highest standards',
    amen_eyebrow: 'Exclusive services', amen_title: 'Everything you need\nin one place',
    exp_real_eyebrow: 'What our guests say', exp_real_title_pre: 'Real ', exp_real_title_em: 'experiences',
    exp_unicas_eyebrow: 'Cultural agenda', exp_unicas_title_pre: 'Unique ', exp_unicas_title_em: 'experiences', exp_unicas_sub: 'More than accommodation — experiences that enrich your stay',
    cta_title_pre: 'Ready for a unique ', cta_title_em: 'experience', cta_sub: 'Book today and get the best rates directly with us.',
    reservar: 'Book now', contactar: 'Contact us', ver_todas: 'View all rooms',
    desde: 'From', por_noche: '/ night', consultar: 'Inquire', ver_mas: 'More info',
  },
  FR: {
    nav: { hab: 'Chambres', serv: 'Services', ev: 'Événements', ubic: 'Localisation', op: 'Avis', faq: 'FAQ' },
    hero_pre: 'Là où le confort ', hero_em: 'dépasse', hero_post: '\nles attentes',
    hero_sub: 'Au cœur de la ville blanche, Grand Hôtel offre élégance, service personnalisé et confort dans chaque détail.',
    llegada: 'Arrivée', salida: 'Départ', buscar: 'Rechercher',
    crear_cuenta: 'Créer un compte', ver_hab: 'Voir les chambres',
    rooms_eyebrow: 'Nos chambres', rooms_title: 'Des espaces conçus\npour votre bien-être', rooms_sub: 'Chaque chambre est un refuge de tranquillité avec les plus hauts standards',
    amen_eyebrow: 'Services exclusifs', amen_title: 'Tout ce dont vous avez besoin\nen un seul endroit',
    exp_real_eyebrow: 'Ce que disent nos clients', exp_real_title_pre: 'Expériences ', exp_real_title_em: 'réelles',
    exp_unicas_eyebrow: 'Agenda culturel', exp_unicas_title_pre: 'Expériences ', exp_unicas_title_em: 'uniques', exp_unicas_sub: 'Plus qu\'un hébergement — des expériences qui enrichissent votre séjour',
    cta_title_pre: 'Prêt pour une ', cta_title_em: 'expérience unique', cta_sub: 'Réservez aujourd\'hui et obtenez les meilleurs tarifs directement avec nous.',
    reservar: 'Réserver', contactar: 'Nous contacter', ver_todas: 'Voir toutes les chambres',
    desde: 'À partir de', por_noche: '/ nuit', consultar: 'Nous contacter', ver_mas: 'En savoir plus',
  },
  PT: {
    nav: { hab: 'Quartos', serv: 'Serviços', ev: 'Eventos', ubic: 'Localização', op: 'Avaliações', faq: 'FAQ' },
    hero_pre: 'Onde o conforto ', hero_em: 'supera', hero_post: '\nas expectativas',
    hero_sub: 'No coração da cidade branca, Grand Hôtel oferece elegância, serviço personalizado e conforto em cada detalhe.',
    llegada: 'Check-in', salida: 'Check-out', buscar: 'Buscar',
    crear_cuenta: 'Criar conta', ver_hab: 'Ver quartos',
    rooms_eyebrow: 'Nossos quartos', rooms_title: 'Espaços projetados\npara o seu bem-estar', rooms_sub: 'Cada quarto é um refúgio de tranquilidade com os mais altos padrões',
    amen_eyebrow: 'Serviços exclusivos', amen_title: 'Tudo que você precisa\nem um só lugar',
    exp_real_eyebrow: 'O que dizem nossos hóspedes', exp_real_title_pre: 'Experiências ', exp_real_title_em: 'reais',
    exp_unicas_eyebrow: 'Agenda cultural', exp_unicas_title_pre: 'Experiências ', exp_unicas_title_em: 'únicas', exp_unicas_sub: 'Mais do que hospedagem — vivências que enriquecem sua estadia',
    cta_title_pre: 'Pronto para uma experiência ', cta_title_em: 'única', cta_sub: 'Reserve hoje e obtenha as melhores tarifas diretamente conosco.',
    reservar: 'Reservar agora', contactar: 'Fale conosco', ver_todas: 'Ver todos os quartos',
    desde: 'A partir de', por_noche: '/ noite', consultar: 'Consultar', ver_mas: 'Ver mais',
  },
}

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
]

const AMENIDADES_DATA = [
  { titulo: 'Piscina panorámica', desc: 'Vista a 360° de la ciudad', img: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80' },
  { titulo: 'Restaurante gourmet', desc: 'Cocina internacional y local', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80' },
  { titulo: 'Spa & Wellness', desc: 'Relajación total para tus sentidos', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80' },
  { titulo: 'Gym 24h', desc: 'Equipamiento de última generación', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' },
  { titulo: 'Parking seguro', desc: 'Vigilado las 24 horas', img: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&q=80' },
  { titulo: 'WiFi premium', desc: 'Conectividad en toda la propiedad', img: 'https://images.unsplash.com/photo-1461088945293-0c17689e48ac?w=600&q=80' },
]

const EVENTOS_DATA = [
  { titulo: 'Noche de Jazz', fecha: 'Cada viernes', desc: 'Música en vivo en nuestro lounge bar, de 20:00 a 23:00 h.', img: 'https://images.unsplash.com/photo-1470019693664-1d202d2c0907?w=600&q=80' },
  { titulo: 'Cata de Vinos', fecha: 'Primer sábado del mes', desc: 'Sommelier guiado con vinos seleccionados de la región.', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80' },
  { titulo: 'Yoga al amanecer', fecha: 'Lunes, miércoles y viernes', desc: 'Sesión de 60 minutos en la terraza con vista a la ciudad.', img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80' },
  { titulo: 'Arte local', fecha: 'Exposición permanente', desc: 'Galería itinerante de artistas bolivianos en el lobby.', img: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&q=80' },
]

const TESTIMONIOS_FALLBACK = [
  { nombre: 'María G.', ciudad: 'La Paz', texto: 'Una experiencia increíble. Las habitaciones son hermosas y el servicio es impecable.', estrellas: 5 },
  { nombre: 'Carlos R.', ciudad: 'Cochabamba', texto: 'El mejor hotel en el que me he hospedado. Volveré sin dudas.', estrellas: 5 },
  { nombre: 'Ana L.', ciudad: 'Santa Cruz', texto: 'Atención de primer nivel y ubicación perfecta. Muy recomendado.', estrellas: 5 },
]

const LandingPage = () => {
  const navigate = useNavigate()
  const [idioma, setIdioma] = useState<Idioma>('ES')
  const t = T[idioma]
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [visible, setVisible] = useState(false)
  const [tipos, setTipos] = useState<TipoHabitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [fechaEntrada, setFechaEntrada] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [faqAbierto, setFaqAbierto] = useState<number | null>(null)
  const [resenas, setResenas] = useState<ResenaPublica[]>([])
  const revealRefs = useRef<HTMLElement[]>([])

  const addRevealRef = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el)
  }

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    cargarTipos()
    getResenasPublicas().then(setResenas).catch(() => {})
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed') }),
      { threshold: 0.12 }
    )
    const tObserve = setTimeout(() => { revealRefs.current.forEach(el => observer.observe(el)) }, 200)
    return () => {
      clearTimeout(timer); clearTimeout(tObserve)
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  const cargarTipos = async () => {
    try {
      const { data } = await supabase
        .from('tipos_habitacion')
        .select('id, nombre, descripcion, capacidad_adultos, numero_camas, tipo_cama, precio_base')
        .eq('activo', true)
        .limit(6)
      if (data) setTipos(data)
    } catch { /* silently fail */ } finally { setCargando(false) }
  }

  const handleBuscar = () => {
    if (!fechaEntrada || !fechaSalida) return
    navigate(`/habitaciones?entrada=${fechaEntrada}&salida=${fechaSalida}`)
  }

  const hoy = new Date().toISOString().split('T')[0]
  const estrellas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
  const fmtFecha = (d: string) => new Date(d).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #f0ece4; font-family: 'Montserrat', sans-serif; }

        /* Navbar */
        .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; padding: 0 40px; height: 72px; display: flex; align-items: center; justify-content: space-between; transition: all 0.4s; background: ${scrolled ? 'rgba(10,10,10,0.95)' : 'transparent'}; backdrop-filter: ${scrolled ? 'blur(20px)' : 'none'}; border-bottom: ${scrolled ? '1px solid rgba(212,175,106,0.12)' : 'none'}; }
        .lp-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; }
        .lp-nav-links { display: flex; align-items: center; gap: 28px; }
        .lp-nav-link { font-size: 0.68rem; font-weight: 400; letter-spacing: 0.12em; color: rgba(240,236,228,0.65); cursor: pointer; transition: color 0.2s; text-transform: uppercase; text-decoration: none; }
        .lp-nav-link:hover { color: #d4af6a; }
        .lp-nav-right { display: flex; align-items: center; gap: 10px; }
        .lp-lang { display: flex; gap: 3px; align-items: center; border: 1px solid rgba(212,175,106,0.15); border-radius: 5px; padding: 3px; }
        .lp-lang-btn { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.06em; padding: 4px 7px; border-radius: 3px; border: none; color: rgba(240,236,228,0.4); background: transparent; cursor: pointer; transition: all 0.2s; font-family: 'Montserrat', sans-serif; }
        .lp-lang-btn.active { color: #0a0a0a; background: linear-gradient(135deg, #c9a84c, #d4af6a); }
        .lp-lang-btn:hover:not(.active) { color: rgba(240,236,228,0.8); }
        .lp-btn-outline { padding: 8px 18px; border: 1px solid rgba(212,175,106,0.4); border-radius: 4px; font-size: 0.64rem; font-weight: 500; letter-spacing: 0.12em; color: #d4af6a; cursor: pointer; background: transparent; transition: all 0.2s; text-transform: uppercase; font-family: 'Montserrat', sans-serif; }
        .lp-btn-outline:hover { background: rgba(212,175,106,0.1); border-color: #d4af6a; }
        .lp-btn-gold { padding: 8px 18px; border: none; border-radius: 4px; font-size: 0.64rem; font-weight: 600; letter-spacing: 0.12em; color: #0a0a0a; cursor: pointer; background: linear-gradient(135deg, #c9a84c, #d4af6a); transition: all 0.2s; text-transform: uppercase; font-family: 'Montserrat', sans-serif; }
        .lp-btn-gold:hover { opacity: 0.9; transform: translateY(-1px); }
        .lp-hamburger { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 6px; }
        .lp-hamburger span { display: block; width: 22px; height: 1.5px; background: #d4af6a; border-radius: 2px; }
        @media (max-width: 900px) {
          .lp-nav-links { display: none; }
          .lp-nav-right { display: none; }
          .lp-hamburger { display: flex; }
          .lp-mobile-menu { display: ${menuAbierto ? 'flex' : 'none'}; position: fixed; top: 72px; left: 0; right: 0; background: rgba(10,10,10,0.98); backdrop-filter: blur(20px); flex-direction: column; padding: 24px 32px; gap: 18px; border-bottom: 1px solid rgba(212,175,106,0.1); z-index: 199; }
          .lp-nav { padding: 0 24px; }
        }
        .lp-mobile-menu { display: none; }

        /* Hero */
        .lp-hero { min-height: 100vh; position: relative; display: flex; align-items: center; justify-content: center; }
        .lp-hero-bg-wrap { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
        .lp-hero-bg { position: absolute; inset: -5%; background: linear-gradient(135deg, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.28) 50%, rgba(10,10,10,0.82) 100%), url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&q=80') center/cover no-repeat; transform: scale(${visible ? '1' : '1.06'}); transition: transform 2.2s cubic-bezier(0.16,1,0.3,1); }
        .lp-hero-content { position: relative; z-index: 2; text-align: center; padding: 0 24px; max-width: 900px; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '40px'}); transition: all 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s; }
        .lp-eyebrow { font-size: 0.65rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: #d4af6a; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 16px; }
        .lp-eyebrow::before, .lp-eyebrow::after { content: ''; width: 40px; height: 1px; background: linear-gradient(90deg, transparent, #d4af6a); }
        .lp-eyebrow::after { background: linear-gradient(90deg, #d4af6a, transparent); }
        .lp-hero h1 { font-family: 'Cormorant Garamond', serif; font-size: clamp(3rem, 7vw, 6rem); font-weight: 300; color: #fff; line-height: 1.05; margin-bottom: 24px; white-space: pre-line; }
        .lp-hero h1 em { font-style: italic; color: #d4af6a; }
        .lp-hero-sub { font-size: 0.84rem; font-weight: 300; color: rgba(240,236,228,0.58); letter-spacing: 0.08em; line-height: 1.75; margin-bottom: 48px; max-width: 520px; margin-left: auto; margin-right: auto; }

        /* Buscador */
        .lp-buscador { position: relative; z-index: 10; background: rgba(12,12,16,0.88); backdrop-filter: blur(24px); border: 1px solid rgba(212,175,106,0.22); border-radius: 14px; padding: 22px 26px; display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; max-width: 620px; margin: 0 auto; }
        .lp-campo { flex: 1; min-width: 150px; }
        .lp-campo label { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.32); display: block; margin-bottom: 7px; }
        .lp-campo input[type="date"] { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,106,0.2); border-radius: 7px; padding: 10px 12px; font-family: 'Montserrat', sans-serif; font-size: 0.8rem; color: #f0ece4; outline: none; transition: border-color 0.2s; cursor: pointer; appearance: auto; color-scheme: dark; }
        .lp-campo input[type="date"]:focus { border-color: rgba(212,175,106,0.55); }
        .lp-buscar-btn { padding: 11px 26px; background: linear-gradient(135deg, #c9a84c, #d4af6a); border: none; border-radius: 7px; font-family: 'Montserrat', sans-serif; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .lp-buscar-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .lp-buscar-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        /* Secciones */
        .lp-section { padding: 96px 40px; max-width: 1200px; margin: 0 auto; }
        @media (max-width: 768px) { .lp-section { padding: 60px 24px; } }
        .lp-section-header { text-align: center; margin-bottom: 58px; }
        .lp-section-eyebrow { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: #d4af6a; margin-bottom: 12px; }
        .lp-section-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.9rem, 4vw, 3.1rem); font-weight: 300; color: #f0ece4; line-height: 1.18; white-space: pre-line; }
        .lp-section-sub { font-size: 0.77rem; color: rgba(240,236,228,0.38); letter-spacing: 0.06em; margin-top: 12px; line-height: 1.6; }

        /* Sección cinematográfica */
        .lp-cinematic { position: relative; height: 400px; overflow: hidden; }
        .lp-cinematic img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.42); transition: transform 0.6s ease; }
        .lp-cinematic:hover img { transform: scale(1.02); }
        .lp-cinematic-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.12) 50%, rgba(10,10,10,0.65) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
        .lp-cinematic-line { width: 56px; height: 1px; background: linear-gradient(90deg, transparent, #d4af6a, transparent); }
        .lp-cinematic-text { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.7rem, 3.5vw, 2.8rem); font-weight: 300; color: #f0ece4; text-align: center; letter-spacing: 0.04em; line-height: 1.25; }
        .lp-cinematic-text em { font-style: italic; color: #d4af6a; }
        .lp-cinematic-sub { font-size: 0.62rem; color: rgba(240,236,228,0.4); letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Montserrat', sans-serif; margin-top: 4px; }

        /* Habitaciones */
        .lp-rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        .lp-room-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 14px; overflow: hidden; cursor: pointer; transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s; animation: cardIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .lp-room-card:nth-child(1) { animation-delay: 0.04s; }
        .lp-room-card:nth-child(2) { animation-delay: 0.13s; }
        .lp-room-card:nth-child(3) { animation-delay: 0.22s; }
        .lp-room-card:nth-child(4) { animation-delay: 0.31s; }
        .lp-room-card:nth-child(5) { animation-delay: 0.40s; }
        .lp-room-card:nth-child(6) { animation-delay: 0.49s; }
        .lp-room-card:hover { border-color: rgba(212,175,106,0.32); transform: translateY(-5px); box-shadow: 0 22px 56px rgba(0,0,0,0.45); }
        .lp-room-img { height: 210px; background: linear-gradient(135deg, #1a1a2e, #0f0f18); overflow: hidden; }
        .lp-room-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .lp-room-card:hover .lp-room-img img { transform: scale(1.04); }
        .lp-room-body { padding: 20px; }
        .lp-room-nombre { font-family: 'Cormorant Garamond', serif; font-size: 1.28rem; font-weight: 400; color: #f0ece4; margin-bottom: 8px; }
        .lp-room-desc { font-size: 0.73rem; color: rgba(240,236,228,0.42); line-height: 1.6; margin-bottom: 14px; }
        .lp-room-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 14px; }
        .lp-chip { font-size: 0.58rem; font-weight: 500; letter-spacing: 0.1em; padding: 3px 9px; border-radius: 20px; background: rgba(212,175,106,0.08); color: #d4af6a; border: 1px solid rgba(212,175,106,0.18); }
        .lp-room-footer { display: flex; align-items: center; justify-content: space-between; }
        .lp-room-precio { font-family: 'Cormorant Garamond', serif; font-size: 0.82rem; color: rgba(240,236,228,0.38); }
        .lp-room-btn { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 4px; border: 1px solid rgba(212,175,106,0.4); color: #d4af6a; background: transparent; cursor: pointer; transition: all 0.2s; font-family: 'Montserrat', sans-serif; text-transform: uppercase; }
        .lp-room-btn:hover { background: rgba(212,175,106,0.1); border-color: #d4af6a; }

        /* Amenidades */
        .lp-amenidades-bg { background: #0e0e12; }
        .lp-amenidades-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px; }
        .lp-amenidad-card { background: #13131a; border: 1px solid rgba(212,175,106,0.08); border-radius: 14px; overflow: hidden; transition: all 0.3s; }
        .lp-amenidad-card:hover { border-color: rgba(212,175,106,0.25); transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.35); }
        .lp-amenidad-img { height: 130px; overflow: hidden; }
        .lp-amenidad-img img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(0.75); transition: transform 0.4s, filter 0.3s; }
        .lp-amenidad-card:hover .lp-amenidad-img img { transform: scale(1.06); filter: brightness(0.9); }
        .lp-amenidad-body { padding: 16px 15px; text-align: center; }
        .lp-amenidad-titulo { font-size: 0.76rem; font-weight: 600; color: #f0ece4; margin-bottom: 5px; letter-spacing: 0.04em; }
        .lp-amenidad-desc { font-size: 0.65rem; color: rgba(240,236,228,0.32); line-height: 1.5; }

        /* Testimonios / Experiencias reales */
        .lp-testimonios-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
        .lp-testimonio-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.3s, transform 0.3s; animation: cardIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .lp-testimonio-card:nth-child(1) { animation-delay: 0.04s; }
        .lp-testimonio-card:nth-child(2) { animation-delay: 0.14s; }
        .lp-testimonio-card:nth-child(3) { animation-delay: 0.24s; }
        .lp-testimonio-card:hover { border-color: rgba(212,175,106,0.3); transform: translateY(-4px); }
        .lp-testimonio-img { height: 180px; overflow: hidden; flex-shrink: 0; }
        .lp-testimonio-img img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(0.85); transition: transform 0.4s; }
        .lp-testimonio-card:hover .lp-testimonio-img img { transform: scale(1.04); }
        .lp-testimonio-body { padding: 22px 24px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .lp-estrellas { color: #d4af6a; font-size: 0.88rem; letter-spacing: 3px; }
        .lp-testimonio-texto { font-family: 'Cormorant Garamond', serif; font-size: 1.02rem; font-weight: 300; font-style: italic; color: rgba(240,236,228,0.65); line-height: 1.7; flex: 1; }
        .lp-testimonio-autor { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.1em; color: rgba(240,236,228,0.38); text-transform: uppercase; }
        .lp-testimonio-autor span { color: #d4af6a; }

        /* CTA */
        .lp-cta { background: linear-gradient(135deg, rgba(212,175,106,0.07) 0%, rgba(212,175,106,0.02) 100%); border-top: 1px solid rgba(212,175,106,0.1); border-bottom: 1px solid rgba(212,175,106,0.1); padding: 80px 40px; text-align: center; }
        .lp-cta h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 300; color: #f0ece4; margin-bottom: 16px; }
        .lp-cta p { font-size: 0.8rem; color: rgba(240,236,228,0.38); margin-bottom: 36px; letter-spacing: 0.06em; line-height: 1.7; }
        .lp-cta-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .lp-cta-gold { padding: 15px 38px; background: linear-gradient(135deg, #c9a84c, #d4af6a); border: none; border-radius: 4px; font-family: 'Montserrat', sans-serif; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.2s; }
        .lp-cta-gold:hover { opacity: 0.9; transform: translateY(-2px); }
        .lp-cta-outline { padding: 15px 38px; background: transparent; border: 1px solid rgba(212,175,106,0.4); border-radius: 4px; font-family: 'Montserrat', sans-serif; font-size: 0.7rem; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #d4af6a; cursor: pointer; transition: all 0.2s; }
        .lp-cta-outline:hover { background: rgba(212,175,106,0.08); border-color: #d4af6a; }

        /* Eventos */
        .lp-eventos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .lp-evento-card { background: #13131a; border: 1px solid rgba(212,175,106,0.1); border-radius: 14px; overflow: hidden; transition: all 0.3s; }
        .lp-evento-card:hover { border-color: rgba(212,175,106,0.3); transform: translateY(-5px); box-shadow: 0 18px 48px rgba(0,0,0,0.4); }
        .lp-evento-img { height: 170px; overflow: hidden; position: relative; }
        .lp-evento-img img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(0.72); transition: transform 0.4s, filter 0.3s; }
        .lp-evento-card:hover .lp-evento-img img { transform: scale(1.05); filter: brightness(0.85); }
        .lp-evento-body { padding: 20px 22px; }
        .lp-evento-titulo { font-family: 'Cormorant Garamond', serif; font-size: 1.18rem; font-weight: 400; color: #f0ece4; margin-bottom: 5px; }
        .lp-evento-fecha { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #d4af6a; margin-bottom: 10px; }
        .lp-evento-desc { font-size: 0.7rem; color: rgba(240,236,228,0.38); line-height: 1.6; }

        /* Footer */
        .lp-footer { background: #080808; border-top: 1px solid rgba(212,175,106,0.06); padding: 48px 40px 32px; }
        .lp-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 48px; max-width: 1200px; margin: 0 auto 40px; }
        @media (max-width: 768px) { .lp-footer-grid { grid-template-columns: 1fr; gap: 28px; } }
        .lp-footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.2em; margin-bottom: 12px; }
        .lp-footer-desc { font-size: 0.7rem; color: rgba(240,236,228,0.28); line-height: 1.75; max-width: 280px; }
        .lp-footer-col-title { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,236,228,0.3); margin-bottom: 16px; }
        .lp-footer-link { font-size: 0.7rem; color: rgba(240,236,228,0.38); cursor: pointer; display: block; margin-bottom: 10px; transition: color 0.2s; text-decoration: none; }
        .lp-footer-link:hover { color: #d4af6a; }
        .lp-footer-bottom { max-width: 1200px; margin: 0 auto; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .lp-footer-copy { font-size: 0.62rem; color: rgba(240,236,228,0.18); }
        .lp-footer-staff { font-size: 0.62rem; color: rgba(240,236,228,0.18); cursor: pointer; transition: color 0.2s; }
        .lp-footer-staff:hover { color: rgba(212,175,106,0.5); }

        /* Opiniones */
        .lp-resenas-stats { display: flex; align-items: center; justify-content: center; gap: 32px; margin-bottom: 52px; flex-wrap: wrap; }
        .lp-resenas-score { text-align: center; }
        .lp-resenas-score-num { font-family: 'Cormorant Garamond',serif; font-size: 4rem; font-weight: 300; color: #d4af6a; line-height: 1; }
        .lp-resenas-score-stars { color: #d4af6a; font-size: 1.1rem; letter-spacing: 3px; margin: 6px 0 4px; }
        .lp-resenas-score-label { font-size: 0.63rem; color: rgba(240,236,228,0.32); letter-spacing: 0.12em; font-family:'Montserrat',sans-serif; }
        .lp-resenas-divider { width: 1px; height: 56px; background: rgba(255,255,255,0.07); }
        .lp-resenas-substat { text-align: center; }
        .lp-resenas-substat-val { font-size: 1.4rem; font-weight: 700; color: #f0ece4; font-family:'Montserrat',sans-serif; }
        .lp-resenas-substat-label { font-size: 0.6rem; color: rgba(240,236,228,0.28); letter-spacing: 0.1em; font-family:'Montserrat',sans-serif; text-transform: uppercase; margin-top: 4px; }
        .lp-resenas-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
        @media(max-width:900px){ .lp-resenas-grid { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:600px){ .lp-resenas-grid { grid-template-columns: 1fr; } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        .lp-resena-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.055); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.2s; animation: fadeInUp 0.5s ease both; }
        .lp-resena-card:hover { border-color: rgba(212,175,106,0.2); }
        .lp-resena-inner { padding: 20px; display: flex; flex-direction: column; gap: 9px; flex: 1; }
        .lp-resena-stars { color: #d4af6a; font-size: 0.82rem; letter-spacing: 2px; }
        .lp-resena-titulo { font-size: 0.8rem; font-weight: 700; color: #f0ece4; font-family:'Montserrat',sans-serif; }
        .lp-resena-comentario { font-size: 0.72rem; color: rgba(240,236,228,0.52); line-height: 1.65; font-family:'Montserrat',sans-serif; flex: 1; }
        .lp-resena-footer { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
        .lp-resena-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#1a1a2e,#2a2a4e); border: 1px solid rgba(212,175,106,0.2); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #d4af6a; font-weight: 700; flex-shrink:0; }
        .lp-resena-meta { flex: 1; }
        .lp-resena-autor { font-size: 0.65rem; font-weight: 600; color: rgba(240,236,228,0.55); font-family:'Montserrat',sans-serif; }
        .lp-resena-fecha { font-size: 0.58rem; color: rgba(240,236,228,0.22); font-family:'Montserrat',sans-serif; }
        .lp-resena-badge { font-size: 0.52rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #d4af6a; background: rgba(212,175,106,0.07); border: 1px solid rgba(212,175,106,0.14); border-radius: 20px; padding: 2px 7px; white-space: nowrap; }
        .lp-resenas-empty { text-align: center; padding: 48px; color: rgba(240,236,228,0.22); font-family:'Montserrat',sans-serif; font-size: 0.78rem; }

        /* FAQ */
        .lp-faq-list { display: flex; flex-direction: column; gap: 0; max-width: 760px; margin: 0 auto; }
        .lp-faq-item { border-bottom: 1px solid rgba(255,255,255,0.055); }
        .lp-faq-item:first-child { border-top: 1px solid rgba(255,255,255,0.055); }
        .lp-faq-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 0; background: none; border: none; cursor: pointer; text-align: left; }
        .lp-faq-q { font-family: 'Montserrat',sans-serif; font-size: 0.8rem; font-weight: 600; color: #f0ece4; letter-spacing: 0.02em; line-height: 1.45; }
        .lp-faq-icon { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(212,175,106,0.3); display: flex; align-items: center; justify-content: center; color: #d4af6a; font-size: 0.8rem; transition: transform 0.25s; }
        .lp-faq-icon.open { transform: rotate(45deg); }
        .lp-faq-body { font-family: 'Montserrat',sans-serif; font-size: 0.74rem; color: rgba(240,236,228,0.48); line-height: 1.78; padding-bottom: 18px; }

        /* WhatsApp — elegante */
        .lp-wa { position: fixed; bottom: 24px; left: 24px; z-index: 9998; display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .lp-wa-btn { width: 50px; height: 50px; border-radius: 50%; background: rgba(14,14,18,0.88); border: 1px solid rgba(212,175,106,0.3); backdrop-filter: blur(12px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); transition: all 0.25s; }
        .lp-wa-btn:hover { border-color: rgba(212,175,106,0.65); box-shadow: 0 6px 28px rgba(212,175,106,0.15); transform: scale(1.07); }
        .lp-wa-btn svg { width: 22px; height: 22px; fill: #d4af6a; }
        .lp-wa-tooltip { background: rgba(10,10,14,0.92); border: 1px solid rgba(212,175,106,0.18); border-radius: 8px; padding: 6px 12px; font-family: 'Montserrat',sans-serif; font-size: 0.66rem; color: #f0ece4; white-space: nowrap; opacity: 0; transform: translateX(-6px); transition: opacity 0.2s, transform 0.2s; pointer-events: none; }
        .lp-wa:hover .lp-wa-tooltip { opacity: 1; transform: translateX(0); }

        /* Ubicación */
        .lp-ubicacion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        @media (max-width: 768px) { .lp-ubicacion-grid { grid-template-columns: 1fr; } }
        .lp-ubicacion-info h3 { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 3vw, 2.6rem); font-weight: 300; color: #f0ece4; line-height: 1.2; margin-bottom: 20px; }
        .lp-ubicacion-info h3 em { font-style: italic; color: #d4af6a; }
        .lp-ubicacion-datos { display: flex; flex-direction: column; gap: 14px; margin-top: 24px; }
        .lp-ubicacion-dato { display: flex; align-items: flex-start; gap: 14px; }
        .lp-ubicacion-dato-icono { font-size: 1rem; margin-top: 2px; flex-shrink: 0; opacity: 0.7; }
        .lp-ubicacion-dato-texto strong { display: block; font-size: 0.73rem; font-weight: 600; color: #f0ece4; margin-bottom: 2px; }
        .lp-ubicacion-dato-texto span { font-size: 0.7rem; color: rgba(240,236,228,0.42); }
        .lp-map-wrapper { border-radius: 16px; overflow: hidden; border: 1px solid rgba(212,175,106,0.14); height: 340px; background: #13131a; }
        .lp-map-wrapper iframe { width: 100%; height: 100%; border: none; filter: grayscale(30%) contrast(1.05); }

        /* Shared */
        .lp-divider { width: 56px; height: 1px; background: linear-gradient(90deg, #d4af6a, transparent); margin: 0 auto 22px; }
        .lp-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
        @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-left { opacity: 0; transform: translateX(-30px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .reveal-left.revealed { opacity: 1; transform: translateX(0); }
        .reveal-right { opacity: 0; transform: translateX(30px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
        .reveal-right.revealed { opacity: 1; transform: translateX(0); }
        .delay-1 { transition-delay: 0.1s; }
        .delay-2 { transition-delay: 0.2s; }
        .delay-3 { transition-delay: 0.3s; }
        .delay-4 { transition-delay: 0.4s; }
      `}</style>

      {/* Navbar */}
      <nav className="lp-nav">
        <div className="lp-logo" onClick={() => navigate('/')}>Grand Hôtel</div>
        <div className="lp-nav-links">
          <a href="#habitaciones" className="lp-nav-link">{t.nav.hab}</a>
          <a href="#amenidades" className="lp-nav-link">{t.nav.serv}</a>
          <a href="#eventos" className="lp-nav-link">{t.nav.ev}</a>
          <a href="#ubicacion" className="lp-nav-link">{t.nav.ubic}</a>
          <a href="#opiniones" className="lp-nav-link">{t.nav.op}</a>
          <a href="#faq" className="lp-nav-link">{t.nav.faq}</a>
        </div>
        <div className="lp-nav-right">
          <div className="lp-lang">
            {(['ES','EN','FR','PT'] as Idioma[]).map(l => (
              <button key={l} className={`lp-lang-btn${idioma === l ? ' active' : ''}`} onClick={() => setIdioma(l)}>{l}</button>
            ))}
          </div>
          <button className="lp-btn-outline" onClick={() => navigate('/registro')}>{t.crear_cuenta}</button>
          <button className="lp-btn-gold" onClick={() => navigate('/habitaciones')}>{t.ver_hab}</button>
        </div>
        <button className="lp-hamburger" onClick={() => setMenuAbierto(!menuAbierto)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile menu */}
      <div className="lp-mobile-menu">
        <a href="#habitaciones" className="lp-nav-link" onClick={() => setMenuAbierto(false)}>{t.nav.hab}</a>
        <a href="#amenidades" className="lp-nav-link" onClick={() => setMenuAbierto(false)}>{t.nav.serv}</a>
        <a href="#eventos" className="lp-nav-link" onClick={() => setMenuAbierto(false)}>{t.nav.ev}</a>
        <a href="#ubicacion" className="lp-nav-link" onClick={() => setMenuAbierto(false)}>{t.nav.ubic}</a>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ES','EN','FR','PT'] as Idioma[]).map(l => (
            <button key={l} className={`lp-lang-btn${idioma === l ? ' active' : ''}`} onClick={() => { setIdioma(l); setMenuAbierto(false) }}>{l}</button>
          ))}
        </div>
        <button className="lp-btn-gold" onClick={() => navigate('/habitaciones')}>{t.ver_hab}</button>
      </div>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-bg-wrap"><div className="lp-hero-bg" /></div>
        <div className="lp-hero-content">
          <div className="lp-eyebrow">Sucre, Bolivia · Plaza 25 de Mayo</div>
          <h1>{t.hero_pre}<em>{t.hero_em}</em>{t.hero_post}</h1>
          <p className="lp-hero-sub">{t.hero_sub}</p>
          <div className="lp-buscador">
            <div className="lp-campo">
              <label>{t.llegada}</label>
              <input type="date" value={fechaEntrada} min={hoy}
                onChange={(e) => setFechaEntrada(e.target.value)} />
            </div>
            <div className="lp-campo">
              <label>{t.salida}</label>
              <input type="date" value={fechaSalida} min={fechaEntrada || hoy}
                onChange={(e) => setFechaSalida(e.target.value)} />
            </div>
            <button className="lp-buscar-btn" onClick={handleBuscar} disabled={!fechaEntrada || !fechaSalida}>
              {t.buscar}
            </button>
          </div>
        </div>
      </section>

      {/* Sección cinematográfica */}
      <div className="lp-cinematic">
        <img
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&q=80"
          alt="Grand Hôtel"
          loading="lazy"
        />
        <div className="lp-cinematic-overlay">
          <div className="lp-cinematic-line" />
          <div className="lp-cinematic-text">
            Cada detalle, <em>pensado para ti</em>
          </div>
          <div className="lp-cinematic-line" />
          <div className="lp-cinematic-sub">Grand Hôtel · Sucre, Bolivia</div>
        </div>
      </div>

      {/* Habitaciones */}
      <section id="habitaciones" style={{ background: '#0a0a0a' }}>
        <div className="lp-section">
          <div className="lp-section-header reveal" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
            <div className="lp-section-eyebrow">{t.rooms_eyebrow}</div>
            <h2 className="lp-section-title">{t.rooms_title}</h2>
            <div className="lp-divider" style={{ marginTop: 20 }} />
            <p className="lp-section-sub">{t.rooms_sub}</p>
          </div>
          {cargando ? (
            <div className="lp-rooms-grid">
              {[1,2,3].map(i => <div key={i} className="lp-skeleton" style={{ height: 350 }} />)}
            </div>
          ) : tipos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(240,236,228,0.18)', padding: '60px 0', fontFamily: 'Montserrat,sans-serif', fontSize: '0.8rem' }}>
              Habitaciones disponibles próximamente
            </div>
          ) : (
            <div className="lp-rooms-grid">
              {tipos.map((tipo, idx) => (
                <div key={tipo.id}
                  className="lp-room-card"
                  onClick={() => navigate('/habitaciones')}>
                  <div className="lp-room-img">
                    <img src={ROOM_IMAGES[idx % ROOM_IMAGES.length]} alt={tipo.nombre} loading="lazy" />
                  </div>
                  <div className="lp-room-body">
                    <div className="lp-room-nombre">{tipo.nombre}</div>
                    {tipo.descripcion && <div className="lp-room-desc">{tipo.descripcion}</div>}
                    <div className="lp-room-chips">
                      <span className="lp-chip">{tipo.capacidad_adultos} adultos</span>
                      <span className="lp-chip">{tipo.numero_camas} {tipo.numero_camas === 1 ? 'cama' : 'camas'}</span>
                      <span className="lp-chip">{tipo.tipo_cama}</span>
                    </div>
                    <div className="lp-room-footer">
                      {tipo.precio_base
                        ? <span className="lp-room-precio">{t.desde} <strong style={{ color: '#d4af6a', fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem' }}>Bs. {tipo.precio_base.toLocaleString()}</strong> {t.por_noche}</span>
                        : <span className="lp-room-precio">{t.consultar}</span>
                      }
                      <button className="lp-room-btn">{t.ver_mas}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button className="lp-btn-gold" onClick={() => navigate('/habitaciones')}
              style={{ padding: '13px 34px', fontSize: '0.7rem' }}>
              {t.ver_todas}
            </button>
          </div>
        </div>
      </section>

      {/* Amenidades */}
      <section id="amenidades" className="lp-amenidades-bg">
        <div className="lp-section">
          <div className="lp-section-header reveal" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
            <div className="lp-section-eyebrow">{t.amen_eyebrow}</div>
            <h2 className="lp-section-title">{t.amen_title}</h2>
            <div className="lp-divider" style={{ marginTop: 20 }} />
          </div>
          <div className="lp-amenidades-grid">
            {AMENIDADES_DATA.map((a, i) => (
              <div key={a.titulo}
                className={`lp-amenidad-card reveal delay-${Math.min(i + 1, 4)}`}
                ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
                <div className="lp-amenidad-img">
                  <img src={a.img} alt={a.titulo} loading="lazy" />
                </div>
                <div className="lp-amenidad-body">
                  <div className="lp-amenidad-titulo">{a.titulo}</div>
                  <div className="lp-amenidad-desc">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experiencias reales */}
      <section style={{ background: '#0a0a0a' }}>
        <div className="lp-section">
          <div className="lp-section-header reveal" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
            <div className="lp-section-eyebrow">{t.exp_real_eyebrow}</div>
            <h2 className="lp-section-title">
              {t.exp_real_title_pre}<em style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#d4af6a' }}>{t.exp_real_title_em}</em>
            </h2>
            <div className="lp-divider" style={{ marginTop: 20 }} />
          </div>
          <div className="lp-testimonios-grid">
            {resenas.length > 0
              ? resenas.slice(0, 3).map((r) => (
                <div key={r.id}
                  className="lp-testimonio-card">
                  {r.foto_url && (
                    <div className="lp-testimonio-img">
                      <img src={r.foto_url} alt="Foto de estadía" loading="lazy" />
                    </div>
                  )}
                  <div className="lp-testimonio-body">
                    <div className="lp-estrellas">{estrellas(r.calificacion)}</div>
                    {r.titulo && <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1rem', color: '#f0ece4', fontWeight: 400 }}>"{r.titulo}"</div>}
                    <div className="lp-testimonio-texto">
                      {r.comentario ? (r.comentario.length > 160 ? r.comentario.slice(0, 160) + '…' : r.comentario) : 'Excelente experiencia en el hotel.'}
                    </div>
                    <div className="lp-testimonio-autor">
                      Huésped verificado — <span>{fmtFecha(r.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
              : TESTIMONIOS_FALLBACK.map((t) => (
                <div key={t.nombre}
                  className="lp-testimonio-card">
                  <div className="lp-testimonio-body">
                    <div className="lp-estrellas">{estrellas(t.estrellas)}</div>
                    <div className="lp-testimonio-texto">"{t.texto}"</div>
                    <div className="lp-testimonio-autor">{t.nombre} — <span>{t.ciudad}</span></div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      {/* Experiencias únicas */}
      <section id="eventos" className="lp-amenidades-bg">
        <div className="lp-section">
          <div className="lp-section-header reveal" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
            <div className="lp-section-eyebrow">{t.exp_unicas_eyebrow}</div>
            <h2 className="lp-section-title">
              {t.exp_unicas_title_pre}<em style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', color: '#d4af6a' }}>{t.exp_unicas_title_em}</em>
            </h2>
            <div className="lp-divider" style={{ marginTop: 20 }} />
            <p className="lp-section-sub">{t.exp_unicas_sub}</p>
          </div>
          <div className="lp-eventos-grid">
            {EVENTOS_DATA.map((ev, i) => (
              <div key={ev.titulo}
                className={`lp-evento-card reveal delay-${i + 1}`}
                ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
                <div className="lp-evento-img">
                  <img src={ev.img} alt={ev.titulo} loading="lazy" />
                </div>
                <div className="lp-evento-body">
                  <div className="lp-evento-titulo">{ev.titulo}</div>
                  <div className="lp-evento-fecha">{ev.fecha}</div>
                  <div className="lp-evento-desc">{ev.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ubicación */}
      <section id="ubicacion" style={{ background: '#0a0a0a' }}>
        <div className="lp-section">
          <div className="lp-ubicacion-grid">
            <div className="lp-ubicacion-info reveal-left" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
              <div className="lp-section-eyebrow" style={{ textAlign: 'left', marginBottom: 12 }}>Dónde estamos</div>
              <h3>En el corazón de la <em>ciudad blanca</em></h3>
              <p style={{ fontSize: '0.76rem', color: 'rgba(240,236,228,0.42)', lineHeight: 1.75 }}>
                Ubicados frente a la histórica Plaza 25 de Mayo de Sucre, Bolivia — Patrimonio Cultural de la Humanidad.
              </p>
              <div className="lp-ubicacion-datos">
                {[
                  { ic: '📍', label: 'Dirección', val: 'Plaza 25 de Mayo, Sucre, Bolivia' },
                  { ic: '✈️', label: 'Aeropuerto', val: 'Aeropuerto Alcantarí — 35 min en auto' },
                  { ic: '🕐', label: 'Recepción', val: 'Abierta las 24 horas' },
                  { ic: '📞', label: 'Teléfono', val: '+591 4 646-4646' },
                ].map(d => (
                  <div key={d.label} className="lp-ubicacion-dato">
                    <span className="lp-ubicacion-dato-icono">{d.ic}</span>
                    <div className="lp-ubicacion-dato-texto">
                      <strong>{d.label}</strong>
                      <span>{d.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-map-wrapper reveal-right" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
              <iframe
                title="Ubicación Grand Hôtel Sucre"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3796.0447543793804!2d-65.26358962476885!3d-19.04428508210891!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93fdb90cbf5e61c3%3A0xd89b9f9b2b9b2b9b!2sPlaza%2025%20de%20Mayo%2C%20Sucre!5e0!3m2!1ses!2sbo!4v1700000000000!5m2!1ses!2sbo"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Opiniones */}
      <section id="opiniones" style={{ background: '#0a0a0a' }}>
        <div className="lp-section">
          <div className="lp-section-header reveal" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
            <div className="lp-section-eyebrow">Opiniones</div>
            <h2 className="lp-section-title">Lo que dicen<br />nuestros huéspedes</h2>
          </div>
          {resenas.length > 0 ? (() => {
            const promedio = resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length
            return (
              <>
                <div className="lp-resenas-stats">
                  <div className="lp-resenas-score">
                    <div className="lp-resenas-score-num">{promedio.toFixed(1)}</div>
                    <div className="lp-resenas-score-stars">{estrellas(Math.round(promedio))}</div>
                    <div className="lp-resenas-score-label">Calificación promedio</div>
                  </div>
                  <div className="lp-resenas-divider" />
                  <div className="lp-resenas-substat">
                    <div className="lp-resenas-substat-val">{resenas.length}</div>
                    <div className="lp-resenas-substat-label">Reseñas</div>
                  </div>
                  <div className="lp-resenas-divider" />
                  <div className="lp-resenas-substat">
                    <div className="lp-resenas-substat-val">
                      {Math.round((resenas.filter(r => r.calificacion >= 4).length / resenas.length) * 100)}%
                    </div>
                    <div className="lp-resenas-substat-label">Recomiendan</div>
                  </div>
                </div>
                <div className="lp-resenas-grid">
                  {resenas.map((r, i) => (
                    <div key={r.id} className="lp-resena-card" style={{ animationDelay: `${i * 0.08}s` }}>
                      {r.foto_url && (
                        <div style={{ height: 150, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={r.foto_url} alt="Foto de estadía"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      )}
                      <div className="lp-resena-inner">
                        <div className="lp-resena-stars">{estrellas(r.calificacion)}</div>
                        {r.titulo && <div className="lp-resena-titulo">"{r.titulo}"</div>}
                        <div className="lp-resena-comentario">
                          {r.comentario ? (r.comentario.length > 180 ? r.comentario.slice(0, 180) + '…' : r.comentario) : 'Excelente experiencia en el hotel.'}
                        </div>
                        {(r.cal_limpieza || r.cal_atencion || r.cal_ubicacion || r.cal_precio) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', fontSize: '0.58rem', color: 'rgba(240,236,228,0.28)', fontFamily: 'Montserrat,sans-serif' }}>
                            {r.cal_limpieza  && <span>Limpieza {r.cal_limpieza}/5</span>}
                            {r.cal_atencion  && <span>Atención {r.cal_atencion}/5</span>}
                            {r.cal_ubicacion && <span>Ubicación {r.cal_ubicacion}/5</span>}
                            {r.cal_precio    && <span>Precio {r.cal_precio}/5</span>}
                          </div>
                        )}
                        <div className="lp-resena-footer">
                          <div className="lp-resena-avatar">H{i + 1}</div>
                          <div className="lp-resena-meta">
                            <div className="lp-resena-autor">Huésped verificado</div>
                            <div className="lp-resena-fecha">{fmtFecha(r.created_at)}</div>
                          </div>
                          <div className="lp-resena-badge">Estadía real</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          })() : (
            <div className="lp-resenas-empty">
              Sé el primero en compartir tu experiencia en Grand Hôtel.<br />
              <span style={{ color: '#d4af6a', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => navigate('/registro')}>
                Registrate y reserva →
              </span>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <h2>{t.cta_title_pre}<em style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#d4af6a' }}>{t.cta_title_em}</em>?</h2>
        <p>{t.cta_sub}</p>
        <div className="lp-cta-btns">
          <button className="lp-cta-gold" onClick={() => navigate('/habitaciones')}>{t.reservar}</button>
          <button className="lp-cta-outline" onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}>{t.contactar}</button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: '#0c0c10' }}>
        <div className="lp-section">
          <div className="lp-section-header reveal" ref={addRevealRef as React.RefCallback<HTMLDivElement>}>
            <div className="lp-section-eyebrow">Preguntas frecuentes</div>
            <h2 className="lp-section-title">Todo lo que necesitas<br />saber antes de llegar</h2>
          </div>
          <div className="lp-faq-list">
            {[
              { q: '¿Cuál es el horario de check-in y check-out?', a: 'El check-in es a partir de las 14:00 h y el check-out hasta las 12:00 h. Si necesitas llegar antes, podemos guardar tu equipaje sin costo. Clientes Oro, Platino y Diamante tienen check-out tardío hasta las 14:00 h.' },
              { q: '¿Se aceptan mascotas en el hotel?', a: 'Por el bienestar de todos nuestros huéspedes, no se admiten mascotas en las instalaciones del hotel. Si viajas con tu mascota, podemos recomendarte hospedajes especializados cercanos.' },
              { q: '¿El desayuno está incluido en la tarifa?', a: 'El desayuno buffet está incluido en las categorías Suite y Suite Presidencial. Para habitaciones Individual y Doble puede añadirse con un costo adicional de Bs. 85 por persona.' },
              { q: '¿Hay estacionamiento disponible?', a: 'Sí, contamos con estacionamiento privado y vigilado las 24 horas. El servicio está incluido en suites. Para habitaciones Individual y Doble tiene un costo de Bs. 30 por día.' },
              { q: '¿Puedo cancelar mi reserva?', a: 'Puedes cancelar sin cargo hasta 7 días antes de tu fecha de llegada. Entre 3 y 7 días antes aplica un cargo del 30% del total. Con menos de 3 días no hay reembolso. Gestiona la cancelación desde tu perfil en "Mis Reservas".' },
              { q: '¿Ofrecen traslado desde el aeropuerto?', a: 'Sí, contamos con servicio de traslado desde el Aeropuerto Internacional Alcantarí (35 min). Debe solicitarse con al menos 24 horas de anticipación. El costo es de Bs. 120 por vehículo. Escríbenos por WhatsApp para coordinar.' },
              { q: '¿Tienen WiFi gratuito?', a: 'Sí, WiFi de alta velocidad (hasta 300 Mbps) en todas las áreas del hotel: habitaciones, lobby, restaurante, piscina y sala de eventos. Sin límite de dispositivos.' },
              { q: '¿Cómo puedo hacer una reserva?', a: 'Puedes reservar directamente desde nuestra web haciendo clic en "Reservar ahora". Crea una cuenta o inicia sesión, selecciona fechas y tipo de habitación. La confirmación es inmediata.' },
              { q: '¿Tienen piscina y spa?', a: 'Sí. La piscina temperada está disponible de 07:00 a 21:00 h. Nuestro Spa & Wellness incluye gimnasio 24 h, sala de masajes, sauna y jacuzzi. Los masajes deben reservarse con 2 horas de anticipación.' },
              { q: '¿Puedo modificar las fechas de mi reserva?', a: 'Sí, puedes solicitar cambio de fechas desde tu perfil en "Mis Reservas", sujeto a disponibilidad y con al menos 48 horas de anticipación.' },
            ].map((item, i) => (
              <div key={i} className="lp-faq-item">
                <button className="lp-faq-btn" onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}>
                  <span className="lp-faq-q">{item.q}</span>
                  <span className={`lp-faq-icon ${faqAbierto === i ? 'open' : ''}`}>+</span>
                </button>
                {faqAbierto === i && <div className="lp-faq-body">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Botón WhatsApp — elegante */}
      <a
        className="lp-wa"
        href="https://wa.me/59170000000?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20el%20Grand%20H%C3%B4tel"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <div className="lp-wa-btn">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div className="lp-wa-tooltip">Chatea con nosotros</div>
      </a>

      {/* Footer */}
      <footer id="contacto" className="lp-footer">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-logo">Grand Hôtel</div>
            <p className="lp-footer-desc">Un refugio de lujo en el corazón de la ciudad, donde cada detalle está pensado para tu comodidad y bienestar.</p>
          </div>
          <div>
            <div className="lp-footer-col-title">Navegación</div>
            <a href="#habitaciones" className="lp-footer-link">Habitaciones</a>
            <a href="#amenidades" className="lp-footer-link">Servicios</a>
            <a href="#eventos" className="lp-footer-link">Eventos</a>
            <a href="#ubicacion" className="lp-footer-link">Ubicación</a>
            <a href="#faq" className="lp-footer-link">Preguntas frecuentes</a>
            <span className="lp-footer-link" onClick={() => navigate('/registro')}>Crear cuenta</span>
          </div>
          <div>
            <div className="lp-footer-col-title">Contacto</div>
            <span className="lp-footer-link">Plaza 25 de Mayo, Sucre, Bolivia</span>
            <a href="tel:+59146464646" className="lp-footer-link">+591 4 646-4646</a>
            <a href="mailto:info@grandhotel.bo" className="lp-footer-link">info@grandhotel.bo</a>
            <a href="https://wa.me/59170000000" target="_blank" rel="noopener noreferrer" className="lp-footer-link">WhatsApp</a>
            <span className="lp-footer-link">Recepción 24 horas</span>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">© 2026 Grand Hôtel · Todos los derechos reservados</span>
          <span className="lp-footer-staff" onClick={() => navigate('/login')}>Portal del personal →</span>
        </div>
      </footer>
    </>
  )
}

export default LandingPage
