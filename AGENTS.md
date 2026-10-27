# AGENTS.md

Gestor de tareas local: servidor Node sin framework que sirve una interfaz Vue 3
y delega las tareas en el CLI de terceros `tk` (tacks). Todo el texto del repo
y de los mensajes está en español.

## Comandos

```bash
npm ci                      # instalar (no hay node_modules inicial)
npm run server              # servidor en http://localhost:8890/task-manager/app-vue.html
npm run dev                 # igual, con --watch
npm run odd:tk -- stats     # ÚNICA vía válida para invocar el CLI tk
```

- Puerto por defecto 8890; para otra instancia: `$env:PORT=8891; npm run server`.
  `PORT=0` elige puerto libre (lo usan las pruebas de integración).
- **`npm test`, `npm run build` y `npm run docs:check` fallan hoy**: este checkout
  no contiene `src/` ni `tests/`, a los que esas scripts apuntan. El bundle ya
  construido está en `public/task-manager/app-vue.js`; no lo regeneres ni lo toques
  a mano.

## Estructura

- `server/index.js` — punto de entrada; rutas en `EXACT_ROUTES`/`PREFIX_ROUTES`.
- `server/tk.js` — única frontera con el binario `tk/tk.exe`. Envuelve siempre
  `--db <ruta>` explícito y timeout de 5s.
- `server/tasks.js` — handlers de `/api/tk/*`. Contrato que no se rompe: los
  errores de tk se devuelven **HTTP 200 con `{ error }`**, no 4xx/5xx.
- `server/tags.js` — catálogo de etiquetas en SQLite propio `data/task-manager.db`
  (vía `node:sqlite`). Es lo único que no depende de tk.
- `server/events.js` — SSE; los cambios externos de tk se detectan mirando su fichero.
- `public/` — interfaz y Vue vendorizado. `/` redirige a `/task-manager/app-vue.html`.

## Reglas duras

- No editar con SQL ninguna base SQLite de tareas (`tk/.tacks/tacks.db` pertenece
  al binario): solo por su CLI. `data/task-manager.db` sí es nuestro.
- Toda llamada a tk pasa por `npm run odd:tk -- ...` con salida JSON y `--db`
  explícito. Esa guardia (`scripts/odd-tk.cjs`) rechaza texto con estado de Git o
  de revisión en títulos/notas/comentarios: si tu comando sale con código 64, es
  el texto el que sobra, no la guardia.
- Ciclo de trabajo en tk: crear/seleccionar la tarea antes de tocar archivos,
  `in_progress`, notas durante, cerrar tras verificar. Detalles y trampas del CLI
  0.2.4 en `skills/tk/SKILL.md`; reglas de la carpeta binaria en `tk/AGENTS.md`.
- Sin `src/` no hay frontend que desarrollar: si toca cambiar la interfaz, se
  reconstruye antes el árbol de origen.

## Política de Git, Ramas y Worktrees

- **Épica (`epic`)**: Se desarrolla en un `git worktree` dedicado (ej. `.worktrees/<epic-id>-<slug>/` o ruta externa) para aislar cambios complejos sin contaminar el `main-tree`.
- **Subtarea de Épica**: Se trabaja en una rama dedicada dentro del worktree de la épica (`feature/<epic-id>/<subtask-id>-<slug>`).
- **Commits autónomos en worktree**: El agente tiene autonomía para hacer commits en la rama del worktree tras completar y verificar hitos o pasos.
- **Tarea Single (no épica ni subtarea)**: Se trabaja en una rama creada desde el `main-tree` (`fix/<task-id>-<slug>`, `chore/<task-id>-<slug>`).
- **Propuesta de commit en Tarea Single**: El agente propone el mensaje de commit y resumen de cambios, pero **NUNCA ejecuta el commit sin aprobación humana previa**.
- **Prohibido merge de worktree a main-tree sin aprobación humana**.
- **Prohibido comitear en ramas del main-tree sin aprobación humana**.
- **Gitflow**: Aplicar ramas `main`, `develop`, `feature/*`, `fix/*`, `chore/*`, `hotfix/*` según corresponda.
