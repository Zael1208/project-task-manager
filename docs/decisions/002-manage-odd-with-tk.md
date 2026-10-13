# ADR-002: Gestionar el ODD operativo con tk

- **Estado:** Aceptada
- **Fecha:** 2026-10-13

## Contexto

Este proyecto se desarrolló antes de adoptar el ODD de gentle-shell. El trabajo
operativo necesita sobrevivir entre sesiones y ser visible sin mantener un
segundo tablero en archivos Markdown. En `../bootstrap-reports` se ha adoptado
tk para ese propósito.

## Decisión

Usar tk como tablero operativo del ODD del proyecto.

- Una tarea de nivel superior representa un frente visible del proyecto.
- Una subtarea representa una unidad de trabajo que puede atravesar sesiones.
- Todo trabajo ODD recibe la etiqueta `ODD` y un único tipo principal.
- `notes` contiene el relevo actual y se sobrescribe cuando cambia.
- Los comentarios conservan la petición, las decisiones y las evidencias en
  orden append-only.
- Los bloqueos y dependencias viven en tk.
- El cierre de una tarea lo valida el usuario.

No se crearán nuevos archivos `odd/tasks/*.md` como tablero operativo. La
especificación estable vive en la documentación versionada y las decisiones
durables en ADRs.

## Consecuencias

- Al iniciar una sesión se consulta `stats` y `ready` con la base explícita.
- El estado de trabajo deja de duplicarse entre PRD, CHANGELOG y documentos de
  relevo.
- PRD conserva requisitos, alcance y estado funcional del producto.
- `docs/` conserva contratos, arquitectura y procedimientos estables.
- Engram conserva memoria contextual, pero no sustituye a tk.
- El estado de Git no se registra en tk: se consulta siempre con Git.

## Alternativas consideradas

- Mantener planes ODD en archivos Markdown: rechazada porque duplica el tablero y
  degrada el relevo entre sesiones.
- Usar PRD como tablero operativo: rechazada porque mezcla requisitos de producto
  con ejecución de tareas.
- Usar solo memoria persistente: rechazada porque no ofrece estados, dependencias
  ni una vista operativa compartida.
