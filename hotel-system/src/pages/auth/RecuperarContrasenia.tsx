import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

type Paso = 'email' | 'enviado' | 'nueva' | 'listo'

const RecuperarContrasenia = () => {
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>('email')
  const [correo, setCorreo] = useState('')
  const [nuevaPass, setNuevaPass] = useState('')
  const [confirmarPass, setConfirmarPass] = useState('')
  const [mostrarPass, setMostrarPass] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)

    // Si viene desde el link del correo, Supabase gestiona la sesión automáticamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPaso('nueva')
      }
    })

    return () => { clearTimeout(t); subscription.unsubscribe() }
  }, [])

  const handleEnviarCorreo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correo.trim()) { setError('Ingresa tu correo.'); return }
    setError(null)
    setCargando(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/recuperar-contrasenia`,
      })
      if (err) { setError('No se pudo enviar el correo. Verifica la dirección.'); return }
      setPaso('enviado')
    } catch {
      setError('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  const handleCambiarPass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nuevaPass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (nuevaPass !== confirmarPass) { setError('Las contraseñas no coinciden.'); return }
    setError(null)
    setCargando(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: nuevaPass })
      if (err) { setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.'); return }
      setPaso('listo')
    } catch {
      setError('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rc-root { min-height: 100vh; display: flex; font-family: 'Montserrat', sans-serif; background: #0a0a0a; }
        .rc-left { flex: 1.2; position: relative; overflow: hidden; display: none; }
        @media (min-width: 900px) { .rc-left { display: block; } }
        .rc-left-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.2) 60%, rgba(10,10,10,0.75) 100%), url('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80') center/cover no-repeat; transform: scale(${visible ? '1' : '1.06'}); transition: transform 1.8s cubic-bezier(0.16,1,0.3,1); }
        .rc-left-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 48px; }
        .rc-hotel-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 300; color: #d4af6a; letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; opacity: ${visible ? '1' : '0'}; transition: opacity 0.9s 0.2s; }
        .rc-tagline { opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '24px'}); transition: all 1s cubic-bezier(0.16,1,0.3,1) 0.4s; }
        .rc-tagline h2 { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 300; color: #fff; line-height: 1.2; margin-bottom: 16px; }
        .rc-tagline h2 em { font-style: italic; color: #d4af6a; }
        .rc-tagline p { font-size: 0.78rem; font-weight: 300; color: rgba(255,255,255,0.55); letter-spacing: 0.12em; text-transform: uppercase; }
        .rc-gold-divider { width: 48px; height: 1px; background: linear-gradient(90deg, #d4af6a, transparent); margin-bottom: 16px; }

        .rc-right { flex: 1; min-width: 360px; display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: #0f0f0f; position: relative; overflow: hidden; }
        .rc-right::before { content: ''; position: absolute; top: -120px; right: -120px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(212,175,106,0.06) 0%, transparent 70%); pointer-events: none; }
        .rc-card { width: 100%; max-width: 400px; opacity: ${visible ? '1' : '0'}; transform: translateY(${visible ? '0' : '32px'}); transition: all 1s cubic-bezier(0.16,1,0.3,1) 0.3s; }
        .rc-decorative { position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: linear-gradient(180deg, transparent, rgba(212,175,106,0.3) 30%, rgba(212,175,106,0.3) 70%, transparent); }

        .rc-header { margin-bottom: 36px; }
        .rc-eyebrow { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: #d4af6a; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
        .rc-eyebrow::before { content: ''; display: inline-block; width: 24px; height: 1px; background: #d4af6a; }
        .rc-header h1 { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; font-weight: 300; color: #f0ece4; line-height: 1.1; margin-bottom: 8px; }
        .rc-header p { font-size: 0.78rem; font-weight: 300; color: rgba(240,236,228,0.4); letter-spacing: 0.04em; line-height: 1.6; }

        .rc-form-group { margin-bottom: 20px; }
        .rc-form-group label { display: block; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(240,236,228,0.5); margin-bottom: 10px; }
        .rc-input-wrap { position: relative; }
        .rc-input-wrap input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,106,0.2); border-radius: 4px; padding: 14px 48px 14px 16px; font-family: 'Montserrat', sans-serif; font-size: 0.85rem; font-weight: 300; color: #f0ece4; outline: none; transition: border-color 0.3s, background 0.3s; }
        .rc-input-wrap input::placeholder { color: rgba(240,236,228,0.2); }
        .rc-input-wrap input:focus { border-color: rgba(212,175,106,0.6); background: rgba(212,175,106,0.04); }
        .rc-toggle-pass { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(240,236,228,0.35); font-size: 0.85rem; padding: 4px; transition: color 0.2s; }
        .rc-toggle-pass:hover { color: #d4af6a; }

        .rc-error { background: rgba(220,60,60,0.08); border: 1px solid rgba(220,60,60,0.25); border-radius: 4px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.78rem; color: #f08080; font-weight: 300; }
        .rc-success-icon { font-size: 3rem; text-align: center; margin-bottom: 20px; }
        .rc-pass-hint { font-size: 0.65rem; color: rgba(240,236,228,0.25); margin-top: 6px; letter-spacing: 0.04em; }

        .rc-btn { width: 100%; background: linear-gradient(135deg, #c9a84c 0%, #d4af6a 50%, #b8942f 100%); border: none; border-radius: 4px; padding: 16px; font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: opacity 0.3s, transform 0.2s; margin-top: 8px; }
        .rc-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .rc-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .rc-footer { margin-top: 28px; text-align: center; font-size: 0.75rem; color: rgba(240,236,228,0.3); }
        .rc-footer a, .rc-footer span { color: #d4af6a; cursor: pointer; text-decoration: none; transition: color 0.2s; }
        .rc-footer a:hover, .rc-footer span:hover { color: #e8c97a; }

        @keyframes shimmer { 0%{background-position:-200% center}100%{background-position:200% center} }
        .loading-text { background: linear-gradient(90deg,#c9a84c,#f0e0a0,#c9a84c); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 1.5s linear infinite; }
      `}</style>

      <div className="rc-root">
        {/* Panel izquierdo */}
        <div className="rc-left">
          <div className="rc-left-bg" />
          <div className="rc-left-content">
            <div className="rc-hotel-logo" onClick={() => navigate('/')}>Grand Hôtel</div>
            <div className="rc-tagline">
              <div className="rc-gold-divider" />
              <h2>Tu acceso, <em>seguro</em><br />y siempre disponible</h2>
              <p>Recupera tu cuenta en segundos</p>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="rc-right">
          <div className="rc-decorative" />
          <div className="rc-card">

            {/* PASO 1: Ingresar email */}
            {paso === 'email' && (
              <>
                <div className="rc-header">
                  <div className="rc-eyebrow">Recuperar acceso</div>
                  <h1>¿Olvidaste tu<br />contraseña?</h1>
                  <p>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
                </div>
                {error && <div className="rc-error">{error}</div>}
                <form onSubmit={handleEnviarCorreo}>
                  <div className="rc-form-group">
                    <label>Correo electrónico</label>
                    <div className="rc-input-wrap">
                      <input type="email" value={correo}
                        onChange={e => setCorreo(e.target.value)}
                        required placeholder="correo@ejemplo.com" />
                    </div>
                  </div>
                  <button type="submit" className="rc-btn" disabled={cargando}>
                    {cargando ? <span className="loading-text">Enviando...</span> : 'Enviar enlace de recuperación'}
                  </button>
                </form>
                <div className="rc-footer">
                  ¿Recordaste tu contraseña?{' '}
                  <span onClick={() => navigate('/login')}>Iniciar sesión</span>
                </div>
              </>
            )}

            {/* PASO 2: Email enviado */}
            {paso === 'enviado' && (
              <>
                <div className="rc-success-icon">📧</div>
                <div className="rc-header" style={{ textAlign: 'center' }}>
                  <div className="rc-eyebrow" style={{ justifyContent: 'center' }}>Correo enviado</div>
                  <h1>Revisa tu<br />bandeja de entrada</h1>
                  <p>
                    Enviamos un enlace de recuperación a <strong style={{ color: '#d4af6a' }}>{correo}</strong>.
                    Haz clic en el enlace dentro del correo para crear una nueva contraseña.
                  </p>
                </div>
                <div style={{ background: 'rgba(212,175,106,0.08)', border: '1px solid rgba(212,175,106,0.2)', borderRadius: 8, padding: '14px 16px', fontSize: '0.72rem', color: 'rgba(240,236,228,0.55)', lineHeight: 1.7, marginBottom: 24 }}>
                  💡 Si no ves el correo, revisa tu carpeta de spam o correo no deseado.
                </div>
                <button className="rc-btn" onClick={() => setPaso('email')}>
                  Intentar con otro correo
                </button>
                <div className="rc-footer" style={{ marginTop: 20 }}>
                  <span onClick={() => navigate('/login')}>Volver al inicio de sesión</span>
                </div>
              </>
            )}

            {/* PASO 3: Nueva contraseña (viene del link del email) */}
            {paso === 'nueva' && (
              <>
                <div className="rc-header">
                  <div className="rc-eyebrow">Nueva contraseña</div>
                  <h1>Crea tu nueva<br />contraseña</h1>
                  <p>Elige una contraseña segura de al menos 8 caracteres.</p>
                </div>
                {error && <div className="rc-error">{error}</div>}
                <form onSubmit={handleCambiarPass}>
                  <div className="rc-form-group">
                    <label>Nueva contraseña</label>
                    <div className="rc-input-wrap">
                      <input type={mostrarPass ? 'text' : 'password'} value={nuevaPass}
                        onChange={e => setNuevaPass(e.target.value)}
                        required placeholder="••••••••" minLength={8} />
                      <button type="button" className="rc-toggle-pass"
                        onClick={() => setMostrarPass(!mostrarPass)}>
                        {mostrarPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div className="rc-pass-hint">Mínimo 8 caracteres</div>
                  </div>
                  <div className="rc-form-group">
                    <label>Confirmar contraseña</label>
                    <div className="rc-input-wrap">
                      <input type={mostrarConfirmar ? 'text' : 'password'} value={confirmarPass}
                        onChange={e => setConfirmarPass(e.target.value)}
                        required placeholder="••••••••" />
                      <button type="button" className="rc-toggle-pass"
                        onClick={() => setMostrarConfirmar(!mostrarConfirmar)}>
                        {mostrarConfirmar ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {confirmarPass && nuevaPass !== confirmarPass && (
                      <div style={{ color: '#f08080', fontSize: '0.65rem', marginTop: 6 }}>
                        Las contraseñas no coinciden
                      </div>
                    )}
                    {confirmarPass && nuevaPass === confirmarPass && confirmarPass.length >= 8 && (
                      <div style={{ color: '#52c97a', fontSize: '0.65rem', marginTop: 6 }}>
                        ✓ Las contraseñas coinciden
                      </div>
                    )}
                  </div>
                  <button type="submit" className="rc-btn" disabled={cargando}>
                    {cargando ? <span className="loading-text">Actualizando...</span> : 'Actualizar contraseña'}
                  </button>
                </form>
              </>
            )}

            {/* PASO 4: Listo */}
            {paso === 'listo' && (
              <>
                <div className="rc-success-icon">✅</div>
                <div className="rc-header" style={{ textAlign: 'center' }}>
                  <div className="rc-eyebrow" style={{ justifyContent: 'center' }}>Listo</div>
                  <h1>Contraseña<br />actualizada</h1>
                  <p>Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
                </div>
                <button className="rc-btn" onClick={() => navigate('/login')}>
                  Iniciar sesión
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

export default RecuperarContrasenia
