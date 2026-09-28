-- Rollback capturado antes de corregir la relación auth.uid() -> personal.
-- Ejecutar solamente si se necesita restaurar la función a su estado anterior.
-- Este script no modifica datos de ninguna tabla.

CREATE OR REPLACE FUNCTION public.rpc_get_mis_tareas_housekeeping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_personal_id uuid;
BEGIN
  SELECT id INTO v_personal_id FROM personal WHERE usuario_id = auth.uid();
  RETURN COALESCE(
    (SELECT jsonb_agg(fila ORDER BY prioridad_ord ASC, creado DESC)
     FROM (
       SELECT
         jsonb_build_object(
           'id',                t.id,
           'codigo',            t.codigo,
           'habitacion_id',     t.habitacion_id,
           'habitacion_numero', h.numero,
           'piso',              h.piso,
           'tipo_habitacion',   th.nombre,
           'prioridad',         t.prioridad,
           'estado',            t.estado,
           'fecha_programada',  t.fecha_programada,
           'hora_inicio',       t.hora_inicio,
           'hora_fin',          t.hora_fin,
           'observaciones',     t.observaciones,
           'checklist_total',   (SELECT COUNT(*) FROM checklist_limpieza cl WHERE cl.tarea_id = t.id),
           'checklist_ok',      (SELECT COUNT(*) FROM checklist_limpieza cl WHERE cl.tarea_id = t.id AND cl.completado = true),
           'created_at',        t.created_at
         ) AS fila,
         CASE t.prioridad
           WHEN 'urgente' THEN 1
           WHEN 'alta'    THEN 2
           WHEN 'media'   THEN 3
           ELSE 4
         END AS prioridad_ord,
         t.created_at AS creado
       FROM tareas_limpieza t
       JOIN habitaciones h ON h.id = t.habitacion_id
       JOIN tipos_habitacion th ON th.id = h.tipo_habitacion_id
       WHERE t.personal_id = v_personal_id
         AND t.estado NOT IN ('aprobada')
     ) sub),
    '[]'::jsonb
  );
END;
$function$;
