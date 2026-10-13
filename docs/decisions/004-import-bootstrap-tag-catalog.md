# ADR-004: Adoptar el catálogo de etiquetas de bootstrap-reports

- **Estado:** Aceptada
- **Fecha:** 2026-10-13

## Contexto

El repositorio necesita el catálogo de etiquetas que ya se usa en
`bootstrap-reports` para que el tablero ODD tenga sus nombres, colores y
metadatos. La base de destino está en `data/task-manager.db` y la base fuente
usa el mismo nombre elocuente.

Las tareas de tk no guardan una clave foránea hacia `tag_metadata`: guardan los
nombres de las etiquetas en `tacks.db`. Al cambiar o sustituir la base de
metadatos es posible que la interfaz deje de encontrar la descripción y el
color, aunque el nombre siga en la tarea. Por eso la migración debe comparar los
nombres antes de considerar el catálogo integrado.

## Decisión

Adoptar el catálogo de `bootstrap-reports/tk/data/task-manager.db` en
`data/task-manager.db`, conservando el nombre `task-manager.db`.

La migración seguirá este orden:

1. Validar que origen y destino tienen el esquema `tag_metadata` esperado.
2. Leer y validar todos los nombres, descripciones, colores y fechas del origen.
3. Importar los metadatos de forma idempotente en la base de destino.
4. Listar las tareas de tk mediante su CLI y conservar una instantánea de sus
   nombres de etiquetas antes de la importación.
5. Comprobar después que cada nombre de etiqueta de cada tarea tiene metadatos y
   que sus conteos de uso coinciden con el listado real.
6. Si una migración futura cambia nombres, retirar el nombre antiguo y añadir el
   nuevo mediante el CLI de tk; nunca editar `tacks.db` directamente.

La revinculación se verifica por el nombre de etiqueta y por la API pública
`GET /api/tags`; no se inventan identificadores compartidos entre las dos bases.

## Consecuencias

- El catálogo local incluye las etiquetas necesarias para ODD: `ODD`, `epic`,
  `chore`, `docs`, `feat`, `fix`, `improvement`, `refactor`, `style` y `test`.
- El cambio de base de metadatos no elimina las etiquetas de las tareas.
- La comprobación detecta cualquier tarea cuyo nombre no tenga metadatos.
- La base continúa siendo local y no versionada; esta migración se debe repetir
  de forma controlada en otro entorno.
- El nombre `task-manager.db` queda como contrato de configuración para
  `TAGS_DB`, README y documentación operativa.

## Alternativas consideradas

- Copiar la base sin comparar nombres: rechazada porque podría ocultar
  desvinculaciones.
- Editar `tacks.db` con SQL: rechazada porque la base pertenece a tk.
- Crear identificadores comunes entre ambas bases: rechazada porque tk solo
  expone nombres de etiquetas.
