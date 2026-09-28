# Plan de JIRA, ramificación, pull requests y sprint del sistema hotelero

## 1. Contexto del proyecto

El proyecto consiste en un sistema integral de gestión hotelera desarrollado durante aproximadamente cinco meses por una sola persona. El producto tiene dos clientes que comparten información mediante Supabase:

- `hotel-system`: plataforma web desarrollada con React, TypeScript y Vite.
- `HotelApp`: aplicación móvil desarrollada con React Native y Expo.

El sistema contempla experiencias diferenciadas para cliente, administrador, recepción, caja, supervisión, housekeeping y otros perfiles del personal. Entre sus módulos se encuentran autenticación, habitaciones, disponibilidad, reservas, pagos, check-in, check-out, limpieza, incidencias, notificaciones, clientes, turnos, anuncios, buzón, reseñas, reportes y auditoría.

La aplicación móvil añade búsqueda y reserva de habitaciones, pagos, pre check-in, favoritos, solicitudes de servicio, avisos, buzón y perfiles específicos para cliente, housekeeping, personal y administración.

### Estado final de la entrega (28 de septiembre de 2026)

El backlog se importó en el proyecto JIRA `HOTEL` con **9 épicas y 20 historias**. Como JIRA creó primero las épicas, las claves definitivas de las historias de integración son distintas de los identificadores usados durante la planificación inicial:

| Evidencia | Clave JIRA definitiva | Rama preservada | Pull request |
|---|---|---|---|
| Incremento web | `HOTEL-10` | `feat/HOTEL-1-web-hotel-system` | [PR #1](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/1) |
| Incremento móvil | `HOTEL-11` | `feat/HOTEL-2-mobile-hotel-app` | [PR #2](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/2) |
| Estrategia y backlog | `HOTEL-12` | `docs/HOTEL-3-project-management` | [PR #3](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/3) |

Las ramas conservan sus nombres originales como evidencia de que se crearon antes de que JIRA asignara las claves definitivas. La relación correcta quedó registrada tanto en las historias como en los títulos y comentarios de los pull requests.

El **Sprint 5 - Entrega final** está activo del 28 de septiembre al 2 de octubre de 2026. Incluye `HOTEL-10`, `HOTEL-11`, `HOTEL-12` y `HOTEL-29` en estado `Listo`, y `HOTEL-28` en estado `En curso`. La historia de pruebas no se cerró artificialmente porque aún representa deuda técnica real.

## 2. Diagnóstico real del repositorio

### 2.1 Evidencia técnica encontrada

- La plataforma web contiene 50 archivos TypeScript o TSX y aproximadamente 17 500 líneas.
- La aplicación móvil contiene 70 archivos TypeScript o TSX y aproximadamente 15 500 líneas.
- Ambas aplicaciones utilizan la misma fuente de datos en Supabase mediante tablas, almacenamiento y funciones RPC.
- La web compila correctamente para producción.
- La verificación TypeScript de la aplicación móvil termina correctamente.
- Las 34 pruebas unitarias de utilidades pasan.
- Existen 15 pruebas de integración y 15 escenarios E2E documentados.

### 2.2 Deuda técnica detectada

- Siete de las quince pruebas de integración fallan porque las expectativas y los mocks ya no coinciden con la interfaz actual.
- Vitest intenta cargar `src/e2e/hotel.spec.ts`, aunque ese archivo pertenece a Playwright. Debe excluirse del patrón de Vitest.
- El paquete JavaScript generado por la web supera 1 MB antes de gzip; conviene dividir módulos mediante carga diferida.
- El README de `hotel-system` aún es el texto inicial de Vite y no documenta el sistema real.
- La base de datos y sus migraciones no están versionadas en el proyecto visible; solo se encontró un archivo de respaldo SQL.

### 2.3 Situación de Git y evidencia creada

Al iniciar la preparación de la entrega, `HotelApp` tenía un historial local de dos commits sin remoto, `hotel-system` no tenía historial propio y la carpeta `.git` de la raíz estaba incompleta. Ese diagnóstico se conservó sin inventar actividad retroactiva.

Para la entrega se inicializó un repositorio general, se configuró el remoto `Isa-Bel-7u7/Proyecto-Integrador-26` y se conservaron los dos productos en ramas trazables. El historial móvil anterior quedó respaldado localmente y excluido del repositorio general. Las ramas publicadas para los incrementos son:

- `feat/HOTEL-1-web-hotel-system`;
- `feat/HOTEL-2-mobile-hotel-app`;
- `docs/HOTEL-3-project-management`.

## 3. Configuración propuesta para JIRA

### Proyecto

- Nombre: Sistema Integral de Gestión Hotelera
- Clave sugerida: `HOTEL`
- Metodología: Scrum
- Duración de sprint: dos semanas
- Equipo: una desarrolladora

### Flujo de estados

`Backlog` → `Seleccionada para desarrollo` → `En progreso` → `En revisión` → `En pruebas` → `Finalizada`

Aunque trabaja una sola persona, el estado `En revisión` se conserva para realizar auto-revisión mediante pull request, comprobar los criterios de aceptación y dejar evidencia del proceso.

### Definición de terminado

Una historia puede pasar a `Finalizada` solamente cuando:

- cumple todos sus criterios de aceptación;
- su código se encuentra en una rama asociada a la clave JIRA;
- cuenta con pruebas proporcionales al cambio;
- compila sin errores;
- tiene un pull request con descripción y evidencias;
- fue integrada a `main` mediante pull request;
- no expone credenciales ni archivos `.env`.

## 4. Épicas del producto

| Clave | Épica | Objetivo |
|---|---|---|
| EP-01 | Identidad y seguridad | Autenticar usuarios y limitar funciones según su rol. |
| EP-02 | Catálogo y disponibilidad | Publicar habitaciones y calcular disponibilidad real. |
| EP-03 | Ciclo de reservas | Crear, consultar, modificar, confirmar y cancelar reservas. |
| EP-04 | Operación de estadía | Gestionar check-in, check-out, huéspedes y estados operativos. |
| EP-05 | Pagos | Registrar cobros, pagos parciales y saldos. |
| EP-06 | Housekeeping e incidencias | Coordinar limpieza, control de habitaciones e incidencias. |
| EP-07 | Experiencia del cliente | Ofrecer notificaciones, pre check-in, favoritos, reseñas y solicitudes. |
| EP-08 | Administración y control | Gestionar clientes, personal, reportes, auditoría y configuración. |
| EP-09 | Calidad y entrega | Asegurar compilación, pruebas, documentación y trazabilidad. |

## 5. Backlog de historias de usuario listo para JIRA

Las claves son propuestas. JIRA asignará las definitivas al crear los elementos.

### HOTEL-1 Registro e inicio de sesión

**Épica:** EP-01  
**Historia:** Como usuario del hotel, quiero registrarme, iniciar sesión y recuperar mi contraseña para acceder de forma segura a las funciones que me corresponden.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. El cliente puede registrarse con datos válidos y correo único.
2. Cliente y personal pueden iniciar sesión con credenciales válidas.
3. Las credenciales inválidas producen un mensaje claro.
4. El usuario puede solicitar recuperación mediante correo.
5. Al cerrar sesión no puede volver a una ruta protegida sin autenticarse.

**Rama:** `feature/HOTEL-1-autenticacion`  
**Requisitos relacionados:** RF01, RF02, RF03, RNF04 y RNF06.

### HOTEL-2 Control de acceso por roles

**Épica:** EP-01  
**Historia:** Como administrador, quiero que cada usuario acceda únicamente a los módulos autorizados para proteger la información y las operaciones del hotel.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. El cliente solo puede ingresar a las rutas de cliente.
2. El personal visualiza opciones acordes con su cargo.
3. El intento de abrir una ruta no autorizada redirige o muestra acceso denegado.
4. El cliente no puede consultar reservas, pagos o perfiles de otra persona.

**Rama:** `feature/HOTEL-2-roles-permisos`  
**Requisitos relacionados:** RF05, RNF05 y RNF08.

### HOTEL-3 Catálogo de habitaciones

**Épica:** EP-02  
**Historia:** Como cliente, quiero consultar las habitaciones activas con sus imágenes, capacidad, precio y servicios para elegir una opción adecuada.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Solo se muestran habitaciones habilitadas para venta.
2. Cada opción muestra tipo, capacidad, precio, servicios e imágenes disponibles.
3. El detalle se puede consultar desde web y móvil.
4. Si no existen resultados, se muestra un estado vacío comprensible.

**Rama:** `feature/HOTEL-3-catalogo-habitaciones`  
**Requisitos relacionados:** RF13 y RF14.

### HOTEL-4 Búsqueda de disponibilidad

**Épica:** EP-02  
**Historia:** Como cliente, quiero buscar habitaciones por fechas y número de huéspedes para visualizar solamente opciones realmente disponibles.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. La fecha de salida debe ser posterior a la fecha de entrada.
2. La ocupación solicitada no puede superar la capacidad de la habitación.
3. Se excluyen habitaciones ocupadas, reservadas, bloqueadas, sucias o en mantenimiento.
4. No se presentan cruces con reservas activas del mismo rango.
5. Web y móvil consultan la misma información.

**Rama:** `feature/HOTEL-4-disponibilidad`  
**Requisitos relacionados:** RF15, RF16, RF17, RF25, RNF02 y RNF09.

### HOTEL-5 Creación de reserva por el cliente

**Épica:** EP-03  
**Historia:** Como cliente, quiero reservar una habitación disponible desde web o móvil para asegurar mi alojamiento.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El cliente selecciona fechas, habitación y cantidad de huéspedes.
2. El sistema vuelve a validar disponibilidad antes de guardar.
3. Se calcula la cantidad de noches y el total estimado.
4. Se genera un código de reserva único.
5. La reserva aparece en las plataformas web y móvil.

**Rama:** `feature/HOTEL-5-reserva-cliente`  
**Requisitos relacionados:** RF18, RF20, RF21, RF25 y RF54.

### HOTEL-6 Gestión de reservas por personal

**Épica:** EP-03  
**Historia:** Como recepcionista, quiero crear, consultar, confirmar, modificar y cancelar reservas para atender solicitudes presenciales o administrativas.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El personal autorizado consulta y filtra las reservas.
2. Puede crear una reserva manual para un cliente.
3. Puede asignar o cambiar una habitación disponible.
4. Puede confirmar, cambiar fechas o cancelar según las reglas definidas.
5. Los cambios quedan visibles para el cliente y en auditoría cuando corresponda.

**Rama:** `feature/HOTEL-6-gestion-reservas`  
**Requisitos relacionados:** RF19, RF22, RF23, RF24 y RF26.

### HOTEL-7 Administración de habitaciones

**Épica:** EP-02  
**Historia:** Como administrador, quiero registrar y actualizar habitaciones, tipos, fotografías y estados para mantener correcto el inventario hotelero.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. Se puede crear una habitación con número único y tipo válido.
2. Se pueden editar sus datos, fotografías y disponibilidad en línea.
3. Los cambios de estado afectan la disponibilidad.
4. Una habitación bloqueada o en mantenimiento no se ofrece al cliente.

**Rama:** `feature/HOTEL-7-gestion-habitaciones`  
**Requisitos relacionados:** RF08 a RF12 y RF55.

### HOTEL-8 Check-in hotelero

**Épica:** EP-04  
**Historia:** Como recepcionista, quiero registrar el check-in de una reserva válida para formalizar el ingreso del huésped y ocupar la habitación.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Solo se muestran reservas aptas para check-in.
2. No se permite ingresar una reserva cancelada.
3. No se permite ingresar a una habitación sucia o en mantenimiento.
4. El sistema permite confirmar huéspedes y observaciones.
5. La reserva pasa a `checkin` y la habitación a `ocupada`.

**Rama:** `feature/HOTEL-8-checkin`  
**Requisitos relacionados:** RF27, RF35, RF36 y RF37.

### HOTEL-9 Check-out hotelero

**Épica:** EP-04  
**Historia:** Como recepcionista, quiero registrar el check-out para cerrar la estadía, controlar el saldo y enviar la habitación a limpieza.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Se muestran reservas que se encuentran en estadía.
2. Antes de finalizar se informa cualquier saldo pendiente.
3. El check-out actualiza la reserva y marca la habitación como sucia.
4. Se genera una tarea de limpieza asociada a la habitación.

**Rama:** `feature/HOTEL-9-checkout`  
**Requisitos relacionados:** RF38, RF39 y RF40.

### HOTEL-10 Registro y control de pagos

**Épica:** EP-05  
**Historia:** Como personal de caja o cliente, quiero registrar pagos de una reserva para conocer el monto pagado y el saldo pendiente.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El pago queda asociado a una reserva y un método válido.
2. El sistema permite pagos parciales y totales.
3. El saldo se recalcula después de cada movimiento.
4. El estado queda `parcial` o `pagado` según el resultado.
5. No se duplica una operación crítica al reenviar la solicitud.
6. El cliente puede consultar el detalle y comprobante disponible.

**Rama:** `feature/HOTEL-10-pagos`  
**Requisitos relacionados:** RF29 a RF34 y RNF10.

### HOTEL-11 Flujo de housekeeping

**Épica:** EP-06  
**Historia:** Como personal de housekeeping, quiero consultar, iniciar y completar mis tareas con un checklist para devolver las habitaciones limpias a operación.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El personal visualiza las tareas asignadas y su prioridad.
2. Puede iniciar una tarea pendiente.
3. Puede actualizar el checklist de limpieza.
4. Puede completar la tarea o marcarla como observada.
5. El estado de la habitación se actualiza según el resultado.
6. Un supervisor puede aprobar, rechazar o reasignar la tarea.

**Rama:** `feature/HOTEL-11-housekeeping`  
**Requisitos relacionados:** RF40 a RF43 y RF54.

### HOTEL-12 Gestión de incidencias

**Épica:** EP-06  
**Historia:** Como empleado del hotel, quiero registrar y dar seguimiento a incidencias para que los problemas de habitaciones o reservas sean atendidos.  
**Prioridad:** Media  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. La incidencia registra categoría, prioridad, descripción y relación con habitación o reserva.
2. Se puede adjuntar evidencia cuando la interfaz lo permita.
3. El personal autorizado cambia el estado de la incidencia.
4. Al cerrarla se conserva la solución y fecha correspondiente.

**Rama:** `feature/HOTEL-12-incidencias`  
**Requisitos relacionados:** RF44, RF45 y RNF20.

### HOTEL-13 Pre check-in móvil

**Épica:** EP-07  
**Historia:** Como cliente con una reserva próxima, quiero completar mis datos de pre check-in para reducir el tiempo de atención al llegar al hotel.  
**Prioridad:** Media  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Solo una reserva elegible permite iniciar el pre check-in.
2. El cliente completa y corrige los datos requeridos.
3. La información queda asociada a la reserva del cliente autenticado.
4. El personal puede utilizar los datos durante el ingreso.

**Rama:** `feature/HOTEL-13-precheckin`  
**Requisitos relacionados:** RF28 y RNF08.

### HOTEL-14 Notificaciones, avisos y buzón

**Épica:** EP-07  
**Historia:** Como usuario, quiero recibir avisos y comunicarme con el hotel para mantenerme informado sobre mis reservas, pagos y solicitudes.  
**Prioridad:** Media  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Se generan avisos relevantes por reserva o pago.
2. El usuario puede consultar y marcar notificaciones como leídas.
3. El cliente puede enviar un mensaje por el buzón.
4. El administrador puede consultar y responder mensajes.
5. Los anuncios vigentes se muestran respetando su período de publicación.

**Rama:** `feature/HOTEL-14-comunicaciones`  
**Requisitos relacionados:** RF46, RF47 y RF48.

### HOTEL-15 Servicios, favoritos y reseñas

**Épica:** EP-07  
**Historia:** Como cliente, quiero guardar habitaciones favoritas, solicitar servicios y publicar una reseña para personalizar mi experiencia con el hotel.  
**Prioridad:** Media  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El cliente puede agregar o quitar una habitación de favoritos.
2. Puede solicitar un servicio vinculado con su estadía.
3. Puede consultar el estado de sus solicitudes.
4. Solo puede reseñar una estadía válida según la regla del negocio.
5. El administrador puede moderar la visibilidad de reseñas.

**Rama:** `feature/HOTEL-15-experiencia-cliente`.

### HOTEL-16 Administración de personal y clientes

**Épica:** EP-08  
**Historia:** Como administrador, quiero consultar y gestionar personal y clientes para mantener actualizada la operación del hotel.  
**Prioridad:** Media  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El administrador consulta fichas de clientes con su historial permitido.
2. Puede consultar empleados activos y sus funciones.
3. Puede cambiar roles o estados con las autorizaciones correspondientes.
4. Puede revisar asistencia, programación y solicitudes de permiso.
5. Los cambios críticos quedan auditados.

**Rama:** `feature/HOTEL-16-personal-clientes`  
**Requisitos relacionados:** RF04, RF06, RF07, RF52 y RF53.

### HOTEL-17 Reportes y auditoría

**Épica:** EP-08  
**Historia:** Como administrador o supervisor, quiero consultar indicadores, reportes y auditoría para controlar la ocupación, las reservas, los pagos y las acciones críticas.  
**Prioridad:** Media  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. El dashboard resume datos operativos relevantes.
2. Los reportes permiten filtrar ocupación, reservas y pagos.
3. La auditoría registra usuario, acción, fecha y registro afectado.
4. Solo los roles autorizados acceden a esta información.
5. Los listados extensos aplican filtros o paginación.

**Rama:** `feature/HOTEL-17-reportes-auditoria`  
**Requisitos relacionados:** RF49 a RF53 y RNF24.

### HOTEL-18 Sincronización web y móvil

**Épica:** EP-09  
**Historia:** Como usuario del sistema, quiero que los cambios realizados en web o móvil se reflejen en la otra plataforma para trabajar con información consistente.  
**Prioridad:** Alta  
**Estimación:** 8 puntos

**Criterios de aceptación**

1. Web y móvil utilizan el mismo proyecto de Supabase.
2. Las operaciones críticas aplican las mismas reglas de negocio.
3. Reservas, pagos, estados e incidencias se reflejan en ambas plataformas.
4. Las políticas de acceso protegen los datos independientemente del cliente utilizado.

**Rama:** `feature/HOTEL-18-sincronizacion`  
**Requisitos relacionados:** RF54 y RNF19.

### HOTEL-19 Automatización de pruebas

**Épica:** EP-09  
**Historia:** Como desarrolladora, quiero mantener pruebas unitarias, de integración y E2E separadas y actualizadas para detectar regresiones antes de integrar cambios.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Vitest excluye los archivos E2E de Playwright.
2. Las 34 pruebas unitarias continúan aprobadas.
3. Los mocks y selectores de las pruebas de integración corresponden con la interfaz actual.
4. Los 15 casos de integración terminan correctamente.
5. Playwright se ejecuta mediante su comando independiente y genera evidencia.

**Rama:** `test/HOTEL-19-estabilizar-pruebas`.

### HOTEL-20 Trazabilidad Git y documentación de entrega

**Épica:** EP-09  
**Historia:** Como desarrolladora, quiero relacionar historias, ramas, commits y pull requests para demostrar de forma verificable cómo se construyó cada incremento.  
**Prioridad:** Alta  
**Estimación:** 5 puntos

**Criterios de aceptación**

1. Existe un repositorio remoto que contiene web, móvil y documentación o una separación explícita de repositorios.
2. La rama principal está protegida y el trabajo se realiza en ramas de historia.
3. Cada commit y pull request incluye la clave JIRA.
4. Cada historia contiene el enlace de su rama o pull request.
5. El README documenta instalación, arquitectura, variables de entorno y pruebas sin revelar secretos.

**Rama:** `docs/HOTEL-20-trazabilidad-entrega`.

## 6. Sprint completo propuesto para presentar

Debido a que la mayor parte de la funcionalidad ya existe pero la trazabilidad no, el sprint más defendible es un **Sprint de estabilización y entrega del incremento**. No conviene marcarlo como terminado hasta completar todas las evidencias.

### Objetivo del sprint

Dejar el sistema hotelero web y móvil compilable, probado, documentado y trazable mediante JIRA, Git y pull requests, listo para demostrar el incremento integrado.

### Capacidad individual

Para una desarrolladora se recomienda una capacidad de 18 a 22 puntos durante dos semanas. No se debe usar la velocidad de un equipo múltiple.

### Backlog del sprint

| Historia | Resultado esperado | Puntos | Estado inicial real |
|---|---|---:|---|
| HOTEL-19 | Separar Vitest/Playwright y corregir las 7 pruebas de integración | 5 | En progreso |
| HOTEL-20 | Crear trazabilidad completa y documentación técnica de entrega | 5 | Pendiente |
| HOTEL-2 | Verificar rutas y permisos de los roles principales | 5 | Funcional, pendiente de evidencia |
| HOTEL-18 | Validar operaciones compartidas entre web y móvil | 5 | Funcional, pendiente de prueba integral |
| Tarea técnica | Dividir el paquete web y actualizar el README | 2 | Pendiente |
| **Total** |  | **22** |  |

### Incremento resultante esperado

Al finalizar el sprint se presenta:

- plataforma web compilada para producción;
- aplicación móvil validada por TypeScript;
- suite unitaria y de integración aprobada;
- pruebas E2E ejecutadas por separado;
- acceso por roles verificado;
- sincronización de los flujos principales documentada;
- repositorio remoto con ramas y pull requests vinculados a JIRA;
- README y evidencia de la demostración actualizados.

### Demostración sugerida del incremento

1. Iniciar sesión como cliente.
2. Buscar disponibilidad y crear una reserva.
3. Confirmar desde el panel de personal o administración.
4. Registrar un pago y observar el saldo.
5. Realizar check-in y check-out.
6. Mostrar la tarea generada para housekeeping en móvil.
7. Completar la limpieza y verificar el nuevo estado en web.
8. Consultar auditoría, reportes o notificaciones relacionadas.
9. Mostrar el resultado de compilación y pruebas.
10. Abrir la historia de JIRA y su pull request vinculado.

## 7. Estrategia de ramificación

### Estrategia elegida

Se propone un GitFlow simplificado:

- `main`: versiones estables que pueden demostrarse o entregarse.
- `main`: incremento estable e integrado del sprint.
- `feature/HOTEL-n-descripcion`: funcionalidad asociada a una historia.
- `fix/HOTEL-n-descripcion`: corrección funcional.
- `test/HOTEL-n-descripcion`: pruebas o estabilización.
- `docs/HOTEL-n-descripcion`: documentación.
- `release/v1.0.0`: preparación final de una versión cuando sea necesario.
- `hotfix/HOTEL-n-descripcion`: corrección urgente sobre una versión publicada.

### Fundamento de uso

Aunque solo existe una desarrolladora, las ramas permiten:

- aislar cada historia y evitar que un cambio incompleto dañe la versión estable;
- relacionar el trabajo con JIRA;
- revisar el diff antes de integrar;
- revertir una historia de forma independiente;
- demostrar un proceso profesional y reproducible;
- preparar el repositorio para futuros colaboradores.

No se recomienda un GitFlow completo con ramas permanentes y ceremonias innecesarias. Para una persona basta `main` y ramas breves por historia, siguiendo GitHub Flow.

### Convención de commits

Formato:

```text
tipo(HOTEL-n): descripción breve
```

Ejemplos:

```text
feat(HOTEL-11): agregar checklist de limpieza móvil
fix(HOTEL-4): excluir habitaciones bloqueadas de disponibilidad
test(HOTEL-19): actualizar mocks de pagos
docs(HOTEL-20): documentar flujo de ramas y pull requests
```

## 8. Vinculación de ramas con JIRA

Para cada historia:

1. Crear la historia en JIRA y obtener su clave real.
2. Moverla a `En progreso`.
3. Crear la rama incluyendo exactamente la clave, por ejemplo `test/HOTEL-19-estabilizar-pruebas`.
4. Incluir la clave en cada commit.
5. Abrir un pull request cuyo título comience con la clave.
6. Pegar el enlace del pull request en la historia si la integración de JIRA no lo agrega automáticamente.
7. Mover a `En revisión`, luego a `En pruebas` y finalmente a `Finalizada`.

Una captura válida debe mostrar la historia, su clave, la rama o el pull request y su estado. Una rama escrita solamente en el informe no sustituye la evidencia real del repositorio.

## 9. Pull requests cuando existe una sola programadora

Cada historia debe pasar por un pull request desde su rama hacia `main`. La misma desarrolladora puede realizar una auto-revisión estructurada porque el objetivo es comprobar calidad y conservar evidencia, no simular otra persona.

### Plantilla de pull request

```markdown
## Historia JIRA
[HOTEL-n](enlace-a-la-historia)

## Objetivo
Explicar el valor que entrega la historia.

## Cambios realizados
- Cambio 1
- Cambio 2

## Criterios de aceptación comprobados
- [ ] Criterio 1
- [ ] Criterio 2

## Pruebas
- Comando ejecutado:
- Resultado:

## Evidencia
Capturas o video del flujo.

## Lista de revisión
- [ ] No se incluyeron secretos ni archivos `.env`.
- [ ] El proyecto compila.
- [ ] Las pruebas relacionadas pasan.
- [ ] La historia y el PR usan la misma clave JIRA.
```

### Flujo del pull request

`rama de historia` → pull request → auto-revisión → pruebas → integración a `main` → cierre de la historia y presentación del incremento.

## 10. Decisión sobre el uso de fork

**No se utilizará fork.**

El proyecto es desarrollado por una sola persona y no existen colaboradores externos que necesiten trabajar desde una copia independiente. Las ramas del mismo repositorio ofrecen el aislamiento, la trazabilidad y los pull requests requeridos con menor complejidad.

Un fork sería apropiado si el repositorio perteneciera a otra organización, si la desarrolladora no tuviera permisos de escritura o si participaran colaboradores externos. En la situación actual duplicaría el repositorio y complicaría la sincronización sin aportar control adicional.

## 11. Evidencias que deben adjuntarse a la presentación

- Tablero JIRA con sprint, historias, estimaciones y estados.
- Detalle de una historia con criterios de aceptación.
- Rama real cuyo nombre contiene la clave JIRA.
- Historial de commits con esa misma clave.
- Pull request con descripción, pruebas y checklist.
- Resultado del build web.
- Resultado de TypeScript móvil.
- Resultado de pruebas unitarias, integración y E2E.
- Demostración del flujo integrado entre cliente, personal y housekeeping.
- Pantalla de reportes o auditoría como evidencia del incremento.
- Cierre del sprint con historias terminadas y puntos completados.

## 12. Guion breve para exponer

> El proyecto es un sistema hotelero web y móvil conectado a una base de datos central en Supabase. Aunque fue desarrollado individualmente durante cinco meses, se aplicó una estrategia de ramas breves por historia para aislar cambios y mantener trazabilidad con JIRA. Cada rama y commit usa la clave de la historia y se integra mediante pull request con auto-revisión y pruebas. No se empleó fork porque no existen colaboradores externos ni restricciones de escritura; en este contexto añadiría complejidad sin beneficio. El sprint presentado se orienta a estabilizar y documentar el incremento existente, que cubre desde la reserva hasta el check-out, housekeeping y control administrativo.

## 13. Observación final de integridad académica

Las historias representan funcionalidades reales identificadas en el código y en la matriz de requerimientos. Las tres ramas de entrega y sus pull requests existen en el repositorio remoto y fueron integrados a `main`. La historia `HOTEL-28` permanece en curso para no presentar como finalizadas las pruebas de integración que todavía requieren estabilización; el resto del incremento del sprint se encuentra en `Listo` y conserva evidencia verificable en JIRA y GitHub.
