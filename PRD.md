# PRD — Gestor de tareas local (Task Manager)

| Campo | Valor |
|---|---|
| Producto | Gestor de tareas local (nombre de trabajo: **Task Manager**) |
| Autor | Alfredo González Portero |
| Origen del código | `C:\PROJECT-CHAT-VOICE-AGENT`: `tk/`, `src/task-manager/`, `src/shared/tasks/`, `public/`, `tests/task-manager/`, `server.js` |
| Alcance del documento | Requisitos, alcance, criterios de aceptación y decisiones del producto. |

**Regla de este documento.** Aquí no se escribe nada que pueda quedar obsoleto: ni
cifras, ni tamaños, ni hashes, ni fechas de verificación, ni estados del trabajo,
ni tablas de progreso. Si un dato puede cambiar por sí solo, no vive aquí. El
estado del trabajo está en el tablero `tk`; el de la entrega, en Git y en
`CHANGELOG.md`; la deuda conocida, en [`docs/known-risks.md`](docs/known-risks.md);
y el detalle de arquitectura, contratos, operación y desarrollo, en `docs/`.

---

## 1. Resumen ejecutivo

El gestor de tareas es una aplicación Vue 3 que se apoya en `tk`, un binario local
de terceros (tacks), y en una capa HTTP propia. Nació dentro del servidor de
ChatVoiceAgent, y este proyecto lo mantiene como proyecto autónomo: mismo producto,
misma interfaz y mismos datos, sin arrastrar el chat, la voz, la memoria ni el
empaquetado de Electron del anfitrión.

El trabajo no fue de diseño de producto nuevo, sino de **extracción, separación de
fronteras y consolidación**. Por eso este documento describe contratos reales
(secciones 9 a 13) y no un producto por construir.

Resultado esperado: un servidor Node local que sirve la interfaz del gestor, habla
con `tk.exe` por línea de comandos y guarda su propio catálogo de etiquetas, sin
ninguna dependencia de ChatVoiceAgent.

---

## 2. Contexto y origen

### 2.1 El proyecto de origen

El material de origen se revisó antes de traerlo, y conviene dejar constancia de una
diferencia importante entre lo que parece y lo que es:

| Ruta de origen | Qué contiene realmente | Naturaleza |
|---|---|---|
| `...\tk\` | `tk.exe`, `LICENSE`, `README.md` y `.tacks/tacks.db` | **Binario de terceros.** No hay código fuente del backend. |
| `...\public\task-manager\` | `app-vue.js`, `app-vue.css`, `app-vue.html` | **Artefactos generados** por esbuild, más una página mantenida a mano. |
| `...\src\task-manager\` | Fuente JS/CSS y documentación del módulo | **Fuente editable real** del frontend. |
| `...\src\shared\tasks\` | `task-model.js`, `task-badge.js` | Modelo compartido con el anfitrión. |
| `...\tests\task-manager\` | Suites de prueba y su fixture | Pruebas Vitest del módulo. |
| `...\server.js` | La API del gestor, mezclada con chat, voz y memoria | **La capa HTTP real**, sin dueño claro. |

Las dos consecuencias que ordenaron todo el proyecto:

1. **El backend no estaba en la carpeta `tk`.** `tk` es un binario de terceros que
   no se puede modificar. Todo lo que el frontend consumía como API
   (`/api/tk/*` y `/api/tags*`) estaba escrito en `server.js`, dentro de
   ChatVoiceAgent.
2. **El catálogo de etiquetas no era de tacks.** La tabla `tag_metadata` (nombre,
   descripción, color) vivía en `chatvoiceagent.db`. tacks no tiene ningún concepto
   de color ni de descripción de etiqueta.

### 2.2 Qué es `tk` (tacks)

Producto de terceros: `srmccray/tacks`, versión **0.2.4**, escrito en Rust,
licencia **MIT**, binario único, SQLite embebido. Gestor de tareas pensado para
agentes de IA, con CLI estable y salida JSON.

- Base de datos en `.tacks/tacks.db`, configurable con `TACKS_DB` o `--db`.
- IDs con prefijo (`tk-XXXX` para tareas, `tk-XXXX.N` para subtareas).
- Sin red, sin sincronización y sin integración con git.
- Contrato de estabilidad declarado por el autor: comandos y banderas
  permanentes, JSON congelado, enums aditivos, esquema de base aditivo.

**Consecuencia para el proyecto: `tk` es una dependencia externa de solo lectura.
No se parchea ni se recompila.**

---

## 3. Problema y oportunidad

### 3.1 Problema

El gestor de tareas estaba acoplado a un producto distinto y más grande. Eso
provocaba:

- **Coste de mantenimiento cruzado**: tocar el gestor obligaba a construir, probar
  y arrancar ChatVoiceAgent entero.
- **Fronteras confusas**: el `server.js` del anfitrión contenía a la vez chat, voz,
  memoria, sesiones y la API del gestor. El código del gestor no tenía dueño claro.
- **Despliegue innecesariamente pesado**: para usar el gestor había que arrastrar
  Electron y `node_modules` del anfitrión.
- **Riesgo de regresión ajena**: cualquier cambio en el anfitrión podía romper el
  gestor, y al revés.

### 3.2 Oportunidad

El gestor ya estaba **modularizado por dentro** (mixins, frontera HTTP única, mapper
propio, documentación de contratos y riesgos). La extracción fue viable sin
reescritura: sobre todo mover archivos, recortar el servidor y separar la base de
datos del catálogo de etiquetas.

---

## 4. Objetivos

| ID | Objetivo | Métrica de éxito |
|---|---|---|
| O-1 | Gestor autónomo | Arranca y funciona sin ChatVoiceAgent instalado ni en marcha. |
| O-2 | Paridad funcional | Todas las capacidades actuales siguen disponibles (sección 9). |
| O-3 | Paridad de datos | Los datos existentes de tareas se pueden seguir usando sin conversión manual. |
| O-4 | Frontera de API propia | La API del gestor vive en el proyecto nuevo, no en el anfitrión. |
| O-5 | Base de etiquetas propia | El catálogo deja de depender de `chatvoiceagent.db`. |
| O-6 | Proyecto mantenible | Fuente editable, build reproducible y pruebas que pasan en el proyecto nuevo. |
| O-7 | Instalación ligera | `npm install` sin dependencias de runtime (sección 11). |

---

## 5. No objetivos

Queda explícitamente **fuera del alcance** de este producto:

- **NO-1** — Reescribir el frontend. Se conserva su arquitectura actual (Vue 3
  Options API, mixins, esbuild, sin router ni Pinia).
- **NO-2** — Sustituir, parchear o recompilar `tk`. Es una dependencia externa.
- **NO-3** — Chat, voz, memoria, sesiones, personas o agentes.
- **NO-4** — Empaquetado de escritorio (Electron). La decisión tomada es aplicación
  web local con Node; el escritorio queda como evolución posterior no comprometida.
- **NO-5** — Sincronización, multiusuario, cuentas, permisos o acceso remoto. El
  producto es local y de un solo usuario.
- **NO-6** — Editor colaborativo o en tiempo real. La recarga de datos se hace por
  consulta; una señal SSE local dispara esa consulta después de mutaciones HTTP
  confirmadas y también cuando el servidor detecta cambios externos del CLI `tk`.
  No hay sincronización multiusuario ni resolución de conflictos.
- **NO-7** — Resolver los riesgos heredados del módulo de origen **durante la
  extracción**. Se documentan y se planifican por separado; su estado vive en
  [`docs/known-risks.md`](docs/known-risks.md).
- **NO-8** — Funciones de tacks que no se usan (`tk serve`, `init-rules`, plugin de
  Claude Code, `prime` como contexto de agente).

---

## 6. Usuario y casos de uso

**Usuario único: Alfredo.** Uso local, en su máquina, en español. No hay
autenticación ni concurrencia multiusuario. El usuario también usa el CLI `tk`
directamente y desde agentes de IA, por lo que **la interfaz y el CLI escriben sobre
la misma base**: la coherencia entre ambos es un requisito, no un detalle.

### Casos de uso principales

| ID | Caso de uso |
|---|---|
| CU-1 | Ver todas las tareas en árbol, con jerarquía padre-hijo visible |
| CU-2 | Crear tarea y subtarea, con prioridad, descripción, etiquetas y padre |
| CU-3 | Ver y editar el detalle: título, descripción, notas, responsable |
| CU-4 | Cambiar estado y prioridad desde el listado sin abrir el detalle |
| CU-5 | Cerrar una tarea con motivo y comentario de cierre |
| CU-6 | Añadir y retirar dependencias entre tareas (bloqueos) |
| CU-7 | Ver qué tareas están bloqueadas y por qué |
| CU-8 | Añadir comentarios (historial append-only) |
| CU-9 | Gestionar el catálogo de etiquetas: crear, renombrar, describir, colorear, borrar |
| CU-10 | Filtrar por estado, prioridad, etiqueta y búsqueda de texto |
| CU-11 | Ver progreso de épicas (tareas con el tag `epic` y sus hijas) |
| CU-12 | Consultar estadísticas del backlog |

---

## 7. Alcance

### 7.1 Dentro del alcance

1. Un **servidor propio** que sirve la interfaz y expone la API del gestor
   (secciones 9 y 12).
2. `tk` como **dependencia externa de solo lectura**, con su licencia y su
   atribución.
3. La **fuente del frontend**, el modelo compartido, las librerías vendorizadas y
   la página HTML mantenida a mano.
4. El **catálogo de etiquetas** en una base de datos propia del proyecto
   (sección 13.4).
5. **Build reproducible** (esbuild) y **suite de pruebas** (Vitest) en el proyecto.
6. **Documentación propia**: arquitectura, contratos, operación, desarrollo,
   riesgos y decisiones.

### 7.2 Fuera del alcance

Los apartados NO-1 a NO-8 de la sección 5.

---

## 8. Arquitectura objetivo

### 8.1 Vista general

```text
Navegador
  │  http://localhost:<puerto>/task-manager/app-vue.html
  ▼
Servidor Node (node:http, sin framework)
  │  ├── estáticos: /public/**  (/task-manager, /vendor)
  │  ├── API de tareas: /api/tk/*
  │  └── API de etiquetas: /api/tags*  ──► data/task-manager.db (node:sqlite)
  │
  └── execFile ──► tk/tk.exe  ──► tk/.tacks/tacks.db
```

### 8.2 Principios de diseño

| ID | Principio | Motivo |
|---|---|---|
| A-1 | `tk` es la única verdad de las tareas | Evita duplicar estado y desincronizar con el CLI. |
| A-2 | El catálogo de etiquetas es lo único que el servidor posee | tacks no tiene color ni descripción. |
| A-3 | El servidor no mantiene caché de tareas | El CLI y los agentes escriben en la misma base; una caché mentiría. |
| A-4 | El frontend no conoce `tk` | El mapper aísla alias y formatos. |
| A-5 | Toda la escritura pasa por el servidor | El navegador no ejecuta procesos ni toca archivos. |
| A-6 | Ninguna dependencia de runtime npm | `node:sqlite` y `node:http` son nativos; solo hay `devDependencies`. |

### 8.3 Responsabilidades por módulo

| Módulo | Responsabilidad |
|---|---|
| `server/index.js` | Arranque, enrutado, servido de estáticos y guarda de recorrido de rutas. |
| `server/tk.js` | Única frontera con el CLI `tk`; siempre `execFile` con argumentos en array. |
| `server/tasks.js` | Endpoints de tareas (`/api/tk/*`). |
| `server/tags.js` | Endpoints de etiquetas y tabla `tag_metadata`. |
| `server/http.js` | Utilidades HTTP compartidas. |
| `src/task-manager/` | Fuente del frontend (Vue 3, Options API, esbuild). |
| `src/shared/tasks/` | Modelo de tarea compartido. |

La estructura de carpetas y el inventario de ficheros vigentes están en
[`docs/architecture.md`](docs/architecture.md) y
[`docs/development.md`](docs/development.md), que se actualizan junto al código.

### 8.4 Decisiones

Las decisiones de producto y de arquitectura no se copian aquí: su contexto y su
estado viven en [`docs/decisions/`](docs/decisions/) (ADR) y en
[`docs/architecture.md`](docs/architecture.md). Este documento solo fija lo que
hay que cumplir.


## 9. Requisitos funcionales

Prioridad: **M** = must, **S** = should, **C** = could.

### 9.1 Servidor y sirvido

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Servir `public/task-manager/app-vue.html` y sus artefactos en `/task-manager/`. | M |
| RF-02 | Servir el Vue vendorizado en `/vendor/` por encima de `public/`. | M |
| RF-03 | Impedir el acceso a rutas fuera de `public/` (path traversal). | M |
| RF-04 | Arrancar sin `tk.exe` presente, informando de capacidad no disponible en vez de caer. | M |
| RF-05 | Inicializar `tk/.tacks/tacks.db` automáticamente si no existe. | M |
| RF-06 | Responder con `{ error }` y estado 404 a `/api/tk/*` y `/api/tags*` cuando la capacidad esté deshabilitada. | M |
| RF-07 | Puerto configurable con la variable de entorno `PORT`. | S |

### 9.2 Tareas (lectura)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-10 | Listar todas las tareas, incluidas las cerradas. | M |
| RF-11 | Calcular y exponer el estado `blocked` cruzando `list --all` con `blocked`, porque tacks no lo almacena. | M |
| RF-12 | Devolver el detalle de una tarea con `blockers`, `dependents`, `children` y `comments`. | M |
| RF-13 | Devolver las tareas listas para trabajar (sin bloqueos abiertos). | S |
| RF-14 | Devolver conteos por estado, prioridad y etiqueta. | S |
| RF-15 | Devolver el progreso de las épicas con conteo de hijas y porcentaje. | S |
| RF-16 | Devolver las tareas bloqueadas con su bloqueante. | S |
| RF-17 | Devolver las subtareas de una tarea. | S |
| RF-18 | Devolver el número de tareas activas (no cerradas). | C |

### 9.3 Tareas (escritura)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-20 | Crear tareas con título, prioridad, descripción, etiquetas y padre. | M |
| RF-21 | Editar título, descripción, prioridad, estado, notas y responsable. | M |
| RF-22 | Reclamar una tarea (`--claim`). | M |
| RF-23 | Reparentar una tarea, incluida la promoción a raíz (`--parent none`). | M |
| RF-24 | Editar etiquetas de forma diferencial: calcular altas y bajas comparando con el estado real y enviar `--add-tags` / `--remove-tags`. | M |
| RF-25 | Cerrar una tarea con motivo y comentario. | M |
| RF-26 | Reabrir una tarea cerrada mediante `update -s open`. | S |
| RF-27 | Añadir y retirar dependencias entre tareas. | M |
| RF-28 | Añadir comentarios a una tarea. | M |
| RF-29 | **No** ofrecer borrado de tareas: `tk` no tiene ese comando. | M |

### 9.4 Catálogo de etiquetas

| ID | Requisito | Prioridad |
|---|---|---|
| RF-30 | Listar el catálogo combinando las etiquetas reales de las tareas con los metadatos guardados. | M |
| RF-31 | Calcular el número de usos de cada etiqueta a partir de las tareas. | M |
| RF-32 | Crear una etiqueta con nombre, descripción y color. | M |
| RF-33 | Renombrar una etiqueta propagando el cambio a todas las tareas que la usan. | M |
| RF-34 | Actualizar descripción y color sin tocar las tareas. | M |
| RF-35 | Borrar una etiqueta retirándola de todas las tareas que la usan. | M |
| RF-36 | Informar de cuántas y cuáles tareas se verían afectadas antes de renombrar o borrar. | M |
| RF-37 | Deshacer los cambios ya aplicados a tareas si la operación en cascada falla a mitad. | M |
| RF-38 | Validar nombre (máximo 40 caracteres), descripción (máximo 90) y color contra la lista permitida. | M |
| RF-39 | Comparar nombres normalizando NFC, espacios exteriores y mayúsculas, conservando los acentos. | M |
| RF-40 | Rechazar duplicados con estado 409. | M |
| RF-41 | Rellenar con `""` y `"blue"` la descripción y el color ausentes al listar. | S |

### 9.5 Interfaz

| ID | Requisito | Prioridad |
|---|---|---|
| RF-50 | Listado en árbol con jerarquía padre-hijo, expandible y con nivel visual. | M |
| RF-51 | Selección de tarea y panel de detalle con pestañas. | M |
| RF-52 | Edición en línea de prioridad y estado desde el listado. | M |
| RF-53 | Diálogo de creación de tarea, también como subtarea. | M |
| RF-54 | Filtros por estado, prioridad, etiqueta y búsqueda de texto, combinables. | M |
| RF-55 | Gestión de etiquetas en panel lateral con vista previa de tareas afectadas. | M |
| RF-56 | Inspector con subtareas, bloqueantes, dependientes y comentarios. | M |
| RF-57 | Mensajes de error y confirmación (toast) en todas las mutaciones. | M |
| RF-58 | Atajos de teclado, incluido Escape para cerrar diálogos y menús. | S |
| RF-59 | Diseño adaptable a 1440, 1180, 720 y 390 px, con inspector móvil. | S |
| RF-60 | Accesibilidad: navegación por teclado, nombres accesibles, `aria-*` y foco visible. | S |
| RF-61 | Interfaz en español de España. | M |

---

## 10. Reglas de negocio y contrato de `tk`

Contrato de `tk` 0.2.4 del que el servidor depende. El servidor no lo modifica: se
apoya en él.

| ID | Regla |
|---|---|
| RN-01 | **No existe borrado.** `tk delete` no es un subcomando válido (código 2). Lo máximo es cerrar. |
| RN-02 | **No existe «reabrir».** Se hace con `update <id> -s open`. |
| RN-03 | Tras reabrir, `close_reason` **conserva el valor anterior** (`"done"`) en la base de `tk`. **El servidor no lo propaga**: solo presenta el motivo cuando la tarea está cerrada. |
| RN-04 | `--claim` asigna `assignee = "agent"` de forma fija, sin poder elegir el nombre. |
| RN-05 | Cerrar una tarea con hijas abiertas **falla** (código 1) con el mensaje `has N open dependent(s)`. Requiere `--force`. |
| RN-06 | `tk` **no valida la prioridad**: `-p 5` se acepta y se guarda. La ayuda del CLI documenta 0-3; el README de tacks, 0-4. **El servidor sí la valida** en 0-3. |
| RN-07 | `blocked` **no es un estado almacenado**. `tk blocked` devuelve las tareas con su estado original (`open`). El estado `blocked` lo calcula el servidor. |
| RN-08 | `dep add` / `dep remove` **no devuelven JSON aunque se pase `--json`**: devuelven texto (`Added dependency: A is blocked by B`). El éxito se determina por el código de salida, no por el parseo. |
| RN-09 | Las dependencias tienen **detección de ciclos** y de duplicados; ambas fallan con código 1 y mensaje explícito. |
| RN-10 | Los IDs son `tk-XXXX` y `tk-XXXX.N`; una tarea puede ser a la vez subtarea y contenedor. |
| RN-11 | Los estados válidos son `open`, `in_progress`, `done` y `blocked` (este último calculado). |
| RN-12 | Los motivos de cierre son `done`, `duplicate`, `absorbed`, `stale` y `superseded`. |
| RN-13 | Una «épica» **no es un tipo**: es una tarea con el tag `epic`. |
| RN-14 | `notes` es contexto mutable y se sobrescribe; los comentarios son historial append-only. |
| RN-15 | La tabla `tags` de la respuesta de `list` es la única fuente de pertenencia a etiquetas. |

---

## 11. Requisitos no funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-01 | **Cero dependencias de runtime npm.** Solo `devDependencies`, fijadas a versiones exactas: `esbuild`, `vitest` y `jsdom`. SQLite vía `node:sqlite`. | M |
| RNF-02 | Node.js ≥ 22.5 por `node:sqlite`. | M |
| RNF-03 | Tiempo de espera máximo de 5 segundos por invocación de `tk`. | M |
| RNF-04 | Ninguna llamada de red saliente. Producto estrictamente local. | M |
| RNF-05 | Toda mutación debe volver a consultar el estado confirmado; **prohibido el optimismo** en la interfaz. | M |
| RNF-06 | Las respuestas obsoletas no deben sobrescribir datos confirmados (guardas de secuencia). | M |
| RNF-07 | Toda entrada del usuario se valida en el servidor antes de llegar al CLI. | M |
| RNF-08 | Se prohíbe construir la línea de comandos con interpolación de shell: siempre `execFile` con argumentos en array. | M |
| RNF-09 | El proyecto debe incluir la licencia MIT de tacks y atribución visible. | M |
| RNF-10 | Los archivos `tacks.db` y `task-manager.db` no se versionan. | M |
| RNF-11 | Build reproducible: `npm run build` regenera `app-vue.js` y `app-vue.css` a partir de `src/`. | M |
| RNF-12 | `npm test` ejecuta la suite de Vitest y pasa en verde. | M |
| RNF-13 | Los artefactos generados no se editan a mano. | M |
| RNF-14 | Interfaz operativa sin conexión a internet. | M |
| RNF-15 | Arranque del servidor en menos de 2 segundos. | S |

---

## 12. Contrato de API

Todos los endpoints devuelven JSON. **El servidor comunica errores de `tk` con
estado HTTP 200 y cuerpo `{ "error": "..." }`**; el cliente considera error tanto
`!response.ok` como la presencia de `data.error`.

### 12.1 Tareas

| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| GET | `/api/tk/list` | — | Array de tareas con `status: "blocked"` ya aplicado |
| GET | `/api/tk/active-count` | — | Conteo de tareas no cerradas |
| GET | `/api/tk/stats` | — | `{ by_status, by_priority, by_tag }` |
| GET | `/api/tk/ready` | — | Array de tareas sin bloqueos abiertos |
| GET | `/api/tk/epic` | — | Array con `children_total`, `children_done`, `progress_pct` |
| GET | `/api/tk/blocked` | — | Array de tareas bloqueadas |
| GET | `/api/tk/children/:id` | — | Array de subtareas |
| GET | `/api/tk/show/:id` | — | Detalle: `blockers`, `dependents`, `children`, `comments` |
| POST | `/api/tk/create` | `{ title, priority?, description?, tags?, parent? }` | Tarea creada |
| POST | `/api/tk/close` | `{ id, reason?, comment? }` | Tarea cerrada |
| POST | `/api/tk/update` | `{ id, changes }` | Tarea actualizada |
| POST | `/api/tk/dep` | `{ child_id, parent_id }` | `{ ok, message, child_id, parent_id }` |
| POST | `/api/tk/dep-remove` | `{ child_id, parent_id }` | `{ ok, message, child_id, parent_id }` |
| POST | `/api/tk/comment` | `{ id, body }` | Comentario creado |

`changes` admite: `title`, `priority`, `status`, `description`, `notes`, `parent`,
`claim`, `assignee`, `tags`.

### 12.2 Etiquetas

| Método | Ruta | Cuerpo | Devuelve |
|---|---|---|---|
| GET | `/api/tags` | — | `[{ name, description, color, uses }]` |
| POST | `/api/tags` | `{ name, description, color }` | 201 con la etiqueta |
| GET | `/api/tags/:name/affected` | — | `{ total, tasks: [{ id, title }] }` |
| PUT | `/api/tags/:name` | `{ name, description, color }` | Etiqueta actualizada con `uses` |
| DELETE | `/api/tags/:name` | — | `{ ok: true, affected: N }` |

### 12.3 Códigos de estado

| Código | Uso |
|---|---|
| 200 | Éxito, y también error de `tk` en el cuerpo `{ error }` |
| 201 | Etiqueta creada |
| 400 | JSON inválido, campo obligatorio ausente o validación fallida |
| 404 | Etiqueta no encontrada; capacidad de tareas deshabilitada |
| 409 | Duplicado, o fallo en una operación en cascada |
| 500 | Fallo al guardar metadatos |
| 503 | `tk` no disponible al listar tareas |

---

## 13. Modelo de datos

### 13.1 Tarea (tacks)

Campos que devuelve el CLI:

```text
Task = {
  id: string,                 // "tk-1339" | "tk-1339.4"
  title: string,
  description: string | null,
  status: 'open' | 'in_progress' | 'done' | 'blocked',
  priority: number,           // sin validar en origen; el servidor valida 0-3
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
(`{ id, task_id, body, created_at }`).

### 13.2 Tarea en la interfaz

`mapTask()` normaliza y **oculta los alias de tacks** para que no lleguen a los
componentes:

| Campo | Tipo | Por defecto | Origen |
|---|---|---|---|
| `id` | `string` | `''` | `id` |
| `title` | `string` | `''` | `title` |
| `description` | `string` | `''` | `description` |
| `priority` | `string` | `'2'` | `priority` como texto |
| `status` | `string` | `'open'` | `status` |
| `parentId` | `string \| null` | `null` | `parent_id` o `parentId` |
| `chips` | `string[]` | `[]` | `tags` o `chips` |
| `kind` | `string` | `'task'` | `epic` / `subtask` / `task` |
| `type` | `string` | `'Tarea'` | Etiqueta localizada |
| `icon` | `string` | `'T'` | `E` / `S` / `T` |
| `blockers` | `TaskRelation[]` | `[]` | `blockers` |
| `dependents` | `TaskRelation[]` | `[]` | `dependents` |
| `comments` | `TaskComment[]` | `[]` | `comments` |

`TaskRelation = { id, title }` · `TaskComment = { body, author, createdAt }`

El mapper conserva el resto de campos mediante propagación, pero **elimina
`parent_id` y `tags`**. Los consumidores deben usar `parentId` y `chips`.

### 13.3 Etiqueta

```text
Tag = {
  name: string,
  description: string,
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'red',
  uses: number
}
```

### 13.4 Tabla `tag_metadata` (base propia del proyecto)

```sql
CREATE TABLE IF NOT EXISTS tag_metadata (
  name        TEXT PRIMARY KEY COLLATE NOCASE,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
```

`COLLATE NOCASE` es coherente con la comparación que ya hace el servidor. El
listado combina esta tabla con las etiquetas reales de las tareas: las que solo
existen en tareas aparecen con `uses > 0` y valores por defecto; las que solo
existen en la tabla aparecen con `uses: 0`.

---

## 14. Criterios de aceptación

### 14.1 Funcionales

- **CA-1** El gestor arranca y es utilizable con ChatVoiceAgent desinstalado y parado.
- **CA-2** Todos los endpoints de la sección 12 responden con las formas documentadas.
- **CA-3** `status: "blocked"` aparece en el listado para tareas con bloqueantes abiertos, aunque `tk` las devuelva como `open`.
- **CA-4** Se pueden crear, editar, cerrar, reabrir, comentar y relacionar tareas.
- **CA-5** No existe ninguna acción de borrado de tareas en la interfaz ni en la API.
- **CA-6** Se puede crear, renombrar, recolorear, describir y borrar etiquetas; el renombrado y el borrado propagan a todas las tareas.
- **CA-7** Si la propagación falla a mitad, los cambios ya aplicados se revierten.
- **CA-8** La vista previa de tareas afectadas coincide con las tareas realmente modificadas.
- **CA-9** Los filtros por estado, prioridad, etiqueta y texto funcionan de forma combinada.
- **CA-10** El árbol muestra la jerarquía padre-hijo con niveles correctos.
- **CA-11** Cerrar una tarea con hijas abiertas muestra el error del CLI y no fuerza el cierre.
- **CA-12** La interfaz está en español de España.

### 14.2 Técnicos

- **CA-13** `package.json` no declara ninguna dependencia de runtime.
- **CA-14** `npm test` pasa.
- **CA-15** `npm run build` regenera los artefactos sin diferencias inesperadas.
- **CA-16** No hay ningún `fetch(` fuera de `api/tk-client.js`.
- **CA-17** El proyecto no tiene acoplamiento de ejecución con el anfitrión: ninguna variable de entorno, ruta ni módulo de ChatVoiceAgent participa en el arranque; las menciones que quedan en comentarios son contexto o trazabilidad, nunca dependencias.
- **CA-18** `tk.exe` se invoca siempre con `execFile` y argumentos en array.
- **CA-19** Ninguna petición saliente de red.
- **CA-20** Los archivos `.db` están excluidos del control de versiones.
- **CA-21** La licencia MIT de tacks está presente y la atribución es visible en el README.

---

## 15. Matriz de validación

Recorrido manual de comprobación del producto. Anchuras de referencia: **1440,
1180, 720 y 390 px**.

### Funcional

1. Carga inicial, recarga y aviso cuando `tk` no está disponible.
2. Selección, expansión, búsqueda y filtros combinados.
3. Cambio de prioridad y de estado desde el listado.
4. Cierre de tarea, y cierre rechazado por hijas abiertas.
5. Reapertura de una tarea cerrada.
6. Creación de tarea y de subtarea.
7. Edición de título, descripción, notas, responsable y etiquetas.
8. Alta y retirada de dependencias; comportamiento ante ciclo y ante duplicado.
9. Alta de comentarios.
10. Creación, renombrado, recoloreado y borrado de etiquetas.
11. Vista previa de tareas afectadas antes de renombrar y borrar.
12. Menús, Escape, portapapeles y mensajes de error y confirmación.

### Accesibilidad

- Navegación de tareas con Tab, Intro y Espacio.
- Nombres accesibles en iconos, selectores y menús.
- `aria-expanded`, `aria-selected`, diálogos y regiones activas.
- Foco visible y cierre con Escape.

### Móvil

- Apertura y retorno del inspector.
- Desplazamiento de paneles.
- Ausencia de desbordamiento horizontal.

---

## 16. Invariantes que deben preservarse

Heredadas del módulo de origen. Romper cualquiera exige justificación explícita.

1. No hay `fetch` fuera de `api/tk-client.js`.
2. El formato bruto de `tk` no llega a los componentes.
3. La selección sigue apuntando a una tarea existente tras recargar.
4. Una respuesta obsoleta no sobrescribe datos confirmados.
5. Una escritura solo se presenta como completada después de recargar.
6. Los componentes emiten intenciones y no mutan props.
7. Los artefactos públicos se regeneran; nunca se corrigen a mano.
8. El orden de importación CSS es tokens, layout, componentes, responsive.
9. Las mutaciones no aplican cambios optimistas.
10. Cada estado o acción vive en el mixin dueño de su dominio.

---

## 17. Glosario

| Término | Significado |
|---|---|
| **tacks / `tk`** | Gestor de tareas de terceros, Rust, MIT, binario único. El «backend» real. |
| **Anfitrión** | ChatVoiceAgent: el producto del que se extrajo el gestor. |
| **Bloqueada** | Estado calculado, no almacenado: la tarea tiene bloqueantes abiertos. |
| **Épica** | Tarea con el tag `epic`. No es un tipo de dato. |
| **Chip** | Etiqueta tal como la muestra la interfaz (`chips` en el modelo de UI). |
| **Mapper** | `mapTask()`: traduce la forma de `tk` a la forma de la interfaz. |
| **Mixin** | Cada uno de los seis objetos de opciones que se combinan en la instancia Vue raíz. |
| **Artefacto** | `app-vue.js` y `app-vue.css`, generados por esbuild y versionados. |
| **Mutación** | Escritura que sigue el ciclo comprobar busy, escribir, recargar, confirmar. |

---

## 18. Referencias

- [`AGENTS.md`](AGENTS.md) — reglas que valen en cada turno en este repositorio.
- [`CONTRATO_DOCUMENTACION.md`](CONTRATO_DOCUMENTACION.md) — dónde vive cada dato y qué escribe cada documento.
- [`CONTRATO_FLUJO_GIT_VERSIONADO.md`](CONTRATO_FLUJO_GIT_VERSIONADO.md) — flujo de Git, CHANGELOG y versionado.
- [`CHANGELOG.md`](CHANGELOG.md) — qué cambió y cuándo.
- [`docs/architecture.md`](docs/architecture.md) — capas, fronteras y flujos.
- [`docs/contracts.md`](docs/contracts.md) — modelos, API y eventos.
- [`docs/operations.md`](docs/operations.md) — build, pruebas y entrega.
- [`docs/development.md`](docs/development.md) — estructura, convenciones y mapa de ficheros.
- [`docs/known-risks.md`](docs/known-risks.md) — registro vivo de riesgos y deuda.
- [`docs/decisions/`](docs/decisions/) — ADR de las decisiones durables.
- [`tk/README.md`](tk/README.md) — documentación de tacks 0.2.4 y su atribución.
