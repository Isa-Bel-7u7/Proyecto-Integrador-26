import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

const Registro = () => {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarPass, setMostrarPass] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleRegistro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setCargando(true)
    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: correo,
        password,
        options: {
          data: { nombre_completo: nombre },
        },
      })
      if (authError) {
        setError('No se pudo crear la cuenta. Verifica los datos.')
        return
      }
      // Si la sesión ya está activa (confirmación de email desactivada), redirigir directo
      if (signUpData.session) {
        navigate('/cliente/inicio')
      } else {
        setRegistroExitoso(true)
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

        .reg-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Montserrat', sans-serif;
          background: #0a0a0a;
        }

        .reg-left {
          flex: 1.2;
          position: relative;
          overflow: hidden;
          display: none;
        }
        @media (min-width: 900px) { .reg-left { display: block; } }

        .reg-left-bg {
          position: absolute; inset: 0;
          background:
            linear-gradient(135deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.2) 50%, rgba(10,10,10,0.75) 100%),
            url('https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80') center/cover no-repeat;
          transform: ${visible ? 'scale(1)' : 'scale(1.08)'};
          transition: transform 1.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .reg-left-content {
          position: relative; z-index: 2;
          height: 100%;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 48px;
        }

        .reg-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.6rem;
          font-weight: 300;
          color: #d4af6a;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          opacity: ${visible ? '1' : '0'};
          transform: translateY(${visible ? '0' : '-16px'});
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
        }

        .reg-tagline {
          opacity: ${visible ? '1' : '0'};
          transform: translateY(${visible ? '0' : '24px'});
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
        }

        .reg-tagline h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 3.5vw, 3.2rem);
          font-weight: 300;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .reg-tagline h2 em {
          font-style: italic;
          color: #d4af6a;
        }

        .reg-tagline p {
          font-size: 0.78rem;
          font-weight: 300;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .gold-line {
          width: 48px; height: 1px;
          background: linear-gradient(90deg, #d4af6a, transparent);
          margin-bottom: 16px;
        }

        /* Beneficios */
        .benefits {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 8px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: ${visible ? '1' : '0'};
          transform: translateX(${visible ? '0' : '-16px'});
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .benefit-item:nth-child(1) { transition-delay: 0.5s; }
        .benefit-item:nth-child(2) { transition-delay: 0.65s; }
        .benefit-item:nth-child(3) { transition-delay: 0.8s; }

        .benefit-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #d4af6a;
          flex-shrink: 0;
        }

        .benefit-text {
          font-size: 0.75rem;
          font-weight: 300;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.06em;
        }

        /* Panel derecho */
        .reg-right {
          flex: 1;
          min-width: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: #0f0f0f;
          position: relative;
          overflow: hidden;
        }

        .reg-right::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(212,175,106,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .reg-right::after {
          content: '';
          position: absolute;
          bottom: -100px; left: -100px;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(212,175,106,0.04) 0%, transparent 70%);
          pointer-events: none;
        }

        .reg-card {
          width: 100%;
          max-width: 400px;
          position: relative; z-index: 1;
          opacity: ${visible ? '1' : '0'};
          transform: translateY(${visible ? '0' : '32px'});
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
        }

        .reg-card-header {
          margin-bottom: 36px;
        }

        .reg-eyebrow {
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #d4af6a;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 10px;
        }

        .reg-eyebrow::before {
          content: '';
          display: inline-block;
          width: 24px; height: 1px;
          background: #d4af6a;
        }

        .reg-card-header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.4rem;
          font-weight: 300;
          color: #f0ece4;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .reg-card-header p {
          font-size: 0.78rem;
          font-weight: 300;
          color: rgba(240,236,228,0.4);
          letter-spacing: 0.04em;
        }

        /* Grid de dos columnas para nombre y correo */
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(240,236,228,0.45);
          margin-bottom: 8px;
        }

        .form-group input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(212,175,106,0.2);
          border-radius: 4px;
          padding: 13px 14px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.83rem;
          font-weight: 300;
          color: #f0ece4;
          outline: none;
          transition: border-color 0.3s, background 0.3s;
          letter-spacing: 0.03em;
        }

        .form-group input::placeholder {
          color: rgba(240,236,228,0.18);
        }

        .form-group input:focus {
          border-color: rgba(212,175,106,0.6);
          background: rgba(212,175,106,0.04);
        }

        .form-group.full { grid-column: 1 / -1; }

        .error-box {
          background: rgba(220,60,60,0.08);
          border: 1px solid rgba(220,60,60,0.25);
          border-radius: 4px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 0.78rem;
          color: #f08080;
          font-weight: 300;
          letter-spacing: 0.03em;
        }

        .btn-submit {
          width: 100%;
          background: linear-gradient(135deg, #c9a84c 0%, #d4af6a 50%, #b8942f 100%);
          border: none;
          border-radius: 4px;
          padding: 15px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #0a0a0a;
          cursor: pointer;
          transition: opacity 0.3s, transform 0.2s;
          margin-top: 6px;
          position: relative;
          overflow: hidden;
        }

        .btn-submit::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .btn-submit:hover::before { opacity: 1; }
        .btn-submit:hover { transform: translateY(-1px); }
        .btn-submit:active { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .reg-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 300;
          color: rgba(240,236,228,0.3);
          letter-spacing: 0.04em;
        }

        .reg-footer a {
          color: #d4af6a;
          text-decoration: none;
          transition: color 0.2s;
        }
        .reg-footer a:hover { color: #e8c97a; }

        .decorative-line {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(212,175,106,0.3) 30%, rgba(212,175,106,0.3) 70%, transparent);
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .loading-text {
          background: linear-gradient(90deg, #c9a84c, #f0e0a0, #c9a84c);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 1.5s linear infinite;
        }

        /* Indicador de fortaleza de contraseña */
        .password-strength {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .strength-bar {
          flex: 1;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.08);
          transition: background 0.3s;
        }

        .strength-bar.active-weak { background: #e05252; }
        .strength-bar.active-medium { background: #d4af6a; }
        .strength-bar.active-strong { background: #52c97a; }
      `}</style>

      <div className="reg-root">
        {/* Panel izquierdo */}
        <div className="reg-left">
          <div className="reg-left-bg" />
          <div className="reg-left-content">
            <div className="reg-logo">Grand Hôtel</div>
            <div>
              <div className="benefits">
                <div className="benefit-item">
                  <div className="benefit-dot" />
                  <span className="benefit-text">Reservas rápidas y seguras en línea</span>
                </div>
                <div className="benefit-item">
                  <div className="benefit-dot" />
                  <span className="benefit-text">Historial completo de tus estadías</span>
                </div>
                <div className="benefit-item">
                  <div className="benefit-dot" />
                  <span className="benefit-text">Pre check-in desde cualquier dispositivo</span>
                </div>
              </div>
            </div>
            <div className="reg-tagline">
              <div className="gold-line" />
              <h2>Tu próxima estadía <em>perfecta</em> comienza aquí</h2>
              <p>Únete a nuestra comunidad de huéspedes</p>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="reg-right">
          <div className="decorative-line" />
          <div className="reg-card">

            {registroExitoso ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(82,201,122,0.12)', border: '2px solid rgba(82,201,122,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem' }}>✓</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 300, color: '#52c97a', marginBottom: 8 }}>Cuenta creada</div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(240,236,228,0.5)', lineHeight: 1.7, marginBottom: 28 }}>
                  Revisa tu correo electrónico y haz clic en el enlace de confirmación para activar tu cuenta.
                </p>
                <button onClick={() => navigate('/login')}
                  style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#c9a84c,#d4af6a)', border: 'none', borderRadius: 4, fontFamily: 'Montserrat,sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0a0a0a', cursor: 'pointer' }}>
                  Ir a inicio de sesión
                </button>
              </div>
            ) : (
              <>
            <div className="reg-card-header">
              <div className="reg-eyebrow">Nueva cuenta</div>
              <h1>Crea tu<br />perfil</h1>
              <p>Completa los datos para comenzar</p>
            </div>

            {error && <div className="error-box">{error}</div>}

            <form onSubmit={handleRegistro}>
              <div className="form-row">
                <div className="form-group full">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="form-group full">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="form-group">
                  <label>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Mínimo 6 caracteres"
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button"
                      onClick={() => setMostrarPass(!mostrarPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,236,228,0.35)', fontSize: '0.85rem', padding: 4, lineHeight: 1, transition: 'color 0.2s' }}
                      tabIndex={-1}>
                      {mostrarPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="password-strength">
                    {[1, 2, 3].map((i) => {
                      const len = password.length
                      let cls = ''
                      if (len >= 6 && i === 1) cls = len < 8 ? 'active-weak' : 'active-medium'
                      if (len >= 8 && i === 2) cls = 'active-medium'
                      if (len >= 12 && i === 3) cls = 'active-strong'
                      return <div key={i} className={`strength-bar ${cls}`} />
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirmar</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={mostrarConfirmar ? 'text' : 'password'}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      required
                      placeholder="Repite la contraseña"
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button"
                      onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: confirmar && confirmar === password ? '#52c97a' : 'rgba(240,236,228,0.35)', fontSize: '0.85rem', padding: 4, lineHeight: 1, transition: 'color 0.2s' }}
                      tabIndex={-1}>
                      {mostrarConfirmar ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirmar && confirmar !== password && (
                    <div style={{ color: '#f08080', fontSize: '0.62rem', marginTop: 5 }}>Las contraseñas no coinciden</div>
                  )}
                  {confirmar && confirmar === password && confirmar.length >= 6 && (
                    <div style={{ color: '#52c97a', fontSize: '0.62rem', marginTop: 5 }}>✓ Las contraseñas coinciden</div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={cargando}>
                {cargando
                  ? <span className="loading-text">Creando cuenta...</span>
                  : 'Crear cuenta'
                }
              </button>
            </form>

            <div className="reg-footer">
              ¿Ya tienes cuenta?{' '}
              <a href="/login">Inicia sesión aquí</a>
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Registro