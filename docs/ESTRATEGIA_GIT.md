# Estrategia de ramificación

## Contexto

El proyecto fue desarrollado individualmente por **Isa-Bel-7u7** durante cinco meses. Se utilizaron ramas para separar los cambios de la aplicación web, la aplicación móvil y la documentación antes de integrarlos en la versión principal.

## Modelo elegido

Se utilizó una variante sencilla de **GitHub Flow**:

1. `main` contiene la versión integrada del proyecto.
2. Cada incremento se prepara en una rama independiente.
3. El nombre de la rama identifica el tipo de cambio y su referencia de Jira.
4. Los commits siguen la convención Conventional Commits.
5. Los cambios se revisan e integran mediante un pull request.

Este flujo permite comprobar qué cambios pertenecen a cada incremento y evita trabajar directamente sobre `main`.

## Tipos de rama

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat/` | Funcionalidad o incremento | `feat/HOTEL-1-web-hotel-system` |
| `fix/` | Corrección de un defecto | `fix/HOTEL-28-pruebas-integracion` |
| `docs/` | Documentación | `docs/HOTEL-12-clean-repository` |

## Política de pull requests

Cada pull request indica su objetivo, la historia de Jira relacionada, los cambios principales y las verificaciones realizadas. Al tratarse de un proyecto individual, la misma autora revisa los cambios antes de fusionarlos con `main`.

## Decisión sobre fork

No se utilizó `fork` porque la desarrolladora es propietaria del repositorio y tiene acceso de escritura. Las ramas ya proporcionan la separación necesaria. Un fork sería apropiado para colaboradores externos sin acceso directo al repositorio.

## Relación con Jira

Las ramas y los pull requests se relacionan con las historias `HOTEL-10`, `HOTEL-11` y `HOTEL-12`. Los nombres originales de las primeras ramas se conservaron porque fueron creadas antes de la importación definitiva del backlog en Jira; la relación final quedó registrada en los pull requests correspondientes.

