---
name: tk
description: "Estado de alto nivel del proyecto en el gestor de tareas tk (tacks): qué es una tarea y una subtarea, cuándo se escribe en tk y cuándo no, y las trampas verificadas del binario. Úsala cuando se pida registrar, consultar o actualizar tareas del proyecto."
---

# tk — el estado de alto nivel del proyecto

`tk` es el gestor de tareas del proyecto: un binario de terceros (tacks) con una
base SQLite local. Aquí se usa para **una sola cosa**: dejar registrado en qué
estado está el trabajo, de forma que se pueda supervisar de un vistazo.

No es un registro del día a día. Todo lo demás sigue donde siempre: el estado
vivo en `PRD.md` y `CHANGELOG.md`, los contratos y las decisiones en `docs/`, los
pasos de la sesión en la lista de tareas del propio agente, y la memoria
persistente en su sitio.

## Dónde está

| Qué | Dónde |
|---|---|
| Binario | `tk/tk.exe` (Windows), `tk/tk` (Linux) |
| Base de tareas | `tk/.tacks/tacks.db` — **no se versiona** |
| Vista | `npm run server`, en el 8890 |

Se invoca siempre con `--json` y con `--db` explícito, para no depender del
directorio de trabajo:

```bash
tk/tk.exe --db tk/.tacks/tacks.db --json stats
```

## Cómo funciona (verificado en tk 0.2.4)

- **Jerarquía.** Una tarea de nivel superior es un bloque del proyecto; una
  subtarea (`--parent`) es un frente de trabajo, y puede cruzar varias sesiones.
  Los ID son `tk-XXXX` y `tk-XXXX.N`. `--parent none` promueve a nivel superior.
- **La primera subtarea etiqueta el padre como `epic`** automáticamente. No está
  verificado que la etiqueta se retire al promover la última subtarea.
- **No hay borrado.** Lo máximo es cerrar, con motivo: `done`, `duplicate`,
  `absorbed`, `stale` o `superseded`.
- **No hay reabrir.** Se usa `update <id> -s open`; el motivo de cierre anterior
  se conserva en la base.
- **Cerrar con subtareas abiertas falla.** Requiere `--force`, que no se usa. Es
  la garantía de que un bloque no se da por terminado con trabajo vivo dentro.
- **`--claim` fija `assignee = "agent"`**, sin poder elegir nombre: no sirve para
  saber qué agente hizo qué.
- **La prioridad no está validada** por el binario: acepta cualquier entero.
- **`blocked` no se almacena**: se calcula.
- **`notes` se sobrescribe** (contexto vivo); los comentarios son *append-only*
  (historial).
- **`dep add` y `dep remove` no devuelven JSON**: el éxito se decide por código
  de salida.

## Cómo usarlo

**Se escribe poco.** Solo cuando cambia el estado de alto nivel: nace una tarea,
se cierra, queda esperando una decisión, o cambia una decisión importante. Si el
estado no cambia, no se escribe nada — el silencio es correcto.

**El criterio de entrada es la vista:** si no se quiere ver de un vistazo en el
tablero, no entra.

- **Tarea de nivel superior**: un bloque del proyecto («crear el frontend»).
- **Subtarea**: un frente de ese bloque, de los que salen cinco o seis. No se
  crean por trabajo derivado menor; eso es un paso de la sesión, no una tarea.
- **Hallazgo incidental**: lo que se ve roto mientras se hace otra cosa va como
  nota o comentario en la tarea donde se vio. Solo pasa a subtarea si puede
  impedir cerrar el padre.
- **`notes` es el relevo** entre sesiones: ahí va qué falta y de quién, porque se
  sobrescribe y siempre refleja el estado actual. Los comentarios son el registro
  de cómo se llegó hasta ahí.
- **El cierre lo valida el usuario.** El agente propone; no cierra por su cuenta.

**Para leer el estado**, `stats` y `ready --limit 1` bastan. `prime` vuelca el
_backlog_ entero y es caro.

**Lo que no se hace sin orden explícita:** repriorizar, reorganizar el árbol de
padres, cerrar en bloque, o crear tareas que nadie ha pedido.

**Regla de oro:** si no cabe en una línea, ese detalle no pertenecía a tk.
