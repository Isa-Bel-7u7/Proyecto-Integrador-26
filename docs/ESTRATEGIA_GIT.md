# Estrategia de ramificacion y colaboracion

## Contexto

El proyecto fue desarrollado individualmente por **Isa-Bel-7u7** durante cinco meses. Aunque existe una sola programadora, el flujo simula una practica profesional: ninguna funcionalidad se integra directamente sin una rama identificable y un pull request revisable.

## Modelo elegido

Se utiliza una variante liviana de **GitHub Flow**:

1. `main` conserva el incremento estable e integrable.
2. Cada bloque de trabajo nace desde `main` en una rama corta.
3. El nombre de la rama incluye la clave de Jira: `tipo/HOTEL-n-descripcion`.
4. Los commits siguen Conventional Commits y quedan firmados con la identidad Git de Isa-Bel-7u7.
5. La rama se publica y se integra mediante pull request.
6. Tras validar el incremento, la historia correspondiente se marca como lista en Jira.

Este modelo es adecuado para una desarrolladora porque mantiene trazabilidad sin introducir la sobrecarga de Git Flow. Tambien permite demostrar como escalar el mismo proceso si luego se incorporan mas integrantes.

## Tipos de rama

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat/` | Funcionalidad o incremento | `feat/HOTEL-1-web-hotel-system` |
| `fix/` | Correccion de un defecto | `fix/HOTEL-19-pruebas-integracion` |
| `docs/` | Documentacion y evidencias | `docs/HOTEL-3-gestion-proyecto` |
| `chore/` | Configuracion o mantenimiento | `chore/HOTEL-20-entrega` |

## Politica de pull requests

Cada pull request debe incluir objetivo, historia de Jira, cambios principales, evidencia de verificacion y riesgos pendientes. En este proyecto individual, la autora realiza una auto-revision explicita antes de fusionar. El PR no pretende fingir una segunda revisora: sirve como registro auditable del incremento y como punto de control antes de llegar a `main`.

## Decision sobre fork

No se usa `fork` porque la unica desarrolladora es propietaria del repositorio y tiene permisos directos. Un fork duplicaria el repositorio sin aportar aislamiento adicional. Las ramas ya separan el trabajo y los pull requests mantienen el control de integracion. Un fork si seria recomendable para colaboradores externos sin acceso de escritura o para contribuciones abiertas.

## Relacion con Jira y sprint

Las ramas y los PR incluyen claves `HOTEL-n`, lo que permite relacionarlos con sus actividades de Jira. El sprint final muestra el incremento integrado: aplicacion web, aplicacion movil y documentacion de gestion. Los elementos comprobados se cierran como `Listo`; los defectos de integracion o evidencias aun pendientes permanecen visibles en lugar de marcarse falsamente como terminados.

