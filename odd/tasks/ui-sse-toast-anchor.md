# ODD: UI, SSE y Toast Anchor
Objetivo: corregir el plegado, añadir tooltips, actualizar mediante SSE y adoptar Toast Anchor para notificaciones y confirmaciones.
Rama: `feature/ui-sse-toast-anchor` · Estrategia: `feature-branch-chain` · Runner: `npm test`

## Specs

- **S1. Plegado y desplegado** — El usuario reportó literalmente: “Plegado y desplegado solo funciona en la pestaña Todas, en hechas por ejemplo no, en pendientes, en curso y bloqueadas no lo he podido probar.” La interfaz debe conservar el plegado y desplegado explícito de tareas padre en todas las pestañas y filtros soportados, con pruebas de regresión para las pestañas de estado.
- **S2. Tooltips** — El usuario pidió literalmente: “tooltips title, en botones del selector.” Los botones del selector deben exponer textos `title` coherentes con su acción y conservar nombres accesibles.
- **S3. Actualización** — El usuario pidió literalmente: “actualización mediante SSE”. El servidor y el cliente deben comunicar cambios confirmados mediante Server-Sent Events y el cliente debe actualizar el estado sin perder una selección válida ni introducir recargas obsoletas. Alcance decidido: emitir eventos para mutaciones HTTP confirmadas por esta aplicación; no observar cambios externos del CLI `tk` en esta unidad.
- **S4. Notificaciones y confirmaciones** — El usuario pidió literalmente: “adoptamos como sistema de notificaciones y confirmaciones. tema Dark studio. https://github.com/AakashAp01/toast-anchor.” La aplicación debe adoptar la API y el estilo Dark Studio de Toast Anchor para notificaciones y confirmaciones, manteniendo textos e interacción accesibles.

## Tasks

- **T1** — S1-S2 · inline · done · commit `f2187b8`. Corregir plegado en todas las pestañas y añadir `title` a los botones del selector; pruebas de estado y componentes en GREEN.
- **T2** — S3 · inline · done · commit `503a04c`. Diseñar e implementar SSE en server y cliente; probar stream, eventos y recarga segura. La reconexión queda a cargo del comportamiento nativo de `EventSource`.
- **T3** — S4 · inline · done · commit `574e604`. Integrar Toast Anchor con tema Dark Studio para toasts y confirmaciones; probar variantes y cancelación.
- **T4** — S1-S4 · inline · done · commit `efe5ddc`. Actualizar documentación, CHANGELOG y artefactos de build; ejecutar suite, build y verificación final.

## Log

- **L1** — “Pues abrimos nueva sesión con estos cambios en la UI y el server:

- Plegado y desplegado solo funciona en la pestaña Todas, en hechas por ejemplo no, en pendientes, en curso y bloqueadas no lo he podido probar.

- tooltips title, en botones del selector.

- actualización mediante SSE

- adoptamos como sistema de notificaciones y confirmaciones. tema Dark studio. https://github.com/AakashAp01/toast-anchor.”
- **L2** — Exploración inicial: `src/task-manager/state/task-tree.js:50,75` ignora `expandedIds` cuando hay filtros; `src/task-manager/state/task-actions.js:39-42` reconstruye todas las expansiones en cada recarga; no existe SSE en `src/` ni en el servidor. Toast actual: `src/task-manager/components/toast.js`, `src/task-manager/state/ui.js`, `src/task-manager/styles/components.css:709-752`; la confirmación de etiquetas es un diálogo local.
- **L3** — Investigación del enlace proporcionado: Toast Anchor es una librería vanilla sin dependencias con `toast.success/error/warning/info`, `toast.modal()` basado en Promise y configuración global de estilos. Se usará su API sin copiar su implementación al repositorio.
- **L4** — Decisión pendiente del usuario: determinar si SSE debe detectar también cambios externos hechos mediante el CLI `tk` o si solo debe emitir eventos para mutaciones HTTP de esta aplicación. No se implementará esta parte hasta resolver el alcance.
- **L5** — El usuario decidió: “Solo cambios de esta aplicación”. SSE emitirá eventos después de mutaciones HTTP confirmadas por este servidor y no observará cambios externos del CLI `tk` en esta unidad.
- **L6** — T1 RED observado con `npx vitest run tests/task-manager/state/task-tree.test.js tests/task-manager/state/task-actions.test.js`: fallaron el plegado filtrado y la conservación de un colapso tras recarga. Tras añadir `collapsedIds`, respetar el estado explícito y añadir tooltips, GREEN observado con `npx vitest run tests/task-manager/components/task-filters.test.js tests/task-manager/state/task-tree.test.js tests/task-manager/state/task-actions.test.js`: 3 ficheros, 15 pruebas correctas. Commit: `f2187b8`.
- **L7** — T2 RED observado con `npx vitest run tests/server/api.test.js tests/task-manager/state/workspace.test.js`: `/api/events` devolvía 404 y no existía la conexión EventSource. GREEN observado después con 2 ficheros y 14 pruebas correctas: el stream publica `workspace.changed` para tareas y etiquetas, y el cliente recarga y cierra el EventSource correctamente. La selección y las respuestas obsoletas siguen protegidas por `reloadRequestSequence`. Commit: `503a04c`.
- **L8** — T3 RED observado porque no existía el adapter Toast Anchor. GREEN observado con `npx vitest run tests/task-manager/notifications/toast-anchor.test.js tests/task-manager/components/tag-manager-drawer.test.js tests/task-manager/state/tag-actions.test.js tests/task-manager/state/ui.test.js tests/task-manager/state/task-actions.test.js`: 5 ficheros, 21 pruebas correctas. `npm run build` también terminó correctamente; la confirmación local y su CSS fueron retirados. Commit: `574e604`.
- **L9** — Para el acumulado superior a 400 líneas, el usuario eligió `feature-branch-chain`: mantener los commits como una cadena revisable en `feature/ui-sse-toast-anchor`; no hacer merge ni push.
- **L10** — T4 documental verificado: `npm test` terminó con 16 ficheros y 82 pruebas correctas; `npm run build` regeneró correctamente los artefactos públicos; `git diff --check` y los diagnósticos VS Code no reportaron errores. Documentación actualizada en CHANGELOG.md, PRD.md, docs/architecture.md, docs/contracts.md, docs/development.md y docs/operations.md. Commit: `efe5ddc`.
