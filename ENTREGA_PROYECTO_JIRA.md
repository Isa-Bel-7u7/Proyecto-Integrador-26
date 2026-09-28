# Proyecto integrador: control de versiones, Jira y sprint

## Descripción del proyecto

El proyecto es un sistema integral de gestión hotelera desarrollado por **Isa-Bel-7u7**. Está compuesto por:

- `hotel-system`: aplicación web creada con React, TypeScript y Vite.
- `HotelApp`: aplicación móvil creada con React Native, Expo y TypeScript.

Ambas aplicaciones comparten información mediante Supabase y permiten gestionar habitaciones, reservas, pagos, check-in, check-out, housekeeping, incidencias, clientes y reportes.

## 1. Estrategia de ramificación

Se utilizó una variante sencilla de **GitHub Flow**. La rama `main` contiene la versión integrada del proyecto y cada incremento se prepara en una rama independiente antes de incorporarlo mediante un pull request.

Los nombres siguen el formato:

```text
tipo/HOTEL-n-descripcion
```

- `feat/`: incorporación de una funcionalidad o aplicación.
- `fix/`: corrección de un problema.
- `docs/`: cambios de documentación.

Esta estrategia permite separar los cambios, revisar qué se incorporará a `main` y relacionar el trabajo con Jira.

## 2. Relación entre Jira, ramas y pull requests

| Historia Jira | Incremento | Rama | Pull request |
|---|---|---|---|
| `HOTEL-10` | Aplicación web | `feat/HOTEL-1-web-hotel-system` | [PR #1](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/1) |
| `HOTEL-11` | Aplicación móvil | `feat/HOTEL-2-mobile-hotel-app` | [PR #2](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/2) |
| `HOTEL-12` | Estrategia y evidencia | `docs/HOTEL-3-project-management` | [PR #3](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/3) |
| `HOTEL-28` | Pruebas automatizadas | `fix/HOTEL-28-pruebas-integracion` | [PR #6](https://github.com/Isa-Bel-7u7/Proyecto-Integrador-26/pull/6) |

Las primeras ramas se crearon antes de la importación definitiva del backlog. Jira utilizó las claves `HOTEL-1` a `HOTEL-9` para las épicas y asignó desde `HOTEL-10` a las historias. Por esa razón se conservaron los nombres originales de las ramas y la relación definitiva se registró en los pull requests.

## 3. Trabajo mediante pull requests

Cada rama se integró a `main` mediante un pull request. En cada PR se registraron el objetivo, la historia de Jira, los cambios realizados y las verificaciones correspondientes.

El proyecto fue desarrollado por una sola persona, por lo que la autora realizó la revisión antes de cada fusión. Los pull requests permiten conservar evidencia de la integración incluso cuando no existe un segundo programador.

### Decisión sobre el uso de fork

No se utilizó `fork` porque la desarrolladora es propietaria del repositorio y tiene permisos de escritura. Las ramas proporcionan el aislamiento necesario. Un fork sería conveniente para colaboradores externos que no tengan acceso directo al repositorio principal.

## 4. Sprint e incremento resultante

El **Sprint 5 - Entrega final** reúne los siguientes elementos:

| Historia | Resultado | Puntos |
|---|---|---:|
| `HOTEL-10` | Aplicación web integrada | 8 |
| `HOTEL-11` | Aplicación móvil integrada | 8 |
| `HOTEL-12` | Estrategia y trazabilidad documentadas | 5 |
| `HOTEL-28` | Pruebas de integración estabilizadas | 8 |
| `HOTEL-29` | Integración de información web y móvil | 8 |

El incremento resultante contiene la aplicación web y la aplicación móvil dentro del repositorio general, las historias organizadas en Jira y la evidencia de integración mediante ramas y pull requests.

### Verificación del incremento

- La aplicación web compila correctamente para producción.
- Las 49 pruebas ejecutadas con Vitest finalizan correctamente.
- Playwright reconoce 15 escenarios E2E separados de las pruebas de Vitest.
- La aplicación móvil supera la comprobación de TypeScript.
- Los archivos `.env` y las credenciales no se publican en GitHub.
