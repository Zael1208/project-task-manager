# Contratos

Este documento es la referencia normativa de los contratos compartidos por más
de un archivo. Si el código cambia uno de ellos, actualice este documento en el
mismo cambio.

## Modelo de tarea de la UI

[`mapTask()`](../src/shared/tasks/task-model.js) acepta un objeto parcial y
siempre devuelve una tarea utilizable por la presentación.

| Campo | Tipo estable | Valor por defecto | Notas |
|---|---|---|---|
| `id` | `string` | `''` | Identificador TK |
| `title` | `string` | `''` | Título visible |
| `description` | `string` | `''` | Descripción corta |
| `priority` | `string` | `'2'` | Valores `'0'` a `'3'` para selects y filtros |
| `status` | `string` | `'open'` | Normalmente `open`, `in_progress`, `done` o `blocked` |
| `parentId` | `string \| null` | `null` | Alias normalizado de `parent_id` o `parentId` |
| `chips` | `string[]` | `[]` | Procede de `tags` o, como compatibilidad de entrada, `chips` |
| `kind` | `string` | `'task'` | `epic`, `subtask` o `task` |
| `type` | `string` | `'Tarea'` | Etiqueta localizada de `kind` |
| `icon` | `string` | `'T'` | `E`, `S` o `T` |
| `blockers` | `TaskRelation[]` | `[]` | Tareas que bloquean a esta |
| `dependents` | `TaskRelation[]` | `[]` | Tareas bloqueadas por esta |
| `comments` | `TaskComment[]` | `[]` | Comentarios normalizados |

El mapper conserva otros campos de TK mediante `...rest`, por ejemplo `notes` o
`assignee`, pero elimina `parent_id` y `tags`. Los consumidores deben usar
`parentId` y `chips`.

```text
TaskRelation = { id: string, title: string }
TaskComment  = { body: string, author: string, createdAt: string }
```

Una relación puede llegar como ID, `{ id, title }`, `{ parent_id, title }` o
`{ child_id, title }`. Un comentario puede llegar como texto o como objeto con
`body`/`text` y `created_at`/`createdAt`.

El árbol agrega en tiempo de cálculo `level: number` y `children: boolean`; esos
campos no forman parte de la respuesta API ni del mapper base.

### Forma real devuelta por `tk`

Campos verificados contra `tk` 0.2.4. `list` devuelve exactamente esto:

```text
Task = {
  id: string,                 // "tk-1339" | "tk-1339.4"
  title: string,
  description: string | null,
  status: 'open' | 'in_progress' | 'done',
  priority: number,           // sin validar en origen: acepta 4 y superiores
  assignee: string | null,
  parent_id: string | null,
  tags: string[],
  created_at: string,         // ISO 8601 con nanosegundos
  updated_at: string,
  close_reason: string | null,
  notes: string | null
}
```

`show` añade `blockers`, `dependents`, `children` y `comments`
(`{ id, task_id, body, created_at }`). Las relaciones llegan como **objetos de
tarea completos**, no como `{ id, title }`: el mapper es quien los reduce.

`status` nunca vale `blocked` en la respuesta de `tk`: ese estado lo añade el
servidor (véase [architecture.md](architecture.md)).

## Etiquetas y colores

```text
Tag = {
  name: string,
  description: string,
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'red',
  uses: number
}
```

El servidor garantiza valores por defecto para descripción y color al listar.
`uses` se calcula a partir de las tareas. La UI ordena el catálogo por nombre y
usa azul como reserva si no reconoce un color.

La comparación administrativa de nombres normaliza NFC, espacios exteriores y
mayúsculas/minúsculas, pero **conserva las diferencias de acentos**: `Revision` y
`Revisión` son etiquetas distintas.

Validación al crear o editar: nombre obligatorio y de 40 caracteres como máximo;
descripción de 90 como máximo; color dentro de la lista permitida.

### Tabla `tag_metadata`

Base propia del proyecto (`data/task-manager.db`), no la de `tk`.

```sql
CREATE TABLE IF NOT EXISTS tag_metadata (
  name        TEXT PRIMARY KEY COLLATE NOCASE,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
```

## Borradores

Los borradores pertenecen al estado raíz. Los componentes emiten un objeto nuevo
al modificar un campo.

```text
NewTaskDraft = {
  title: string,
  description: string,
  priority: string,
  parent: string,
  tags: string[]
}

EditTaskDraft = {
  title: string,
  description: string,
  notes: string,
  assignee: string,
  tags: string[]
}

TagDraft = {
  name: string,
  description: string,
  color: string
}
```

Antes de enviar, las acciones recortan texto, convierten prioridad a número y
copian arrays de etiquetas.

## Preferencias de interfaz

La interfaz guarda las preferencias locales en `localStorage` con la clave
`project-task-manager.ui-preferences.v1`. El valor es un objeto JSON con
`version: 1` y puede contener `activeTaskFilter`, `currentPeriod`,
`activeInspectorTab`, `selectedTaskId`, `advancedStatuses`,
`advancedPriorities`, `advancedTags`, `quickTagFilter`, `taskSearchQuery`,
`expandedIds`, `collapsedIds` y `areTaskChipsVisible`.

Solo se guardan esos campos. La lectura valida la versión, los valores
enumerados, los tipos y los arrays antes de aplicarlos; un estado ilegible o
incompatible conserva los valores iniciales. La ausencia o el bloqueo de
`localStorage` no impide usar la interfaz. Las tareas y los borradores nunca
forman parte de este estado.

## Cliente HTTP

Todos los métodos usan JSON y rutas relativas al mismo origen, más un canal SSE
(`/api/events`) documentado abajo.

| Método del cliente | HTTP | Ruta | Cuerpo |
|---|---|---|---|
| `listTasks()` | GET | `/api/tk/list` | Ninguno |
| `listTags()` | GET | `/api/tags` | Ninguno |
| `showTask(id)` | GET | `/api/tk/show/:id` | Ninguno |
| `createTask(task)` | POST | `/api/tk/create` | Borrador normalizado |
| `updateTask(id, changes)` | POST | `/api/tk/update` | `{ id, changes }` |
| `closeTask(id)` | POST | `/api/tk/close` | `{ id, reason: 'done' }` |
| `addTaskDependency(childId, parentId)` | POST | `/api/tk/dep` | `{ child_id, parent_id }` |
| `removeTaskDependency(childId, parentId)` | POST | `/api/tk/dep-remove` | `{ child_id, parent_id }` |
| `addTaskComment(id, body)` | POST | `/api/tk/comment` | `{ id, body }` |
| `createTag(tag)` | POST | `/api/tags` | `TagDraft` |
| `updateTag(name, tag)` | PUT | `/api/tags/:name` | `TagDraft` |
| `deleteTag(name)` | DELETE | `/api/tags/:name` | Ninguno |

### Eventos SSE

La interfaz abre `EventSource('/api/events?clientId=...')` y envía el mismo
identificador en la cabecera `X-Client-Id` de sus peticiones HTTP. El servidor
mantiene la conexión abierta y publica el evento `workspace.changed` después de
cada mutación HTTP confirmada por esta aplicación y cuando detecta una escritura
externa en la base `tacks.db`:

```text
event: workspace.changed
data: {"resource":"tasks"|"tags","source":"http"|"external","originClientId":"browser-a","changes":[{"id":"tk-123","action":"actualizada","title":"Preparar informe"}]}
```

`changes` contiene una entrada por tarea afectada (`creada`, `actualizada`,
`cerrada` o `eliminada`) en los eventos de tareas. `originClientId` solo aparece
cuando la mutación HTTP procede de un navegador identificado. El cliente vuelve a
consultar `/api/tk/list` y `/api/tags` cuando recibe el evento; el navegador
originador conserva su confirmación local y los demás navegadores muestran un
aviso por tarea en la esquina inferior derecha, con ID, acción, título y
confirmación de recarga. Los eventos externos no tienen originador y se avisan en
todos los navegadores. El servidor vigila la base y sus sidecars `-wal`/`-shm` con
`fs.watchFile`, agrupa escrituras próximas de SQLite y evita volver a publicar como
externas las firmas producidas por sus propias mutaciones HTTP. La interfaz
recarga y avisa aunque el evento llegue mientras la carga inicial siga en curso.
La reconexión la gestiona el comportamiento nativo de `EventSource`.

Endpoints adicionales que la interfaz todavía no consume, disponibles para
paneles y futuras vistas:

| HTTP | Ruta | Devuelve |
|---|---|---|
| GET | `/api/tk/active-count` | `{ count }` |
| GET | `/api/tk/stats` | `{ by_status, by_priority, by_tag }` |
| GET | `/api/tk/ready` | Tareas sin bloqueos abiertos |
| GET | `/api/tk/epic` | Progreso de las tareas con el tag `epic` |
| GET | `/api/tk/blocked` | Tareas con bloqueantes abiertos |
| GET | `/api/tk/children/:id` | Subtareas |
| GET | `/api/tags/:name/affected` | `{ total, tasks: [{ id, title }] }` |

### Errores

El servidor comunica un error de TK con **estado HTTP 200 y `{ error: string }`**.
El cliente considera error tanto `!response.ok` como `data.error`.

| Código | Uso |
|---|---|
| 200 | Éxito, y también error de `tk` en el cuerpo |
| 201 | Etiqueta creada |
| 400 | JSON inválido, campo obligatorio ausente o validación fallida |
| 404 | Etiqueta no encontrada; capacidad de tareas deshabilitada |
| 409 | Duplicado, o fallo en una operación en cascada |
| 500 | Fallo al guardar metadatos |
| 503 | `tk` no disponible al listar tareas |

`ApiError` expone:

```text
name: 'ApiError'
message: string
unavailable: boolean
```

`unavailable` solo identifica la respuesta 404 que declara deshabilitada la
capacidad de tareas. `workspaceUi.handleError()` traduce ese caso al aviso de
capacidad no disponible; los demás errores usan el aviso de operación.

## Retornos asíncronos

`reloadWorkspace()` tiene tres resultados intencionados:

| Retorno | Significado |
|---|---|
| `true` | Tareas, etiquetas y detalle quedaron confirmados |
| `false` | La petición vigente falló y el error se presentó |
| `null` | La petición quedó obsoleta frente a otra recarga |

`mutate()` devuelve la respuesta de escritura al confirmar la API, y `null` si la
clave ya estaba ocupada o la escritura falló. Una respuesta no nula no garantiza
que la recarga posterior haya funcionado; en ese caso `errorMessage` explica la
confirmación parcial.

## Claves busy

Las claves son parte del contrato entre estado y componentes.

| Patrón | Operación |
|---|---|
| `create` | Crear tarea |
| `detail:<taskId>` | Cargar detalle |
| `edit:<taskId>` | Guardar edición |
| `priority:<taskId>` | Cambiar prioridad |
| `status:<taskId>` | Cambiar estado |
| `close:<taskId>` | Cerrar tarea |
| `dep-add:<taskId>` | Añadir bloqueante a la tarea |
| `dep-remove:<relatedId>` | Retirar una relación |
| `comment:<taskId>` | Añadir comentario |
| `tag-save:<name>` | Crear o editar etiqueta |
| `tag-delete:<name>` | Eliminar etiqueta |

Cambiar un patrón exige actualizar tanto el método que ejecuta la acción como
todos los controles que consultan `busy(key)`.

## Contratos de componentes

| Componente | Entrada principal | Salida principal |
|---|---|---|
| `TaskList` | Tareas visibles, selección, expansión y `filterProps` | Eventos de lista reemitidos a la raíz |
| `TaskFilters` | Estado de filtros y catálogo | Copias de filtros y acciones de toolbar |
| `TaskRow` | Una tarea enriquecida y funciones visuales | Selección, expansión, campo y menú |
| `TaskInspector` | `taskInspectorProps`, cinco `v-model` y borradores | Un evento `action` más actualizaciones de modelos |
| `NewTaskDialog` | Borrador, tareas, etiquetas y busy | `update-draft`, `submit`, `close` |
| `TagManagerDrawer` | Catálogo, formulario y busy | Intenciones CRUD y copias del borrador |
| `TagPickerField` | `modelValue`, catálogo y colores | `update:modelValue` con un array nuevo |
| `OverflowMenu` | Apertura e items | `toggle` y `select(item.id)` |

`TaskList` es un intermediario: no cambia los argumentos de `TaskRow`, salvo
que reemite los eventos de varios argumentos de forma explícita.

## Modelos del inspector

`AppShell` enlaza estos pares:

| Prop | Evento | Estado raíz |
|---|---|---|
| `mobileOpen` | `update:mobileOpen` | `isMobileInspectorOpen` |
| `activeTab` | `update:activeTab` | `activeInspectorTab` |
| `editDraft` | `update:editDraft` | `editDraft` |
| `dependencyDraft` | `update:dependencyDraft` | `dependencyDraft` |
| `commentDraft` | `update:commentDraft` | `commentDraft` |

El evento de dominio usa el sobre:

```text
InspectorAction = {
  type: string,
  payload: object
}
```

Tipos admitidos por `handleInspectorAction()`:

| Tipo | Payload | Destino |
|---|---|---|
| `menu.toggle` | `{}` | Alternar menú |
| `edit.open` | `{}` | Abrir borrador de edición |
| `edit.cancel` | `{}` | Restaurar detalle confirmado |
| `edit.save` | `{}` | Guardar tarea |
| `task.copy` | `{}` | Copiar ID seleccionado |
| `task.close` | `{}` | Cerrar selección |
| `task.select` | `{ id }` | Cargar otra tarea |
| `task.update-field` | `{ id, field, value }` | Actualizar prioridad o estado |
| `subtask.open` | `{}` | Abrir alta con padre seleccionado |
| `dependency.add` | `{}` | Usar `dependencyDraft` |
| `dependency.remove-blocker` | `{ id }` | Retirar bloqueante |
| `dependency.remove-dependent` | `{ id }` | Retirar dependiente |
| `comment.add` | `{}` | Usar `commentDraft` |

Un tipo nuevo requiere cuatro cambios coordinados: emisión en el inspector,
declaración si cambia `emits`, despacho en `inspector.js` y prueba o validación
del caso de uso.

## Contrato del CLI `tk`

Aprendido de `tk` 0.2.4 y verificado ejecutándolo. No es negociable: `tk` es una
dependencia externa de solo lectura.

| Regla | Consecuencia |
|---|---|
| No existe borrado de tareas | Lo máximo es cerrar. No hay endpoint de borrado. |
| No existe «reabrir» | Se usa `update <id> -s open`. |
| Al reabrir, `close_reason` conserva el valor anterior | `tk` no tiene bandera para limpiarlo. El servidor lo normaliza: solo presenta el motivo cuando la tarea está cerrada. |
| `--claim` fija `assignee = "agent"` | No se puede elegir el nombre al reclamar. |
| Cerrar con hijas abiertas falla | Requiere `--force`; el servidor **nunca** lo añade por su cuenta. |
| La prioridad no está validada | Acepta cualquier entero (`-p 5` se guarda). El servidor valida 0-3, que es lo que la interfaz representa. |
| `dep add` / `dep remove` no devuelven JSON | Se decide por código de salida (`runTkText`). |
| `blocked` no se almacena | Lo calcula el servidor. |
| Una «épica» no es un tipo | Es una tarea con el tag `epic`. |
| `notes` se sobrescribe; los comentarios son append-only | Contexto mutable frente a historial. |

### Reglas que añade el servidor sobre `tk`

`tk` es de solo lectura para nosotros: su base no se toca. Cuando su
comportamiento deja un estado incoherente, la corrección se hace **al presentar
los datos**, no escribiendo en su base.

| Regla | Por qué |
|---|---|
| `close_reason` solo se presenta cuando `status` es `done` | `tk` no ofrece forma de limpiarlo al reabrir; sin esto, una tarea abierta mostraría el motivo `done`. **La base de `tk` conserva el valor**: mirándola por CLI se sigue viendo. |
| La prioridad debe ser un entero de 0 a 3 | `tk` acepta cualquiera, pero la interfaz solo representa cuatro niveles. Sin validar, un valor de 4 o superior creado por CLI se mostraría como «Sin prioridad» y no se podría volver a elegir. |
| `blocked` se calcula cruzando `list --all` con `blocked` | `tk` no almacena ese estado. |
