# Sistema Integral de Gestión Hotelera

Proyecto integrador desarrollado por **Isa-Bel-7u7** para centralizar la operación de un hotel mediante una aplicación web y una aplicación móvil conectadas a Supabase.

## Aplicaciones

- `hotel-system/`: aplicación web construida con React, TypeScript y Vite.
- `HotelApp/`: aplicación móvil construida con React Native, Expo y TypeScript.

El sistema contempla autenticación por roles, gestión de habitaciones y reservas, check-in y check-out, pagos, housekeeping, incidencias, comunicaciones, reportes y administración.

## Ejecución local

Cada aplicación administra sus dependencias por separado.

### Aplicación web

```bash
cd hotel-system
npm install
npm run dev
```

### Aplicación móvil

```bash
cd HotelApp
npm install
npm start
```

Las credenciales de Supabase se mantienen en archivos `.env` locales y no se publican en GitHub. Cada aplicación debe configurarse con sus propias variables de entorno antes de ejecutarse.

## Gestión del proyecto

- Jira: proyecto Scrum `HOTEL` — Sistema Integral de Gestión Hotelera.
- Estrategia Git: ramas asociadas a historias de Jira e integración mediante pull request.
- Convención de commits: Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`).

La justificación de la estrategia de ramas y del uso de pull requests se encuentra en [`docs/ESTRATEGIA_GIT.md`](docs/ESTRATEGIA_GIT.md).

