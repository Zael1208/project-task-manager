---
name: tk
description: "Estado operativo ODD del proyecto en el gestor de tareas tk (tacks): cómo registrar frentes, subtareas, relevo, decisiones y evidencias sin duplicar el tablero en Markdown."
---

# tk — tablero operativo ODD

`tk` es el tablero operativo del proyecto. Se usa para que el trabajo sobreviva
entre sesiones y pueda supervisarse de un vistazo. No sustituye a Git, a los ADRs,
al PRD, a la documentación estable ni a Engram.

## Dónde está

| Qué | Dónde |
|---|---|
| Binario Windows | `tk/tk.exe` |
| Binario Linux/WSL | `tk/tk` |
| Base de tareas | `tk/.tacks/tacks.db` — no se versiona |
| Catálogo de etiquetas | `data/task-manager.db` — no se versiona |
| Vista | `npm run server`, en el puerto 8890 |

Las consultas y escrituras pasan por la guardia `odd:tk`, que conserva `--json` y
`--db` explícito y rechaza estado de Git en textos de tk:

```bash
npm run odd:tk -- stats
npm run odd:tk -- ready --limit 1
npm run odd:tk -- list --tag ODD
```

## Etiquetas

Todo trabajo del registro ODD lleva `ODD`. Una tarea de nivel superior lleva
también `epic`. Cada tarea recibe además un único tipo principal:

| Etiqueta | Uso |
|---|---|
| `docs` | Documentación, ADRs, registros e informes |
| `feat` | Capacidad o integración nueva |
| `fix` | Corrección de un defecto |
| `refactor` | Reorganización sin cambio de comportamiento |
| `test` | Pruebas, guardas y verificaciones |
| `style` | Presentación visual |
| `improvement` | Mejora de lectura o uso |
| `chore` | Configuración, dependencias y tareas administrativas |

Ejemplos:

```bash
npm run odd:tk -- create -t ODD,epic,chore "Nombre del frente"
npm run odd:tk -- create -t ODD,docs --parent tk-XXXX "Nombre de la subtarea"
```

## Qué se registra

Se escribe poco, solo cuando cambia el estado de alto nivel:

- **Tarea de nivel superior**: un frente visible del proyecto.
- **Subtarea**: una unidad de trabajo que puede atravesar sesiones.
- **`notes`**: relevo actual; se sobrescribe y contiene qué falta y cuál es el
  siguiente paso.
- **Comentarios**: petición literal, decisiones y evidencias append-only.
- **Dependencias**: bloqueos entre tareas que tk debe mostrar.

El estado de Git no se registra en tk: se consulta siempre con Git. No se
registran ramas, hashes, commits pendientes ni equivalentes en títulos,
descripciones, notas o comentarios.

Las decisiones durables se documentan en `docs/decisions/` y se enlazan desde
un comentario de tk. Los detalles estables de arquitectura viven en `docs/` y
los requisitos del producto en `PRD.md`.

No se crean nuevos registros ODD en `odd/tasks/*.md`. Los documentos Markdown
anteriores, si existieran, serían historia congelada, no el tablero actual.

## Ritmo de actualización

La tarea debe existir y reflejar el estado real mientras se trabaja, no solo al
final:

1. Crear o seleccionar la tarea tk antes de explorar o modificar archivos.
2. Marcarla `in_progress` antes de ejecutar la unidad de trabajo.
3. Actualizar `notes` cuando cambie el relevo o el siguiente paso.
4. Añadir comentarios cuando aparezcan decisiones, bloqueos o evidencias.
5. Cerrar la tarea inmediatamente después de observar su resultado y sus
   verificaciones.

Engram puede conservar contexto adicional, pero el relevo operativo debe quedar
en tk para que el proyecto no dependa de la memoria de una sesión.

## Trampas verificadas de tk 0.2.4

- La primera subtarea etiqueta automáticamente el padre como `epic`.
- No hay borrado. Una tarea se cierra con `done`, `duplicate`, `absorbed`,
  `stale` o `superseded`.
- No hay reapertura dedicada: se usa `update <id> -s open`.
- Cerrar con subtareas abiertas falla sin `--force`; no se usa `--force`.
- `--claim` fija `assignee = "agent"` y no permite elegir nombre.
- La prioridad no está validada por el binario; se usan solo los valores 0 a 3.
- `blocked` se calcula a partir de dependencias; no se almacena como estado
  permanente.
- `notes` sobrescribe el relevo; los comentarios son append-only.
- `dep add` y `dep remove` no devuelven JSON: el éxito se determina por el código
  de salida.

El cierre de una tarea se hace con la unidad de trabajo verificada. No se cierra
una tarea con trabajo pendiente ni se deja abierta una tarea cuyo trabajo ya está
listo para cerrar. El cierre lo valida el usuario.
