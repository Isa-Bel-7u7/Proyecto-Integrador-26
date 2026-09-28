// ============================================================
// PRINCIPIO ISP (Interface Segregation Principle)
// MensajeBuzon define ÚNICAMENTE los campos del contrato de
// un mensaje del buzón. No mezcla conceptos de otras entidades
// (reservas, habitaciones, pagos). El hook useBuzon, el servicio
// buzonService y el componente Buzon.tsx dependen solo de esta
// interfaz específica para su dominio.
// ============================================================

export interface MensajeBuzon {
  id: string
  tipo: string
  categoria: string | null
  asunto: string
  mensaje: string
  estado: string
  prioridad: string
  anonimo: boolean
  nombre_contacto: string | null
  correo_contacto: string | null
  respuesta: string | null
  fecha_respuesta: string | null
  valoracion: number | null
  created_at: string
  // Relación con usuarios: solo los campos necesarios para mostrar el remitente
  usuarios: { nombre_completo: string; correo: string } | null
}
