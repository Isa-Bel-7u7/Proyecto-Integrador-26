import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../services/supabase'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPass, setMostrarPass] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  // Mensaje de estado previo (ej. después de registro sin email confirmed)
  const mensaje = (location.state as { mensaje?: string })?.mensaje ?? null

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: correo.trim().toLowerCase(),
        password,
      })
      if (authError) {
        setError('Correo o contraseña incorrectos.')
        return
      }
      const { data, error: perfilError } = await supabase.rpc('rpc_mi_perfil')
      if (perfilError || !data || data.length === 0) {
        setError('No se pudo cargar el perfil. Contacte al administrador.')
        await supabase.auth.signOut()
        return
      }
      const perfil = data[0]
      if (perfil.rol === 'Cliente') {
        navigate('/cliente/inicio')
      } else {
        navigate('/personal/dashboard')
      }
    } catch {
      setError('Ocurrió un error inesperado. Intente nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root { min-height: 100vh; display: flex; font-family: 'Montserrat', sans-serif; background: #0a0a0a; }
        .login-left { flex: 1.2; position: relative; overflow: hidden; display: none; }
        @media (min-width: 900px) { .login-left { display: block; } }
        .login-left-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.2) 60%, rgba(10,10,10,0.7) 100%), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80') center/cover no-repeat; transform: scale(${visible ? '1' : '1.08'}); transition: transform 1.8s cubic-bezier(0.16,1,0.3,1); }
        .login-left-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 48px; }
        .hotel-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.25em; text-transform: uppercase; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '-16px'}); transition: all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s; cursor: pointer; }
        .hotel-tagline { opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '24px'}); transition: all 1s cubic-bezier(0.16,1,0.3,1) 0.4s; }
        .hotel-tagline h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(2.2rem, 3.5vw, 3.2rem); font-weight: 300; color: #fff; line-height: 1.2; margin-bottom: 16px; }
        .hotel-tagline h2 em { font-style: italic; color: #d4af6a; }
        .hotel-tagline p { font-size: 0.78rem; font-weight: 300; color: rgba(255,255,255,0.55); letter-spacing: 0.12em; text-transform: uppercase; }
        .gold-divider { width: 48px; height: 1px; background: linear-gradient(90deg, #d4af6a, transparent); margin-bottom: 16px; }

        .login-right { flex: 1; min-width: 360px; display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: #0f0f0f; position: relative; overflow: hidden; }
        .login-right::before { content: ''; position: absolute; top: -120px; right: -120px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(212,175,106,0.06) 0%, transparent 70%); pointer-events: none; }
        .login-right::after { content: ''; position: absolute; bottom: -100px; left: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(212,175,106,0.04) 0%, transparent 70%); pointer-events: none; }
        .login-card { width: 100%; max-width: 400px; position: relative; z-index: 1; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '32px'}); transition: all 1s cubic-bezier(0.16,1,0.3,1) 0.3s; }
        .login-card-header { margin-bottom: 36px; }
        .login-card-header .eyebrow { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: #d4af6a; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
        .login-card-header .eyebrow::before { content: ''; display: inline-block; width: 24px; height: 1px; background: #d4af6a; }
        .login-card-header h1 { font-family: 'Cormorant Garamond', serif; font-size: 2.6rem; font-weight: 300; color: #f0ece4; line-height: 1.1; margin-bottom: 8px; }
        .login-card-header p { font-size: 0.78rem; font-weight: 300; color: rgba(240,236,228,0.4); letter-spacing: 0.04em; }

        .form-group { margin-bottom: 22px; }
        .form-group label { display: block; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(240,236,228,0.5); margin-bottom: 10px; }
        .input-wrap { position: relative; }
        .input-wrap input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.2); border-radius: 4px; padding: 14px 48px 14px 16px; font-family: 'Montserrat', sans-serif; font-size: 0.85rem; font-weight: 300; color: #f0ece4; outline: none; transition: border-color 0.3s, background 0.3s; letter-spacing: 0.04em; }
        .input-wrap input::placeholder { color: rgba(240,236,228,0.2); }
        .input-wrap input:focus { border-color: rgba(212,175,106,0.6); background: rgba(212,175,106,0.04); }
        .toggle-pass { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(240,236,228,0.3); font-size: 0.85rem; padding: 4px; transition: color 0.2s; line-height: 1; }
        .toggle-pass:hover { color: #d4af6a; }

        .error-box { background: rgba(220,60,60,0.08); border: 1px solid rgba(220,60,60,0.25); border-radius: 4px; padding: 12px 16px; margin-bottom: 24px; font-size: 0.78rem; color: #f08080; font-weight: 300; letter-spacing: 0.03em; }
        .info-box { background: rgba(82,201,122,0.08); border: 1px solid rgba(82,201,122,0.25); border-radius: 4px; padding: 12px 16px; margin-bottom: 24px; font-size: 0.78rem; color: #52c97a; font-weight: 300; }

        .btn-submit { width: 100%; background: linear-gradient(135deg, #c9a84c 0%, #d4af6a 50%, #b8942f 100%); border: none; border-radius: 4px; padding: 16px; font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: opacity 0.3s, transform 0.2s; margin-top: 8px; position: relative; overflow: hidden; }
        .btn-submit::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent); opacity: 0; transition: opacity 0.3s; }
        .btn-submit:hover::before { opacity: 1; }
        .btn-submit:hover { transform: translateY(-1px); }
        .btn-submit:active { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .forgot-link { text-align: right; margin-top: -12px; margin-bottom: 20px; }
        .forgot-link a { font-size: 0.68rem; color: rgba(212,175,106,0.6); text-decoration: none; transition: color 0.2s; letter-spacing: 0.04em; cursor: pointer; }
        .forgot-link a:hover { color: #d4af6a; }

        .login-footer { margin-top: 28px; font-size: 0.75rem; font-weight: 300; color: rgba(240,236,228,0.3); letter-spacing: 0.04em; }
        .login-footer a { color: #d4af6a; text-decoration: none; transition: color 0.2s; }
        .login-footer a:hover { color: #e8c97a; }
        .footer-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .footer-divider::before, .footer-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .footer-divider span { font-size: 0.6rem; color: rgba(240,236,228,0.2); letter-spacing: 0.08em; text-transform: uppercase; }
        .btn-public { width: 100%; background: transparent; border: 1px solid rgba(212,175,106,0.2); border-radius: 4px; padding: 13px; font-family: 'Montserrat', sans-serif; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,236,228,0.5); cursor: pointer; transition: all 0.2s; text-align: center; display: block; text-decoration: none; }
        .btn-public:hover { border-color: rgba(212,175,106,0.4); color: #d4af6a; background: rgba(212,175,106,0.04); }

        .decorative-line { position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: linear-gradient(180deg, transparent, rgba(212,175,106,0.3) 30%, rgba(212,175,106,0.3) 70%, transparent); }
        .staff-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.58rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(212,175,106,0.5); background: rgba(212,175,106,0.08); border: 1px solid rgba(212,175,106,0.15); border-radius: 20px; padding: 4px 12px; margin-bottom: 20px; }

        @keyframes shimmer { 0%{background-position:-200% center}100%{background-position:200% center} }
        .loading-text { background: linear-gradient(90deg,#c9a84c,#f0e0a0,#c9a84c); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 1.5s linear infinite; }
      `}</style>

      <div className="login-root">
        {/* Panel izquierdo */}
        <div className="login-left">
          <div className="login-left-bg" />
          <div className="login-left-content">
            <div className="hotel-logo" onClick={() => navigate('/')}>Grand Hôtel</div>
            <div className="hotel-tagline">
              <div className="gold-divider" />
              <h2>Una experiencia <em>inolvidable</em> te espera</h2>
              <p>Sistema de gestión hotelera</p>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="login-right">
          <div className="decorative-line" />
          <div className="login-card">
            <div className="login-card-header">
              <div className="staff-badge">🏨 Grand Hôtel</div>
              <div className="eyebrow">Bienvenido</div>
              <h1>Inicio de<br />sesión</h1>
              <p>Ingresa tus credenciales para continuar</p>
            </div>

            {mensaje && <div className="info-box">{mensaje}</div>}
            {error && <div className="error-box">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Correo electrónico</label>
                <div className="input-wrap">
                  <input type="email" value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required placeholder="empleado@hotel.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <div className="input-wrap">
                  <input type={mostrarPass ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••" />
                  <button type="button" className="toggle-pass"
                    onClick={() => setMostrarPass(!mostrarPass)}
                    tabIndex={-1}>
                    {mostrarPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="forgot-link">
                <a onClick={() => navigate('/recuperar-contrasenia')}>¿Olvidaste tu contraseña?</a>
              </div>
              <button type="submit" className="btn-submit" disabled={cargando}>
                {cargando ? <span className="loading-text">Verificando...</span> : 'Iniciar sesión'}
              </button>
            </form>

            <div className="login-footer" style={{ marginTop: 28 }}>
              <div className="footer-divider"><span>¿Eres cliente?</span></div>
              <a className="btn-public" onClick={() => navigate('/')}>
                Ver habitaciones sin iniciar sesión →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
