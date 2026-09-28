# Sistema Integral de Gestion Hotelera

Proyecto integrador desarrollado por **Isa-Bel-7u7** para centralizar la operacion de un hotel desde dos clientes conectados a Supabase.

## Aplicaciones

- `hotel-system/`: aplicacion web construida con React, TypeScript y Vite.
- `HotelApp/`: aplicacion movil construida con React Native, Expo y TypeScript.

El sistema contempla autenticacion por roles, gestion de habitaciones y reservas, check-in/check-out, pagos, housekeeping, incidencias, comunicaciones, reportes y administracion.

## Ejecucion local

Cada aplicacion administra sus dependencias por separado:

```bash
cd hotel-system
npm install
npm run dev
```

```bash
cd HotelApp
npm install
npm start
```

Las credenciales de Supabase se mantienen en archivos `.env` locales y no se publican en GitHub.

## Gestion del proyecto

- Jira: espacio Scrum `HOTEL` — Sistema Integral de Gestion Hotelera.
- Estrategia Git: ramas cortas asociadas a historias de Jira y fusion mediante pull request.
- Convencion de commits: Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`).

La justificacion completa de ramas, pull requests y uso de fork se encuentra en [`docs/ESTRATEGIA_GIT.md`](docs/ESTRATEGIA_GIT.md).

