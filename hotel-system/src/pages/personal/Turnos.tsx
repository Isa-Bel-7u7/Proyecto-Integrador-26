import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import PersonalLayout from '../../components/PersonalLayout'
import { executeRpc as rpc } from '../../repositories/rpcRepository'

// ── Types ──────────────────────────────────────────────────────────────────
type ResumenT = {
  total_empleados:number; en_turno:number; ausentes_hoy:number
  vacaciones:number; horas_hoy:number; programados_hoy:number; pendientes_vacacion:number
  proximos_cambios:{nombre:string;cargo:string;turno:string;hora:string}[]
}
type TurnoDef = { id:string;nombre:string;tipo:string;hora_inicio:string;hora_fin:string;area:string|null;personal_requerido:number;observaciones:string|null;cobertura_obligatoria:boolean }
type TurnoProg = { prog_id:string;turno_id:string;nombre:string;tipo:string;hora_inicio:string;hora_fin:string;estado:string }
type EmpleadoProg = { personal_id:string;nombre:string;cargo:string;turnos:Record<string,TurnoProg> }
type TiempoReal = { personal_id:string;nombre:string;cargo:string;area:string;hora_entrada:string;horas_acumuladas:number;turno:string|null;estado_asistencia:string;tareas_pendientes:number }
type AsistItem = { id:string;personal_id:string;nombre:string;cargo:string;estado:string;hora_entrada:string|null;hora_salida:string|null;horas_trabajadas:number|null;horas_extras:number|null;observaciones:string|null;turno_nombre:string|null }
type SolicitudVac = { id:string;personal_id:string;nombre:string;cargo:string;tipo:string;fecha_inicio:string;fecha_fin:string;motivo:string|null;estado:string;dias:number;created_at:string }
type EmpleadoDet = { id:string;usuario_id:string;nombre:string;email:string;rol:string;cargo:string;area:string;estado:string;documento:string|null;telefono:string|null;direccion:string|null;fecha_contratacion:string|null;turno_hoy:string|null;asistencia_hoy:string;hora_entrada:string|null }
type AlertaCobertura = { turno:string;area:string;fecha:string;hora_inicio:string;hora_fin:string;asignados:number;requeridos:number }
type ReportesT = { por_area:{area:string;total:number}[];asistencia_semanal:{fecha:string;presentes:number;ausentes:number;retrasos:number}[];empleados_retrasos:{nombre:string;retrasos:number;horas_prom:number|null}[];rendimiento:{nombre:string;horas_total:number|null;tareas:number}[] }
type PersonalItem = { id:string;nombre:string;cargo:string }

// ── Config ─────────────────────────────────────────────────────────────────
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const AREAS = ['Housekeeping','Recepción','Seguridad','Mantenimiento','Administración','Restaurante','Cocina','Lavandería','Gerencia']
const ROLES = ['Administrador','Supervisor','Recepcionista','Housekeeping','Mantenimiento','Seguridad','Cocinero','Mesero','Lavandería','Gerente','Empleado']
const TIPOS_TURNO: Record<string,string> = { manana:'Mañana',tarde:'Tarde',noche:'Noche',completo:'Completo',rotativo:'Rotativo',especial:'Especial' }
const TIPO_C: Record<string,string> = { manana:'#d4af6a',tarde:'#6ab8d4',noche:'#a06ad4',completo:'#52c97a',rotativo:'#e0a252',especial:'#e05252' }
const ESTADO_A: Record<string,{color:string;label:string}> = {
  presente:    {color:'#52c97a',label:'Presente'},
  retraso:     {color:'#d4af6a',label:'Retraso'},
  ausente:     {color:'#e05252',label:'Ausente'},
  permiso:     {color:'#6ab8d4',label:'Permiso'},
  vacaciones:  {color:'#a06ad4',label:'Vacaciones'},
  incapacidad: {color:'#e0a252',label:'Incapacidad'},
  licencia:    {color:'#9696a0',label:'Licencia'},
  sin_registro:{color:'rgba(240,236,228,0.15)',label:'Sin registro'},
}
const EMP_ESTADO: Record<string,{color:string;label:string}> = {
  activo:    {color:'#52c97a',label:'Activo'},
  inactivo:  {color:'#9696a0',label:'Inactivo'},
  vacaciones:{color:'#a06ad4',label:'Vacaciones'},
  licencia:  {color:'#6ab8d4',label:'Licencia'},
}

const getLunes = (d:Date):Date => { const r=new Date(d);r.setHours(0,0,0,0);const day=r.getDay();r.setDate(r.getDate()-(day===0?6:day-1));return r }
const getSemana = (l:Date):Date[] => Array.from({length:7},(_,i)=>{const d=new Date(l);d.setDate(l.getDate()+i);return d})
const isoDate = (d:Date) => d.toISOString().split('T')[0]
const fmtDate = (iso:string) => new Date(iso+'T12:00').toLocaleDateString('es-BO',{day:'2-digit',month:'short'})
const fmtDia  = (iso:string) => new Date(iso+'T12:00').toLocaleDateString('es-BO',{weekday:'short',day:'2-digit',month:'short'})
const fmtTime = (iso:string|null) => iso ? new Date(iso).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}) : '—'
const fmtHora = (t:string) => t.substring(0,5)

const inp: React.CSSProperties = { width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(212,175,106,0.2)',borderRadius:8,padding:'9px 12px',fontFamily:'Montserrat,sans-serif',fontSize:'0.8rem',fontWeight:300,color:'#f0ece4',outline:'none' }
const lbl: React.CSSProperties = { fontSize:'0.58rem',fontWeight:600,letterSpacing:'0.13em',textTransform:'uppercase',color:'rgba(240,236,228,0.28)',display:'block',marginBottom:4 }

// ── Component ──────────────────────────────────────────────────────────────
export default function Turnos() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol==='Administrador'||perfil?.rol==='Supervisor'

  const RES0:ResumenT = {total_empleados:0,en_turno:0,ausentes_hoy:0,vacaciones:0,horas_hoy:0,programados_hoy:0,pendientes_vacacion:0,proximos_cambios:[]}

  const [tab,setTab]             = useState<'dashboard'|'empleados'|'programacion'|'tiempo_real'|'asistencia'|'vacaciones'|'reportes'>('dashboard')
  const [resumen,setResumen]     = useState<ResumenT>(RES0)
  const [alertas,setAlertas]     = useState<AlertaCobertura[]>([])
  const [turnosDef,setTurnosDef] = useState<TurnoDef[]>([])
  const [programacion,setProg]   = useState<EmpleadoProg[]>([])
  const [tiempoReal,setTR]       = useState<TiempoReal[]>([])
  const [asistencia,setAsist]    = useState<AsistItem[]>([])
  const [solicitudes,setSolic]   = useState<SolicitudVac[]>([])
  const [empleados,setEmpleados] = useState<EmpleadoDet[]>([])
  const [personal,setPersonal]   = useState<PersonalItem[]>([])
  const [reportes,setReportes]   = useState<ReportesT|null>(null)
  const [,setCargando]           = useState(true)
  const [cargTab,setCargTab]     = useState(false)
  const [error,setError]         = useState<string|null>(null)
  const [exito,setExito]         = useState<string|null>(null)

  const [semanaInicio,setSemana] = useState<Date>(()=>getLunes(new Date()))

  // Celda calendario
  const [celda,setCelda]         = useState<{personal_id:string;nombre:string;fecha:Date;actual:TurnoProg|null}|null>(null)
  const [celdaTurnoId,setCeldaTI]= useState('')
  const [guardCelda,setGuardC]   = useState(false)

  // Modal nuevo turno def
  const [modalTD,setModalTD]     = useState(false)
  const [fNombre,setFNombre]     = useState('')
  const [fTipo,setFTipo]         = useState('manana')
  const [fHI,setFHI]             = useState('06:00')
  const [fHF,setFHF]             = useState('14:00')
  const [fArea,setFArea]         = useState('')
  const [fReq,setFReq]           = useState(1)
  const [fObl,setFObl]           = useState(false)
  const [fObs,setFObs]           = useState('')
  const [creandoTD,setCreandoTD] = useState(false)

  // Modal empleado (crear/editar)
  const [modalEmp,setModalEmp]   = useState<'crear'|'editar'|null>(null)
  const [empSel,setEmpSel]       = useState<EmpleadoDet|null>(null)
  const [eNombre,setENombre]     = useState('')
  const [eEmail,setEEmail]       = useState('')
  const [eCargo,setECargo]       = useState('')
  const [eArea,setEArea]         = useState('')
  const [eRol,setERol]           = useState('Empleado')
  const [eDoc,setEDoc]           = useState('')
  const [eTel,setETel]           = useState('')
  const [eDir,setEDir]           = useState('')
  const [eFecha,setEFecha]       = useState('')
  const [guardEmp,setGuardEmp]   = useState(false)
  const [exitoEmp,setExitoEmp]   = useState(false)
  const [busqEmp,setBusqEmp]     = useState('')

  // Modal asistencia
  const [modalAsist,setModalAsist]= useState<AsistItem|null>(null)
  const [mEstado,setMEstado]     = useState('')
  const [mObs,setMObs]           = useState('')
  const [guardAsist,setGuardA]   = useState(false)

  // Modal vacación
  const [modalVac,setModalVac]   = useState(false)
  const [vPersId,setVPersId]     = useState('')
  const [vTipo,setVTipo]         = useState('vacaciones')
  const [vFI,setVFI]             = useState('')
  const [vFF,setVFF]             = useState('')
  const [vMotivo,setVMotivo]     = useState('')
  const [creandoVac,setCreandoVac]=useState(false)
  const [exitoVac,setExitoVac]   = useState(false)

  const [procesando,setProcesando]= useState<string|null>(null)

  // ── Carga ──────────────────────────────────────────────────────────────
  const cargarBase = useCallback(async()=>{
    setCargando(true)
    try {
      const [res,td,pers,alrt] = await Promise.all([
        rpc('rpc_get_resumen_turnos'),
        rpc('rpc_get_turnos_definicion'),
        rpc('rpc_get_todo_personal').catch(()=>[]),
        esAdmin ? rpc('rpc_get_alertas_cobertura') : Promise.resolve([]),
      ])
      setResumen(prev=>(res as ResumenT)??prev)
      setTurnosDef((td as TurnoDef[])??[])
      setPersonal((pers as PersonalItem[])??[])
      setAlertas((alrt as AlertaCobertura[])??[])
    } catch(e){setError((e as Error).message)}
    finally{setCargando(false)}
  },[esAdmin])

  useEffect(()=>{cargarBase()},[cargarBase])

  useEffect(()=>{
    if(tab==='programacion'){
      setCargTab(true)
      rpc('rpc_get_programacion_semanal',{p_fecha_inicio:isoDate(semanaInicio)}).then(d=>setProg((d as EmpleadoProg[])??[])).catch(()=>{}).finally(()=>setCargTab(false))
    }
    if(tab==='tiempo_real'){
      setCargTab(true)
      rpc('rpc_get_personal_tiempo_real').then(d=>setTR((d as TiempoReal[])??[])).catch(()=>{}).finally(()=>setCargTab(false))
    }
    if(tab==='asistencia'){
      setCargTab(true)
      rpc('rpc_get_asistencia_hoy').then(d=>setAsist((d as AsistItem[])??[])).catch(()=>{}).finally(()=>setCargTab(false))
    }
    if(tab==='vacaciones'){
      setCargTab(true)
      rpc('rpc_get_solicitudes_vacacion').then(d=>setSolic((d as SolicitudVac[])??[])).catch(()=>{}).finally(()=>setCargTab(false))
    }
    if(tab==='empleados'){
      setCargTab(true)
      rpc('rpc_get_empleados_detalle').then(d=>setEmpleados((d as EmpleadoDet[])??[])).catch(()=>{}).finally(()=>setCargTab(false))
    }
    if(tab==='reportes'){
      setCargTab(true)
      rpc('rpc_get_reportes_turnos').then(d=>setReportes(d as ReportesT)).catch(()=>{}).finally(()=>setCargTab(false))
    }
  },[tab,semanaInicio])

  // ── Acciones ───────────────────────────────────────────────────────────
  const ok = (msg:string)=>{ setExito(msg); cargarBase(); setTimeout(()=>setExito(null),3000) }

  const handleAsignarCelda = async()=>{
    if(!celda||!celdaTurnoId) return
    setGuardC(true)
    try{
      await rpc('rpc_programar_turno',{p_personal_id:celda.personal_id,p_turno_id:celdaTurnoId,p_fecha:isoDate(celda.fecha)})
      setCelda(null)
      const d=await rpc('rpc_get_programacion_semanal',{p_fecha_inicio:isoDate(semanaInicio)})
      setProg((d as EmpleadoProg[])??[])
    }catch(e){setError((e as Error).message)}
    finally{setGuardC(false)}
  }

  const handleQuitarTurno = async()=>{
    if(!celda) return
    setGuardC(true)
    try{
      await rpc('rpc_quitar_turno',{p_personal_id:celda.personal_id,p_fecha:isoDate(celda.fecha)})
      setCelda(null)
      const d=await rpc('rpc_get_programacion_semanal',{p_fecha_inicio:isoDate(semanaInicio)})
      setProg((d as EmpleadoProg[])??[])
    }catch(e){setError((e as Error).message)}
    finally{setGuardC(false)}
  }

  const handleCrearTurnoDef = async()=>{
    if(!fNombre) return
    setCreandoTD(true)
    try{
      await rpc('rpc_crear_turno_definicion',{p_nombre:fNombre,p_tipo:fTipo,p_hora_inicio:fHI,p_hora_fin:fHF,p_area:fArea||null,p_personal_requerido:fReq,p_observaciones:fObs||null})
      const td=await rpc('rpc_get_turnos_definicion')
      setTurnosDef((td as TurnoDef[])??[])
      setModalTD(false);setFNombre('');setFObs('');setFObl(false)
      ok('Turno creado')
    }catch(e){setError((e as Error).message)}
    finally{setCreandoTD(false)}
  }

  const abrirCrearEmp = ()=>{ setModalEmp('crear');setEmpSel(null);setENombre('');setEEmail('');setECargo('');setEArea('');setERol('Empleado');setEDoc('');setETel('');setEDir('');setEFecha('');setExitoEmp(false) }
  const abrirEditarEmp = (e:EmpleadoDet)=>{ setModalEmp('editar');setEmpSel(e);setENombre(e.nombre);setEEmail(e.email);setECargo(e.cargo);setEArea(e.area??'');setERol(e.rol);setEDoc(e.documento??'');setETel(e.telefono??'');setEDir(e.direccion??'');setEFecha(e.fecha_contratacion??'');setExitoEmp(false) }

  const handleGuardarEmp = async()=>{
    if(!eNombre.trim()||!eCargo) return
    setGuardEmp(true)
    try{
      if(modalEmp==='crear'){
        if(!eEmail.trim()){setError('El email es obligatorio para crear un empleado');return}
        await rpc('rpc_crear_empleado',{p_nombre:eNombre.trim(),p_email:eEmail.trim(),p_cargo:eCargo,p_area:eArea||null,p_rol:eRol,p_documento:eDoc||null,p_telefono:eTel||null,p_direccion:eDir||null,p_fecha_contratacion:eFecha||null})
      } else if(empSel){
        await rpc('rpc_actualizar_empleado',{p_personal_id:empSel.id,p_nombre:eNombre.trim(),p_cargo:eCargo,p_area:eArea||null,p_rol:eRol,p_documento:eDoc||null,p_telefono:eTel||null,p_direccion:eDir||null,p_fecha_contratacion:eFecha||null})
      }
      setExitoEmp(true)
      const d=await rpc('rpc_get_empleados_detalle')
      setEmpleados((d as EmpleadoDet[])??[])
      setTimeout(()=>{setModalEmp(null);setExitoEmp(false)},1800)
    }catch(e){setError((e as Error).message)}
    finally{setGuardEmp(false)}
  }

  const handleCambiarEstadoEmp = async(id:string,estado:string)=>{
    setProcesando(id)
    try{
      await rpc('rpc_cambiar_estado_empleado',{p_personal_id:id,p_estado:estado})
      const d=await rpc('rpc_get_empleados_detalle')
      setEmpleados((d as EmpleadoDet[])??[])
      ok(`Empleado marcado como ${estado}`)
    }catch(e){setError((e as Error).message)}
    finally{setProcesando(null)}
  }

  const handleEntrada = async(personal_id:string)=>{
    setProcesando(personal_id)
    try{ await rpc('rpc_registrar_entrada',{p_personal_id:personal_id}); const d=await rpc('rpc_get_asistencia_hoy'); setAsist((d as AsistItem[])??[]); ok('Entrada registrada') }
    catch(e){setError((e as Error).message)} finally{setProcesando(null)}
  }

  const handleSalida = async(personal_id:string)=>{
    setProcesando(personal_id)
    try{ await rpc('rpc_registrar_salida',{p_personal_id:personal_id}); const d=await rpc('rpc_get_asistencia_hoy'); setAsist((d as AsistItem[])??[]); ok('Salida registrada') }
    catch(e){setError((e as Error).message)} finally{setProcesando(null)}
  }

  const handleGuardarAsist = async()=>{
    if(!modalAsist||!mEstado) return
    setGuardA(true)
    try{ await rpc('rpc_registrar_estado_asistencia',{p_personal_id:modalAsist.personal_id,p_estado:mEstado,p_observaciones:mObs||null}); const d=await rpc('rpc_get_asistencia_hoy'); setAsist((d as AsistItem[])??[]); setModalAsist(null); ok('Asistencia actualizada') }
    catch(e){setError((e as Error).message)} finally{setGuardA(false)}
  }

  const handleAprobarVac = async(id:string,aprobado:boolean)=>{
    setProcesando(id)
    try{ await rpc('rpc_aprobar_vacacion',{p_id:id,p_aprobado:aprobado}); const d=await rpc('rpc_get_solicitudes_vacacion'); setSolic((d as SolicitudVac[])??[]); ok(aprobado?'Solicitud aprobada':'Solicitud rechazada') }
    catch(e){setError((e as Error).message)} finally{setProcesando(null)}
  }

  const handleCrearVac = async()=>{
    if(!vPersId||!vFI||!vFF) return
    setCreandoVac(true)
    try{
      await rpc('rpc_solicitar_vacacion',{p_personal_id:vPersId,p_tipo:vTipo,p_fecha_inicio:vFI,p_fecha_fin:vFF,p_motivo:vMotivo||null})
      setExitoVac(true); const d=await rpc('rpc_get_solicitudes_vacacion'); setSolic((d as SolicitudVac[])??[])
      setTimeout(()=>{setExitoVac(false);setModalVac(false);setVPersId('');setVFI('');setVFF('');setVMotivo('')},2000)
    }catch(e){setError((e as Error).message)} finally{setCreandoVac(false)}
  }

  const semana = getSemana(semanaInicio)
  const hoy = isoDate(new Date())
  const empsFiltrados = empleados.filter(e=>!busqEmp||e.nombre.toLowerCase().includes(busqEmp.toLowerCase())||e.cargo.toLowerCase().includes(busqEmp.toLowerCase())||e.area?.toLowerCase().includes(busqEmp.toLowerCase()))

  // Alertas agrupadas por área
  const alertasPorArea = alertas.reduce<Record<string,AlertaCobertura[]>>((acc,a)=>{ if(!acc[a.area])acc[a.area]=[]; acc[a.area].push(a); return acc },{})

  const TABS = [
    {key:'dashboard',   label:'Dashboard'},
    ...(esAdmin?[{key:'empleados',label:'Empleados',badge:undefined}]:[]),
    {key:'programacion',label:'Programación'},
    {key:'tiempo_real', label:'Tiempo Real'},
    {key:'asistencia',  label:'Asistencia'},
    {key:'vacaciones',  label:'Vacaciones',badge:resumen.pendientes_vacacion||undefined},
    ...(esAdmin?[{key:'reportes',label:'Reportes'}]:[]),
  ]

  return (
    <>
      <style>{`
        .t-tabs{display:flex;gap:2px;border-bottom:1px solid rgba(212,175,106,0.1);margin-bottom:18px;flex-wrap:wrap}
        .t-tab{padding:8px 15px;font-family:Montserrat,sans-serif;font-size:0.67rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;background:transparent;border:none;cursor:pointer;color:rgba(240,236,228,0.35);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;white-space:nowrap;position:relative}
        .t-tab.active{color:#d4af6a;border-bottom-color:#d4af6a}
        .t-tab:hover:not(.active){color:rgba(240,236,228,0.6)}
        .t-badge{position:absolute;top:3px;right:3px;min-width:15px;height:15px;background:#e05252;border-radius:8px;font-size:0.52rem;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 3px}
        .t-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:16px}
        .t-stat{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:10px;padding:13px 15px}
        .t-stat-lbl{font-size:0.57rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:5px}
        .t-stat-val{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:300;line-height:1}
        .t-alerta-area{margin-bottom:12px}
        .t-alerta-area-hdr{font-size:0.62rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#e05252;margin-bottom:6px;display:flex;align-items:center;gap:7px}
        .t-alerta-row{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:rgba(224,82,82,0.06);border:1px solid rgba(224,82,82,0.15);border-radius:7px;margin-bottom:4px}
        .t-alerta-info{font-size:0.72rem;color:rgba(240,236,228,0.65)}
        .t-alerta-badge{font-size:0.58rem;font-weight:700;padding:2px 8px;border-radius:12px;background:rgba(224,82,82,0.15);color:#e05252}
        /* Empleados */
        .t-emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
        .t-emp-card{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s}
        .t-emp-card:hover{border-color:rgba(212,175,106,0.28);transform:translateY(-1px)}
        .t-emp-av{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:600;flex-shrink:0}
        .t-emp-nombre{font-size:0.84rem;font-weight:500;color:#f0ece4}
        .t-emp-sub{font-size:0.62rem;color:rgba(240,236,228,0.32);margin-top:1px}
        .t-emp-pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}
        .t-pill{display:inline-block;font-size:0.57rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;padding:3px 8px;border-radius:20px}
        .t-emp-meta{font-size:0.62rem;color:rgba(240,236,228,0.25);margin-top:8px;display:flex;justify-content:space-between}
        /* Calendario */
        .t-cal-wrap{overflow-x:auto;border-radius:10px;border:1px solid rgba(212,175,106,0.1)}
        .t-cal{width:100%;border-collapse:collapse;min-width:580px}
        .t-cal th{padding:9px 10px;font-size:0.57rem;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:rgba(240,236,228,0.28);text-align:center;border-bottom:1px solid rgba(212,175,106,0.1);background:#0f0f12;white-space:nowrap}
        .t-cal th.hoy-col{color:#d4af6a;background:rgba(212,175,106,0.05)}
        .t-cal td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .t-cal tr:last-child td{border-bottom:none}
        .t-celda{text-align:center;cursor:pointer;border-radius:6px;padding:5px 3px;transition:background 0.15s;min-width:52px}
        .t-celda:hover{background:rgba(212,175,106,0.07)}
        .t-turno-b{display:inline-block;font-size:0.58rem;font-weight:600;padding:3px 7px;border-radius:5px}
        /* Tiempo real */
        .t-tr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
        .t-tr-card{background:#13131a;border:1px solid rgba(212,175,106,0.12);border-radius:12px;padding:15px}
        /* Asistencia */
        .t-tbl{width:100%;border-collapse:collapse}
        .t-tbl th{font-size:0.57rem;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:rgba(240,236,228,0.25);padding:8px 11px;text-align:left;border-bottom:1px solid rgba(212,175,106,0.1);white-space:nowrap}
        .t-tbl td{padding:9px 11px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.74rem;vertical-align:middle}
        .t-tbl tr:last-child td{border-bottom:none}
        /* Reportes */
        .t-rep-g{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .t-rep-box{background:#13131a;border:1px solid rgba(212,175,106,0.1);border-radius:12px;padding:16px}
        .t-rep-lbl{font-size:0.59rem;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:rgba(240,236,228,0.28);margin-bottom:11px}
        .t-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
        .t-bar-lbl{width:78px;font-size:0.61rem;color:rgba(240,236,228,0.38);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .t-bar-track{flex:1;height:13px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
        .t-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#c9a84c,#d4af6a);transition:width 0.5s}
        .t-bar-cnt{width:20px;font-size:0.65rem;color:#d4af6a;font-weight:600;text-align:right}
        /* Buttons */
        .t-btn{padding:7px 13px;border-radius:7px;border:none;font-family:Montserrat,sans-serif;font-size:0.64rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;white-space:nowrap}
        .t-btn:disabled{opacity:0.4;cursor:not-allowed}
        .t-btn-gold{background:linear-gradient(135deg,#c9a84c,#d4af6a);color:#0a0a0a}
        .t-btn-green{background:rgba(82,201,122,0.12);border:1px solid rgba(82,201,122,0.35);color:#52c97a}
        .t-btn-red{background:rgba(224,82,82,0.12);border:1px solid rgba(224,82,82,0.35);color:#e05252}
        .t-btn-gray{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(240,236,228,0.4)}
        .t-btn-blue{background:rgba(106,184,212,0.12);border:1px solid rgba(106,184,212,0.35);color:#6ab8d4}
        .t-btn-sm{padding:5px 9px;font-size:0.58rem}
        /* Modal */
        .t-ov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:14px;animation:tfade 0.18s}
        @keyframes tfade{from{opacity:0}to{opacity:1}}
        .t-modal{background:#13131a;border:1px solid rgba(212,175,106,0.18);border-radius:14px;width:100%;max-width:480px;max-height:92vh;overflow-y:auto;animation:tup 0.24s cubic-bezier(0.16,1,0.3,1)}
        .t-modal::-webkit-scrollbar{width:3px}
        .t-modal::-webkit-scrollbar-thumb{background:rgba(212,175,106,0.2)}
        @keyframes tup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .t-mhdr{padding:17px 20px 12px;border-bottom:1px solid rgba(212,175,106,0.08);display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .t-mbody{padding:15px 20px 20px}
        .t-mf{margin-bottom:11px}
        .t-mg2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:11px}
        .t-mclose{width:26px;height:26px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(240,236,228,0.4);font-size:0.7rem;flex-shrink:0}
        .t-mclose:hover{background:rgba(255,255,255,0.1)}
        .t-ok{background:rgba(82,201,122,0.08);border:1px solid rgba(82,201,122,0.2);border-radius:8px;padding:9px 13px;font-size:0.74rem;color:#52c97a;text-align:center;margin-bottom:12px}
        .t-err{background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.2);border-radius:8px;padding:9px 13px;font-size:0.74rem;color:#e05252;margin-bottom:12px;cursor:pointer}
        .t-empty{text-align:center;padding:36px;color:rgba(240,236,228,0.18);font-size:0.8rem}
        .t-nav-btn{padding:6px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,106,0.15);border-radius:7px;color:rgba(240,236,228,0.5);font-family:Montserrat,sans-serif;font-size:0.68rem;cursor:pointer;transition:all 0.2s}
        .t-nav-btn:hover{background:rgba(212,175,106,0.08);color:#d4af6a}
        @media(max-width:640px){.t-rep-g{grid-template-columns:1fr}.t-stats{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      <PersonalLayout titulo="Turnos y Personal" subtitulo="Programación laboral, asistencia y gestión del equipo">
        {error && <div className="t-err" onClick={()=>setError(null)}>{error} ✕</div>}
        {exito && <div className="t-ok">{exito}</div>}

        {/* Tabs */}
        <div className="t-tabs">
          {TABS.map(t=>(
            <button key={t.key} className={`t-tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key as typeof tab)}>
              {t.label}
              {t.badge?<span className="t-badge">{t.badge}</span>:null}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab==='dashboard' && (
          <>
            <div className="t-stats">
              <div className="t-stat"><div className="t-stat-lbl">Empleados</div><div className="t-stat-val" style={{color:'#f0ece4'}}>{resumen.total_empleados}</div></div>
              <div className="t-stat"><div className="t-stat-lbl">En turno</div><div className="t-stat-val" style={{color:'#52c97a'}}>{resumen.en_turno}</div></div>
              <div className="t-stat"><div className="t-stat-lbl">Programados</div><div className="t-stat-val" style={{color:'#6ab8d4'}}>{resumen.programados_hoy}</div></div>
              <div className="t-stat"><div className="t-stat-lbl">Ausentes</div><div className="t-stat-val" style={{color:'#e05252'}}>{resumen.ausentes_hoy}</div></div>
              <div className="t-stat"><div className="t-stat-lbl">Vacaciones</div><div className="t-stat-val" style={{color:'#a06ad4'}}>{resumen.vacaciones}</div></div>
              <div className="t-stat"><div className="t-stat-lbl">Horas hoy</div><div className="t-stat-val" style={{color:'#d4af6a'}}>{resumen.horas_hoy}</div></div>
              <div className="t-stat"><div className="t-stat-lbl">Sol. pendientes</div><div className="t-stat-val" style={{color:'#e0a252'}}>{resumen.pendientes_vacacion}</div></div>
            </div>

            {/* Alertas de cobertura */}
            {alertas.length>0 && (
              <div style={{background:'rgba(224,82,82,0.05)',border:'1px solid rgba(224,82,82,0.2)',borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <span style={{fontSize:'1.1rem'}}>🚨</span>
                  <span style={{fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#e05252'}}>
                    {alertas.length} turno{alertas.length>1?'s':''} sin cobertura — próximos 7 días
                  </span>
                </div>
                {Object.entries(alertasPorArea).map(([area,items])=>(
                  <div key={area} className="t-alerta-area">
                    <div className="t-alerta-area-hdr">
                      {area==='Seguridad'?'🔒':area==='Recepción'?'🏨':'⚠️'} {area}
                      <span style={{fontSize:'0.58rem',background:'rgba(224,82,82,0.15)',padding:'2px 8px',borderRadius:10}}>{items.length} sin cubrir</span>
                    </div>
                    {items.slice(0,3).map((a,i)=>(
                      <div key={i} className="t-alerta-row">
                        <div className="t-alerta-info">
                          <strong>{a.turno}</strong> — {fmtDia(a.fecha)} · {fmtHora(a.hora_inicio)}–{fmtHora(a.hora_fin)}
                        </div>
                        <span className="t-alerta-badge">{a.asignados}/{a.requeridos} asig.</span>
                      </div>
                    ))}
                    {items.length>3 && <div style={{fontSize:'0.62rem',color:'rgba(224,82,82,0.5)',paddingLeft:4}}>+{items.length-3} más...</div>}
                  </div>
                ))}
                <button className="t-btn t-btn-gold" style={{marginTop:8}} onClick={()=>setTab('programacion')}>
                  Ir a Programación →
                </button>
              </div>
            )}

            {/* Próximos cambios */}
            {resumen.proximos_cambios.length>0 && (
              <div style={{background:'#13131a',border:'1px solid rgba(212,175,106,0.1)',borderRadius:10,padding:15,marginBottom:14}}>
                <div style={lbl as React.CSSProperties}>Próximos cambios de turno (2h)</div>
                {resumen.proximos_cambios.map((c,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div><div style={{fontSize:'0.78rem',color:'#f0ece4'}}>{c.nombre}</div><div style={{fontSize:'0.62rem',color:'rgba(240,236,228,0.3)'}}>{c.cargo}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:'0.78rem',color:'#d4af6a'}}>{c.turno}</div><div style={{fontSize:'0.62rem',color:'rgba(240,236,228,0.3)'}}>{fmtHora(c.hora)}</div></div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista turnos definidos */}
            <div style={{background:'#13131a',border:'1px solid rgba(212,175,106,0.1)',borderRadius:10,padding:15}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={lbl as React.CSSProperties}>Turnos definidos ({turnosDef.length})</div>
                {esAdmin && <button className="t-btn t-btn-gold t-btn-sm" onClick={()=>{setModalTD(true);setFNombre('');setFObs('');setFObl(false)}}>+ Nuevo</button>}
              </div>
              {turnosDef.map(t=>(
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <div style={{display:'flex',gap:9,alignItems:'center'}}>
                    <span style={{width:9,height:9,borderRadius:'50%',background:TIPO_C[t.tipo]??'#d4af6a',display:'inline-block'}} />
                    <div>
                      <span style={{fontSize:'0.78rem',color:'#f0ece4'}}>{t.nombre}</span>
                      {t.cobertura_obligatoria && <span style={{marginLeft:6,fontSize:'0.55rem',color:'#e05252',background:'rgba(224,82,82,0.1)',padding:'1px 5px',borderRadius:4}}>24/7</span>}
                    </div>
                  </div>
                  <div style={{fontSize:'0.67rem',color:'rgba(240,236,228,0.3)',textAlign:'right'}}>
                    {fmtHora(t.hora_inicio)}–{fmtHora(t.hora_fin)}{t.area?` · ${t.area}`:''}<br/>
                    <span style={{fontSize:'0.58rem'}}>Req: {t.personal_requerido}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── EMPLEADOS ── */}
        {tab==='empleados' && esAdmin && (
          <>
            <div style={{display:'flex',gap:9,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <input style={{...inp,flex:1,minWidth:200,padding:'8px 12px'}} placeholder="Buscar por nombre, cargo, área..." value={busqEmp} onChange={e=>setBusqEmp(e.target.value)} />
              <button className="t-btn t-btn-gold" onClick={abrirCrearEmp}>+ Nuevo empleado</button>
            </div>
            {cargTab ? <div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.78rem'}}>Cargando...</div>
              : empsFiltrados.length===0 ? <div className="t-empty">Sin empleados</div>
              : (
              <div className="t-emp-grid">
                {empsFiltrados.map(e=>{
                  const ec=EMP_ESTADO[e.estado]??EMP_ESTADO.activo
                  const hColor = TIPO_C['manana']
                  const initials = e.nombre.split(' ').map((n:string)=>n[0]).slice(0,2).join('')
                  return (
                    <div key={e.id} className="t-emp-card" onClick={()=>abrirEditarEmp(e)}>
                      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                        <div className="t-emp-av" style={{background:`${hColor}18`,border:`1px solid ${hColor}35`,color:hColor}}>{initials}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="t-emp-nombre">{e.nombre}</div>
                          <div className="t-emp-sub">{e.cargo}{e.area&&e.area!==e.cargo?` · ${e.area}`:''}</div>
                        </div>
                      </div>
                      <div className="t-emp-pills">
                        <span className="t-pill" style={{background:`${ec.color}18`,color:ec.color}}>{ec.label}</span>
                        {e.turno_hoy && <span className="t-pill" style={{background:'rgba(212,175,106,0.12)',color:'#d4af6a'}}>{e.turno_hoy}</span>}
                        {e.asistencia_hoy!=='sin_registro' && (
                          <span className="t-pill" style={{background:`${ESTADO_A[e.asistencia_hoy]?.color}18`,color:ESTADO_A[e.asistencia_hoy]?.color}}>
                            {ESTADO_A[e.asistencia_hoy]?.label}
                          </span>
                        )}
                      </div>
                      <div className="t-emp-meta">
                        <span>{e.email}</span>
                        {e.hora_entrada && <span>Entrada: {fmtTime(e.hora_entrada)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── PROGRAMACIÓN ── */}
        {tab==='programacion' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button className="t-nav-btn" onClick={()=>setSemana(d=>{const r=new Date(d);r.setDate(d.getDate()-7);return r})}>← Ant.</button>
                <span style={{fontSize:'0.76rem',color:'rgba(240,236,228,0.5)'}}>{fmtDate(isoDate(semanaInicio))} — {fmtDate(isoDate(semana[6]))}</span>
                <button className="t-nav-btn" onClick={()=>setSemana(d=>{const r=new Date(d);r.setDate(d.getDate()+7);return r})}>Sig. →</button>
                <button className="t-nav-btn" onClick={()=>setSemana(getLunes(new Date()))}>Hoy</button>
              </div>
              {esAdmin && <button className="t-btn t-btn-gold t-btn-sm" onClick={()=>{setModalTD(true);setFNombre('');setFObs('');setFObl(false)}}>+ Turno</button>}
            </div>
            {cargTab ? <div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.78rem'}}>Cargando...</div> : (
              <div className="t-cal-wrap">
                <table className="t-cal">
                  <thead><tr>
                    <th style={{textAlign:'left',width:150}}>Empleado</th>
                    {semana.map((d,i)=>(
                      <th key={i} className={isoDate(d)===hoy?'hoy-col':''}>
                        {DIAS[i]}<br/><span style={{fontSize:'0.7rem',fontWeight:400}}>{d.getDate()}</span>
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {programacion.length===0
                      ? <tr><td colSpan={8} className="t-empty">Sin programación esta semana</td></tr>
                      : programacion.map(emp=>(
                        <tr key={emp.personal_id}>
                          <td>
                            <div style={{fontSize:'0.78rem',color:'#f0ece4',fontWeight:500}}>{emp.nombre}</div>
                            <div style={{fontSize:'0.6rem',color:'rgba(240,236,228,0.3)'}}>{emp.cargo}</div>
                          </td>
                          {semana.map((d,i)=>{
                            const key=isoDate(d)
                            const t=emp.turnos[key]
                            const esHoy=key===hoy
                            return (
                              <td key={i} style={{background:esHoy?'rgba(212,175,106,0.03)':'transparent'}}>
                                <div className="t-celda" onClick={()=>esAdmin&&setCelda({personal_id:emp.personal_id,nombre:emp.nombre,fecha:d,actual:t??null})}>
                                  {t
                                    ? <span className="t-turno-b" style={{background:`${TIPO_C[t.tipo]??'#d4af6a'}20`,color:TIPO_C[t.tipo]??'#d4af6a'}}>{TIPOS_TURNO[t.tipo]?.slice(0,3)??t.nombre.slice(0,3)}</span>
                                    : <span style={{color:'rgba(240,236,228,0.12)',fontSize:'0.72rem'}}>{esAdmin?'+':'—'}</span>}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
            <div style={{marginTop:8,display:'flex',gap:12,flexWrap:'wrap'}}>
              {Object.entries(TIPO_C).map(([k,c])=>(
                <span key={k} style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.6rem',color:'rgba(240,236,228,0.3)'}}>
                  <span style={{width:8,height:8,borderRadius:2,background:`${c}88`}} />{TIPOS_TURNO[k]}
                </span>
              ))}
            </div>
          </>
        )}

        {/* ── TIEMPO REAL ── */}
        {tab==='tiempo_real' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:'0.7rem',color:'rgba(240,236,228,0.3)'}}>{tiempoReal.length} empleado{tiempoReal.length!==1?'s':''} trabajando ahora</div>
              <button className="t-btn t-btn-gray t-btn-sm" onClick={()=>{setCargTab(true);rpc('rpc_get_personal_tiempo_real').then(d=>setTR((d as TiempoReal[])??[])).finally(()=>setCargTab(false))}}>↻ Actualizar</button>
            </div>
            {cargTab ? <div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.78rem'}}>Cargando...</div>
              : tiempoReal.length===0 ? <div className="t-empty">Nadie ha registrado entrada aún hoy</div>
              : (
              <div className="t-tr-grid">
                {tiempoReal.map(p=>(
                  <div key={p.personal_id} className="t-tr-card">
                    <div style={{display:'flex',gap:9,alignItems:'center',marginBottom:10}}>
                      <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(212,175,106,0.1)',border:'1px solid rgba(212,175,106,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem',color:'#d4af6a',fontWeight:600,flexShrink:0}}>
                        {p.nombre.charAt(0)}
                      </div>
                      <div><div style={{fontSize:'0.84rem',fontWeight:500,color:'#f0ece4'}}>{p.nombre}</div><div style={{fontSize:'0.62rem',color:'rgba(240,236,228,0.32)'}}>{p.cargo}</div></div>
                    </div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2rem',color:'#52c97a',fontWeight:300,textAlign:'center',lineHeight:1}}>{p.horas_acumuladas}h</div>
                    <div style={{fontSize:'0.58rem',color:'rgba(82,201,122,0.5)',textAlign:'center',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>acumuladas</div>
                    {[['Área',p.area],['Entrada',fmtTime(p.hora_entrada)],p.turno?['Turno',p.turno]:null].filter(Boolean).map((row,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:'0.6rem',color:'rgba(240,236,228,0.28)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{row![0]}</span>
                        <span style={{fontSize:'0.74rem',color:'rgba(240,236,228,0.7)'}}>{row![1]}</span>
                      </div>
                    ))}
                    {p.tareas_pendientes>0 && (
                      <div style={{marginTop:8,padding:'4px 9px',background:'rgba(224,162,82,0.1)',border:'1px solid rgba(224,162,82,0.25)',borderRadius:6,fontSize:'0.63rem',color:'#e0a252',textAlign:'center'}}>
                        {p.tareas_pendientes} tarea{p.tareas_pendientes>1?'s':''} HK pendiente{p.tareas_pendientes>1?'s':''}
                      </div>
                    )}
                    <div style={{marginTop:9}}>
                      <span className="t-pill" style={{background:`${ESTADO_A[p.estado_asistencia]?.color??'#d4af6a'}18`,color:ESTADO_A[p.estado_asistencia]?.color??'#d4af6a'}}>
                        {ESTADO_A[p.estado_asistencia]?.label??p.estado_asistencia}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ASISTENCIA ── */}
        {tab==='asistencia' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.35)'}}>
                {new Date().toLocaleDateString('es-BO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
              </div>
              <button className="t-btn t-btn-gray t-btn-sm" onClick={()=>{setCargTab(true);rpc('rpc_get_asistencia_hoy').then(d=>setAsist((d as AsistItem[])??[])).finally(()=>setCargTab(false))}}>↻ Actualizar</button>
            </div>
            {cargTab ? <div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.78rem'}}>Cargando...</div>
              : asistencia.length===0 ? <div className="t-empty">Sin registros hoy</div>
              : (
              <div style={{overflowX:'auto'}}>
                <table className="t-tbl">
                  <thead><tr><th>Empleado</th><th>Turno</th><th>Estado</th><th>Entrada</th><th>Salida</th><th>Horas</th>{esAdmin&&<th>Acciones</th>}</tr></thead>
                  <tbody>
                    {asistencia.map(a=>{
                      const ec=ESTADO_A[a.estado]??ESTADO_A.sin_registro
                      return (
                        <tr key={a.personal_id}>
                          <td><div style={{fontSize:'0.78rem',color:'#f0ece4',fontWeight:500}}>{a.nombre}</div><div style={{fontSize:'0.6rem',color:'rgba(240,236,228,0.3)'}}>{a.cargo}</div></td>
                          <td style={{color:'rgba(240,236,228,0.38)',fontSize:'0.72rem'}}>{a.turno_nombre??'—'}</td>
                          <td><span className="t-pill" style={{background:`${ec.color}18`,color:ec.color}}>{ec.label}</span></td>
                          <td style={{color:'rgba(240,236,228,0.55)',fontFamily:'monospace'}}>{fmtTime(a.hora_entrada)}</td>
                          <td style={{color:'rgba(240,236,228,0.55)',fontFamily:'monospace'}}>{fmtTime(a.hora_salida)}</td>
                          <td style={{color:'#d4af6a'}}>
                            {a.horas_trabajadas!=null?`${a.horas_trabajadas}h`:a.hora_entrada?'…':'—'}
                            {a.horas_extras!=null&&a.horas_extras>0&&<span style={{fontSize:'0.6rem',color:'#52c97a',marginLeft:4}}>+{a.horas_extras}h</span>}
                          </td>
                          {esAdmin&&<td>
                            <div style={{display:'flex',gap:4}}>
                              {!a.hora_entrada&&a.estado==='sin_registro'&&<button className="t-btn t-btn-green t-btn-sm" disabled={procesando===a.personal_id} onClick={()=>handleEntrada(a.personal_id)}>Entrada</button>}
                              {a.hora_entrada&&!a.hora_salida&&<button className="t-btn t-btn-blue t-btn-sm" disabled={procesando===a.personal_id} onClick={()=>handleSalida(a.personal_id)}>Salida</button>}
                              <button className="t-btn t-btn-gray t-btn-sm" onClick={()=>{setModalAsist(a);setMEstado(a.estado==='sin_registro'?'ausente':a.estado);setMObs(a.observaciones??'')}}>···</button>
                            </div>
                          </td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── VACACIONES ── */}
        {tab==='vacaciones' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.35)'}}>{solicitudes.length} solicitud{solicitudes.length!==1?'es':''}</div>
              {esAdmin&&<button className="t-btn t-btn-gold" onClick={()=>{setModalVac(true);setExitoVac(false);setVPersId('');setVFI('');setVFF('');setVMotivo('')}}>+ Nueva solicitud</button>}
            </div>
            {cargTab?<div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.78rem'}}>Cargando...</div>
              :solicitudes.length===0?<div className="t-empty">Sin solicitudes</div>
              :(
              <div style={{display:'grid',gap:9}}>
                {solicitudes.map(s=>{
                  const color=s.estado==='aprobado'?'#52c97a':s.estado==='rechazado'?'#e05252':'#d4af6a'
                  return (
                    <div key={s.id} style={{background:'#13131a',border:'1px solid rgba(212,175,106,0.1)',borderRadius:10,padding:'13px 15px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                      <div style={{fontSize:'1.2rem'}}>{s.tipo==='vacaciones'?'🏖':s.tipo==='incapacidad'?'🏥':s.tipo==='licencia'?'📋':'📝'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'0.84rem',fontWeight:500,color:'#f0ece4'}}>{s.nombre}</div>
                        <div style={{fontSize:'0.66rem',color:'rgba(240,236,228,0.35)',marginTop:2}}>
                          <span style={{textTransform:'capitalize'}}>{s.tipo}</span> · {fmtDate(s.fecha_inicio)} → {fmtDate(s.fecha_fin)} ({s.dias} día{s.dias!==1?'s':''}){s.motivo?` · ${s.motivo}`:''}
                        </div>
                      </div>
                      <span style={{fontSize:'0.6rem',fontWeight:600,textTransform:'uppercase',color,background:`${color}15`,padding:'3px 10px',borderRadius:20}}>{s.estado}</span>
                      {esAdmin&&s.estado==='pendiente'&&(
                        <div style={{display:'flex',gap:6}}>
                          <button className="t-btn t-btn-green t-btn-sm" disabled={procesando===s.id} onClick={()=>handleAprobarVac(s.id,true)}>✓ Aprobar</button>
                          <button className="t-btn t-btn-red t-btn-sm" disabled={procesando===s.id} onClick={()=>handleAprobarVac(s.id,false)}>✕ Rechazar</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── REPORTES ── */}
        {tab==='reportes'&&esAdmin&&(
          <>
            {cargTab?<div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.78rem'}}>Cargando...</div>:!reportes?null:(
            <>
              <div className="t-rep-g">
                <div className="t-rep-box">
                  <div className="t-rep-lbl">Personal por área</div>
                  {(()=>{const mx=Math.max(...(reportes.por_area??[]).map(a=>a.total),1);return(reportes.por_area??[]).map(a=>(
                    <div key={a.area} className="t-bar-row"><div className="t-bar-lbl">{a.area}</div><div className="t-bar-track"><div className="t-bar-fill" style={{width:`${a.total/mx*100}%`}}/></div><div className="t-bar-cnt">{a.total}</div></div>
                  ))})()}
                </div>
                <div className="t-rep-box">
                  <div className="t-rep-lbl">Asistencia últimos 7 días</div>
                  {(reportes.asistencia_semanal??[]).map(d=>(
                    <div key={d.fecha} className="t-bar-row">
                      <div className="t-bar-lbl">{fmtDate(d.fecha)}</div>
                      <div style={{flex:1,display:'flex',gap:2,height:13}}>
                        {d.presentes>0&&<div style={{flex:d.presentes,background:'rgba(82,201,122,0.4)',borderRadius:3}} title={`Presentes: ${d.presentes}`}/>}
                        {d.retrasos>0&&<div style={{flex:d.retrasos,background:'rgba(212,175,106,0.4)',borderRadius:3}} title={`Retrasos: ${d.retrasos}`}/>}
                        {d.ausentes>0&&<div style={{flex:d.ausentes,background:'rgba(224,82,82,0.4)',borderRadius:3}} title={`Ausentes: ${d.ausentes}`}/>}
                      </div>
                      <div className="t-bar-cnt" style={{color:'rgba(240,236,228,0.35)'}}>{d.presentes+d.retrasos+d.ausentes}</div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:10,marginTop:8}}>
                    {[['#52c97a','Presentes'],['#d4af6a','Retrasos'],['#e05252','Ausentes']].map(([c,l])=>(
                      <span key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.6rem',color:'rgba(240,236,228,0.28)'}}>
                        <span style={{width:7,height:7,borderRadius:2,background:c+'66'}}/>{l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="t-rep-g">
                <div className="t-rep-box">
                  <div className="t-rep-lbl">Empleados con retrasos (30 días)</div>
                  {(reportes.empleados_retrasos??[]).length===0?<div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.74rem'}}>Sin retrasos</div>:(
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>{['Empleado','Retrasos','Prom. hrs'].map(h=><th key={h} style={{fontSize:'0.56rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(240,236,228,0.25)',padding:'6px 8px',textAlign:'left',borderBottom:'1px solid rgba(212,175,106,0.08)'}}>{h}</th>)}</tr></thead>
                      <tbody>{(reportes.empleados_retrasos??[]).map((e,i)=><tr key={i}><td style={{padding:'7px 8px',fontSize:'0.72rem',color:'rgba(240,236,228,0.6)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{e.nombre}</td><td style={{padding:'7px 8px',fontSize:'0.72rem',color:'#e05252',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{e.retrasos}</td><td style={{padding:'7px 8px',fontSize:'0.72rem',color:'rgba(240,236,228,0.4)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{e.horas_prom??'—'}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
                <div className="t-rep-box">
                  <div className="t-rep-lbl">Rendimiento 30 días</div>
                  {(reportes.rendimiento??[]).length===0?<div style={{color:'rgba(240,236,228,0.2)',fontSize:'0.74rem'}}>Sin datos</div>:(
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>{['Empleado','Horas','Tareas HK'].map(h=><th key={h} style={{fontSize:'0.56rem',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(240,236,228,0.25)',padding:'6px 8px',textAlign:'left',borderBottom:'1px solid rgba(212,175,106,0.08)'}}>{h}</th>)}</tr></thead>
                      <tbody>{(reportes.rendimiento??[]).map((e,i)=><tr key={i}><td style={{padding:'7px 8px',fontSize:'0.72rem',color:'rgba(240,236,228,0.6)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{e.nombre}</td><td style={{padding:'7px 8px',fontSize:'0.72rem',color:'#d4af6a',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{e.horas_total??0}</td><td style={{padding:'7px 8px',fontSize:'0.72rem',color:'rgba(240,236,228,0.4)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{e.tareas}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
            )}
          </>
        )}
      </PersonalLayout>

      {/* ── Modal celda calendario ── */}
      {celda&&(
        <div className="t-ov" onClick={()=>setCelda(null)}>
          <div className="t-modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div className="t-mhdr">
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.25rem',color:'#d4af6a',fontWeight:300}}>Asignar turno</div>
                <div style={{fontSize:'0.67rem',color:'rgba(240,236,228,0.35)',marginTop:2}}>{celda.nombre} — {celda.fecha.toLocaleDateString('es-BO',{weekday:'long',day:'2-digit',month:'short'})}</div>
              </div>
              <button className="t-mclose" onClick={()=>setCelda(null)}>✕</button>
            </div>
            <div className="t-mbody">
              {celda.actual&&(
                <div style={{marginBottom:12,padding:'9px 12px',background:'rgba(212,175,106,0.06)',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.5)'}}>Actual: <strong style={{color:'#d4af6a'}}>{celda.actual.nombre}</strong></span>
                  <button className="t-btn t-btn-red t-btn-sm" disabled={guardCelda} onClick={handleQuitarTurno}>Quitar</button>
                </div>
              )}
              <div className="t-mf">
                <label style={lbl}>Seleccionar turno</label>
                <select style={inp} value={celdaTurnoId} onChange={e=>setCeldaTI(e.target.value)}>
                  <option value="">— Elegir turno —</option>
                  {turnosDef.map(t=><option key={t.id} value={t.id}>{t.nombre} ({fmtHora(t.hora_inicio)}–{fmtHora(t.hora_fin)}){t.cobertura_obligatoria?' 🔒':''}</option>)}
                </select>
              </div>
              <button className="t-btn t-btn-gold" style={{width:'100%',padding:11}} disabled={!celdaTurnoId||guardCelda} onClick={handleAsignarCelda}>
                {guardCelda?'Guardando...':'Asignar turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal empleado crear/editar ── */}
      {modalEmp&&(
        <div className="t-ov" onClick={()=>!guardEmp&&setModalEmp(null)}>
          <div className="t-modal" onClick={e=>e.stopPropagation()}>
            <div className="t-mhdr">
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',color:'#d4af6a',fontWeight:300}}>{modalEmp==='crear'?'Nuevo empleado':'Editar empleado'}</div>
                {empSel&&<div style={{fontSize:'0.67rem',color:'rgba(240,236,228,0.35)',marginTop:2}}>{empSel.nombre}</div>}
              </div>
              {!guardEmp&&<button className="t-mclose" onClick={()=>setModalEmp(null)}>✕</button>}
            </div>
            <div className="t-mbody">
              {exitoEmp?(
                <div style={{textAlign:'center',padding:'24px 0'}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(82,201,122,0.1)',border:'2px solid rgba(82,201,122,0.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:'1.3rem'}}>✓</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',color:'#52c97a'}}>{modalEmp==='crear'?'Empleado creado':'Cambios guardados'}</div>
                </div>
              ):(
                <>
                  <div className="t-mg2">
                    <div><label style={lbl}>Nombre completo *</label><input style={inp} value={eNombre} onChange={e=>setENombre(e.target.value)} placeholder="Ej: Juan Pérez" /></div>
                    <div><label style={lbl}>Email {modalEmp==='crear'?'*':''}</label><input type="email" style={inp} value={eEmail} onChange={e=>setEEmail(e.target.value)} placeholder="correo@hotel.com" disabled={modalEmp==='editar'} /></div>
                  </div>
                  <div className="t-mg2">
                    <div><label style={lbl}>Cargo *</label>
                      <select style={inp} value={eCargo} onChange={e=>setECargo(e.target.value)}>
                        <option value="">Seleccionar</option>
                        {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div><label style={lbl}>Área</label>
                      <select style={inp} value={eArea} onChange={e=>setEArea(e.target.value)}>
                        <option value="">Seleccionar</option>
                        {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="t-mg2">
                    <div><label style={lbl}>Rol en el sistema</label>
                      <select style={inp} value={eRol} onChange={e=>setERol(e.target.value)}>
                        {['Administrador','Supervisor','Empleado','Recepcionista'].map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div><label style={lbl}>Fecha contratación</label><input type="date" style={inp} value={eFecha} onChange={e=>setEFecha(e.target.value)} /></div>
                  </div>
                  <div className="t-mg2">
                    <div><label style={lbl}>Documento CI</label><input style={inp} value={eDoc} onChange={e=>setEDoc(e.target.value)} placeholder="12345678" /></div>
                    <div><label style={lbl}>Teléfono</label><input style={inp} value={eTel} onChange={e=>setETel(e.target.value)} placeholder="+591 70000000" /></div>
                  </div>
                  <div className="t-mf"><label style={lbl}>Dirección</label><input style={inp} value={eDir} onChange={e=>setEDir(e.target.value)} placeholder="Calle, ciudad..." /></div>
                  {modalEmp==='editar'&&empSel&&(
                    <div style={{display:'flex',gap:7,marginBottom:12}}>
                      {Object.entries(EMP_ESTADO).map(([k,v])=>(
                        <button key={k} className="t-btn t-btn-sm" disabled={procesando===empSel.id||empSel.estado===k} onClick={()=>handleCambiarEstadoEmp(empSel.id,k)}
                          style={{background:`${v.color}12`,border:`1px solid ${v.color}35`,color:v.color,opacity:empSel.estado===k?0.4:1}}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {modalEmp==='crear'&&(
                    <div style={{padding:'8px 12px',background:'rgba(106,184,212,0.07)',border:'1px solid rgba(106,184,212,0.2)',borderRadius:7,marginBottom:12,fontSize:'0.68rem',color:'rgba(106,184,212,0.8)'}}>
                      ℹ️ El empleado podrá acceder al sistema una vez que cree su cuenta con el mismo email.
                    </div>
                  )}
                  <button className="t-btn t-btn-gold" style={{width:'100%',padding:11}} disabled={!eNombre.trim()||!eCargo||guardEmp} onClick={handleGuardarEmp}>
                    {guardEmp?'Guardando...':(modalEmp==='crear'?'Crear empleado':'Guardar cambios')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo turno def ── */}
      {modalTD&&(
        <div className="t-ov" onClick={()=>setModalTD(false)}>
          <div className="t-modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div className="t-mhdr">
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.25rem',color:'#d4af6a',fontWeight:300}}>Nuevo turno</div>
              <button className="t-mclose" onClick={()=>setModalTD(false)}>✕</button>
            </div>
            <div className="t-mbody">
              <div className="t-mf"><label style={lbl}>Nombre *</label><input style={inp} placeholder="Ej: HK Mañana" value={fNombre} onChange={e=>setFNombre(e.target.value)} /></div>
              <div className="t-mg2">
                <div><label style={lbl}>Tipo</label>
                  <select style={inp} value={fTipo} onChange={e=>setFTipo(e.target.value)}>
                    {Object.entries(TIPOS_TURNO).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Área</label>
                  <select style={inp} value={fArea} onChange={e=>setFArea(e.target.value)}>
                    <option value="">Sin área</option>
                    {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="t-mg2">
                <div><label style={lbl}>Hora inicio</label><input type="time" style={inp} value={fHI} onChange={e=>setFHI(e.target.value)} /></div>
                <div><label style={lbl}>Hora fin</label><input type="time" style={inp} value={fHF} onChange={e=>setFHF(e.target.value)} /></div>
              </div>
              <div className="t-mg2">
                <div><label style={lbl}>Personal requerido</label><input type="number" min={1} style={inp} value={fReq} onChange={e=>setFReq(+e.target.value)} /></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:12,padding:'9px 12px',background:'rgba(224,82,82,0.06)',borderRadius:8,border:'1px solid rgba(224,82,82,0.15)'}}>
                <input type="checkbox" id="obl" checked={fObl} onChange={e=>setFObl(e.target.checked)} style={{accentColor:'#e05252',width:15,height:15}} />
                <label htmlFor="obl" style={{fontSize:'0.72rem',color:'rgba(240,236,228,0.6)',cursor:'pointer'}}>
                  🔒 Cobertura obligatoria 24/7 — alerta si no hay personal asignado
                </label>
              </div>
              <div className="t-mf"><label style={lbl}>Observaciones</label><textarea style={{...inp,resize:'vertical',minHeight:48}} value={fObs} onChange={e=>setFObs(e.target.value)} /></div>
              <button className="t-btn t-btn-gold" style={{width:'100%',padding:11}} disabled={!fNombre||creandoTD} onClick={handleCrearTurnoDef}>
                {creandoTD?'Creando...':'Crear turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal asistencia manual ── */}
      {modalAsist&&(
        <div className="t-ov" onClick={()=>setModalAsist(null)}>
          <div className="t-modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="t-mhdr">
              <div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.25rem',color:'#d4af6a',fontWeight:300}}>Editar asistencia</div><div style={{fontSize:'0.67rem',color:'rgba(240,236,228,0.35)',marginTop:2}}>{modalAsist.nombre}</div></div>
              <button className="t-mclose" onClick={()=>setModalAsist(null)}>✕</button>
            </div>
            <div className="t-mbody">
              <div className="t-mf"><label style={lbl}>Estado</label>
                <select style={inp} value={mEstado} onChange={e=>setMEstado(e.target.value)}>
                  {Object.entries(ESTADO_A).filter(([k])=>k!=='sin_registro').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="t-mf"><label style={lbl}>Observaciones</label><textarea style={{...inp,resize:'vertical',minHeight:55}} value={mObs} onChange={e=>setMObs(e.target.value)} /></div>
              <button className="t-btn t-btn-gold" style={{width:'100%',padding:11}} disabled={!mEstado||guardAsist} onClick={handleGuardarAsist}>
                {guardAsist?'Guardando...':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal solicitar vacación ── */}
      {modalVac&&(
        <div className="t-ov" onClick={()=>!creandoVac&&setModalVac(false)}>
          <div className="t-modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div className="t-mhdr">
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.25rem',color:'#d4af6a',fontWeight:300}}>Nueva solicitud</div>
              {!creandoVac&&<button className="t-mclose" onClick={()=>setModalVac(false)}>✕</button>}
            </div>
            <div className="t-mbody">
              {exitoVac?(
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{width:46,height:46,borderRadius:'50%',background:'rgba(82,201,122,0.1)',border:'2px solid rgba(82,201,122,0.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:'1.3rem'}}>✓</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',color:'#52c97a'}}>Solicitud registrada</div>
                </div>
              ):(
                <>
                  <div className="t-mf"><label style={lbl}>Empleado *</label>
                    <select style={inp} value={vPersId} onChange={e=>setVPersId(e.target.value)}>
                      <option value="">Seleccionar empleado</option>
                      {personal.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.cargo}</option>)}
                    </select>
                  </div>
                  <div className="t-mg2">
                    <div><label style={lbl}>Tipo</label>
                      <select style={inp} value={vTipo} onChange={e=>setVTipo(e.target.value)}>
                        {['vacaciones','permiso','incapacidad','licencia'].map(t=><option key={t} value={t} style={{textTransform:'capitalize'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="t-mg2">
                    <div><label style={lbl}>Fecha inicio *</label><input type="date" style={inp} value={vFI} onChange={e=>setVFI(e.target.value)} /></div>
                    <div><label style={lbl}>Fecha fin *</label><input type="date" style={inp} value={vFF} onChange={e=>setVFF(e.target.value)} /></div>
                  </div>
                  <div className="t-mf"><label style={lbl}>Motivo</label><textarea style={{...inp,resize:'vertical',minHeight:50}} value={vMotivo} onChange={e=>setVMotivo(e.target.value)} /></div>
                  <button className="t-btn t-btn-gold" style={{width:'100%',padding:11}} disabled={!vPersId||!vFI||!vFF||creandoVac} onClick={handleCrearVac}>
                    {creandoVac?'Guardando...':'Registrar solicitud'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
