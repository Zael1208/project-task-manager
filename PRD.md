# PRD — Gestor de tareas local (Task Manager)

| Campo | Valor |
|---|---|
| Producto | Gestor de tareas local (nombre de trabajo: **Task Manager**) |
| Versión del documento | 1.9 |
| Fecha | 19 de septiembre de 2026 |
| Autor | Alfredo González Portero |
| Estado | Extracción completa (F1 a F9), cuestiones de producto cerradas (QA-1 a QA-5) y resueltos seis de los siete riesgos heredados. Solo queda TM-R4 y la deuda técnica registrada en `docs/known-risks.md`. |
| Repositorio destino | `C:\PROJECT-TASK-MANAGER` |
| Origen del código | `C:\PROJECT-CHAT-VOICE-AGENT` (`tk/`, `src/task-manager/`, `src/shared/tasks/`, `public/`, `tests/task-manager/`, `server.js`) |

---

## 1. Resumen ejecutivo

El gestor de tareas ya existe y funciona: es una aplicación Vue 3 que se apoya en
`tk`, un binario local de terceros (tacks), y en una capa HTTP que hoy vive
incrustada dentro del servidor de ChatVoiceAgent.

El objetivo de este proyecto es **extraer ese gestor a un proyecto propio y
autónomo**: mismo producto, misma interfaz y mismos datos, pero sin arrastrar el
chat, la voz, la memoria ni el empaquetado de Electron de ChatVoiceAgent.

El trabajo no es de diseño de producto nuevo, sino de **extracción, separación de
fronteras y consolidación**. Por eso este PRD dedica tanto espacio al inventario
verificado del código existente y a los contratos reales como a las funciones.

Resultado esperado: un servidor Node local que sirve la interfaz del gestor, habla
con `tk.exe` por línea de comandos y guarda su propio catálogo de etiquetas, sin
ninguna dependencia de ChatVoiceAgent.

---

## 2. Contexto y origen

### 2.1 Qué hay hoy en el proyecto de origen

Se ha revisado el material y conviene dejar constancia de una diferencia
importante entre lo que parece y lo que es:

| Ruta de origen | Qué contiene realmente | Naturaleza |
|---|---|---|
| `C:\PROJECT-CHAT-VOICE-AGENT\tk\` | `tk.exe`, `LICENSE`, `README.md` y `.tacks/tacks.db` | **Binario de terceros.** No hay código fuente del backend. |
| `C:\PROJECT-CHAT-VOICE-AGENT\public\task-manager\` | `app-vue.js` (74 KB), `app-vue.css` (44 KB), `app-vue.html` | **Artefactos generados** por esbuild, más una página mantenida a mano. |
| `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\` | 25 archivos JS/CSS y 5 documentos | **Fuente editable real** del frontend. |
| `C:\PROJECT-CHAT-VOICE-AGENT\src\shared\tasks\` | `task-model.js`, `task-badge.js` | Modelo compartido con el anfitrión. |
| `C:\PROJECT-CHAT-VOICE-AGENT\tests\task-manager\` | 4 archivos de prueba + 1 fixture | 18 pruebas Vitest. |
| `C:\PROJECT-CHAT-VOICE-AGENT\server.js` | 2.020 líneas, de las cuales ~300 son la API del gestor | **La capa HTTP real**, mezclada con chat, voz y memoria. |

Las dos consecuencias que ordenan todo el proyecto:

1. **El backend no está en la carpeta `tk`.** `tk` es un binario de terceros que no
   se puede modificar. Todo lo que el frontend consume como API
   (`/api/tk/*` y `/api/tags*`, 19 endpoints) está escrito en `server.js`, dentro
   de ChatVoiceAgent.
2. **El catálogo de etiquetas no es de tacks.** La tabla `tag_metadata` (nombre,
   descripción, color) vive en `chatvoiceagent.db`. tacks no tiene ningún concepto
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

El gestor de tareas está acoplado a un producto distinto y más grande. Eso
provoca:

- **Coste de mantenimiento cruzado**: tocar el gestor obliga a construir, probar y
  arrancar ChatVoiceAgent entero.
- **Fronteras confusas**: el `server.js` del anfitrión contiene a la vez chat, voz,
  memoria, sesiones y la API del gestor. El código del gestor no tiene dueño claro.
- **Despliegue innecesariamente pesado**: para usar el gestor hay que arrastrar
  Electron y `node_modules` del anfitrión.
- **Riesgo de regresión ajena**: cualquier cambio en el anfitrión puede romper el
  gestor y al revés.

### 3.2 Oportunidad

El gestor ya está **modularizado por dentro** (mixins, frontera HTTP única, mapper
propio, documentación de contratos y riesgos). La extracción es viable sin
reescritura: es sobre todo mover archivos, recortar el servidor y separar la base
de datos del catálogo de etiquetas.

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

Queda explícitamente **fuera del alcance** de este PRD:

- **NO-1** — Reescribir el frontend. Se trae tal cual, con su arquitectura actual
  (Vue 3 Options API, mixins, esbuild, sin router ni Pinia).
- **NO-2** — Sustituir, parchear o recompilar `tk`. Es una dependencia externa.
- **NO-3** — Traer chat, voz, memoria, sesiones, personas o agentes.
- **NO-4** — Empaquetado de escritorio (Electron). Decisión tomada: aplicación web
  local con Node. El escritorio queda como evolución posterior no comprometida.
- **NO-5** — Sincronización, multiusuario, cuentas, permisos o acceso remoto. El
  producto es local y de un solo usuario.
- **NO-6** — Editor colaborativo o en tiempo real. La recarga se hace por
  consulta, no por websockets.
- **NO-7** — Resolver los riesgos heredados TM-R1 a TM-R7 **durante la extracción**
  (sección 16). Se documentan y se planifican, no se mezclan con el traslado. Una
  vez cerrada la extracción sí se han abordado los dos de prioridad alta, TM-R1 y
  TM-R2, como trabajo propio y con su prueba; los cinco restantes siguen abiertos.
- **NO-8** — Funciones de tacks que hoy no se usan (`tk serve`, `init-rules`,
  plugin de Claude Code, `prime` como contexto de agente).

---

## 6. Usuario y casos de uso

**Usuario único: Alfredo.** Uso local, en su máquina, en español. No hay
autenticación ni concurrencia multiusuario. El usuario también usa el CLI `tk`
directamente y desde agentes de IA, por lo que **la interfaz y el CLI escriben
sobre la misma base**: la coherencia entre ambos es un requisito, no un detalle.

### Casos de uso principales

| ID | Caso de uso | Estado actual |
|---|---|---|
| CU-1 | Ver todas las tareas en árbol, con jerarquía padre-hijo visible | Existe |
| CU-2 | Crear tarea y subtarea, con prioridad, descripción, etiquetas y padre | Existe |
| CU-3 | Ver y editar el detalle: título, descripción, notas, responsable | Existe |
| CU-4 | Cambiar estado y prioridad desde el listado sin abrir el detalle | Existe |
| CU-5 | Cerrar una tarea con motivo y comentario de cierre | Existe |
| CU-6 | Añadir y retirar dependencias entre tareas (bloqueos) | Existe |
| CU-7 | Ver qué tareas están bloqueadas y por qué | Existe |
| CU-8 | Añadir comentarios (historial append-only) | Existe |
| CU-9 | Gestionar el catálogo de etiquetas: crear, renombrar, describir, colorear, borrar | Existe |
| CU-10 | Filtrar por estado, prioridad, etiqueta y búsqueda de texto | Existe |
| CU-11 | Ver progreso de épicas (tareas con el tag `epic` y sus hijas) | Existe |
| CU-12 | Consultar estadísticas del backlog | Existe |

---

## 7. Alcance

### 7.1 Dentro del alcance

1. Crear la estructura del proyecto nuevo en `C:\PROJECT-TASK-MANAGER`.
2. Traer el binario `tk` con su licencia y su atribución.
3. Traer la fuente del frontend, el modelo compartido, los vendor y la página HTML.
4. Extraer de `server.js` los 19 endpoints del gestor a un servidor propio.
5. Separar el catálogo de etiquetas a una base de datos propia del proyecto.
6. Reproducir el build (esbuild) y las pruebas (Vitest) en el proyecto nuevo.
7. Adaptar y traer la documentación vigente del módulo.
8. Verificar paridad funcional contra el sistema actual.

### 7.2 Fuera del alcance

Los siete puntos de la sección 5 (NO-1 a NO-8).

---

## 8. Arquitectura objetivo

### 8.1 Vista general

```text
Navegador
  │  http://localhost:<puerto>/task-manager/app-vue.html
  ▼
Servidor Node (node:http, sin framework)          ← nuevo, extraído de server.js
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
| A-4 | El frontend no conoce `tk` | El mapper aísla alias y formatos; invariante heredada. |
| A-5 | Toda la escritura pasa por el servidor | El navegador no ejecuta procesos ni toca archivos. |
| A-6 | Ninguna dependencia de runtime npm | `node:sqlite` y `node:http` son nativos; solo hay devDependencies. |

### 8.3 Estructura de carpetas propuesta

```text
C:\PROJECT-TASK-MANAGER\
├── PRD.md
├── README.md
├── package.json
├── .gitignore
├── server/
│   ├── index.js              Arranque, enrutado, estáticos
│   ├── tk.js                 Envoltorio de tk.exe (runTk / runTkText)
│   ├── tasks.js              Handlers /api/tk/*
│   ├── tags.js               Handlers /api/tags* y tabla tag_metadata
│   └── http.js               Utilidades: readJson, sendJson
├── tk/
│   ├── tk.exe
│   ├── LICENSE               Licencia MIT de tacks (obligatoria)
│   ├── README.md             Atribución y versión
│   └── .tacks/tacks.db       Base de tareas (no versionada)
├── data/
│   └── task-manager.db       Catálogo de etiquetas (no versionada)
├── src/
│   ├── task-manager/         Frontend (25 archivos + dialog-focus.js)
│   └── shared/tasks/         Modelo compartido
├── public/
│   ├── task-manager/         app-vue.html (a mano) + artefactos generados
│   └── vendor/               vue.global.dev.js / .prod.js
├── tests/task-manager/       36 pruebas Vitest
└── docs/                     architecture, contracts, operations, known-risks
```

### 8.4 Decisiones tomadas

| ID | Decisión | Razón |
|---|---|---|
| D-1 | Extraer una API propia en el proyecto nuevo | Aceptado por Alfredo. Elimina el acoplamiento con el anfitrión. |
| D-2 | Traer fuente + pruebas + pipeline, no solo los artefactos | Aceptado. El proyecto queda reconstruible y mantenible. |
| D-3 | Mantener el catálogo de etiquetas en tabla propia | Aceptado. Conserva color, descripción y renombrado en cascada. |
| D-4 | Aplicación web local con Node | Aceptado. Es lo que ya hace hoy; el escritorio queda fuera. |
| D-5 | La base de etiquetas va en **un archivo SQLite separado**, no dentro de `tacks.db` | `tacks.db` pertenece a un binario de terceros; `tk init` u otra operación podría recrearla. Aunque el contrato de tacks promete esquema aditivo, no conviene que nuestros datos dependan de ello. |
| D-6 | Versión de Vue: 3.5.41 vendorizada como global | Es la que funciona hoy; evita añadir un bundler de Vue y mantiene `globalThis.Vue`. |
| D-7 | Servidor sin framework (`node:http`) | Es lo que usa el origen; evita dependencias y el alcance es pequeño. |
| D-8 | Puerto por defecto **8890**, configurable con `PORT` | ChatVoiceAgent usa 8792 y `tk serve` usa 3000. Un valor distinto permite ejecutar ambos a la vez sin colisión. |
| D-9 | Sin cambios de código en el frontend durante la extracción | Mantiene la paridad y permite comparar contra el original. |
| D-10 | Copiar la base canónica de tareas al proyecto nuevo | Decidido por Alfredo: los datos reales sirven además como banco de pruebas. Ejecutado y verificado (sección 14.1). |
| D-11 | Adoptar el contrato de flujo de Git del proyecto de origen | Decidido por Alfredo. Aporta rama por tarea, commits pequeños con prefijo de tipo, `CHANGELOG.md` al día y etiquetas SemVer solo al publicar. |
| D-12 | La documentación vive en `docs/` en la raíz | El proyecto ya no es un módulo dentro de otro producto: tenerla en `src/task-manager/docs/` sugeriría que solo documenta el frontend, cuando cubre también el servidor. |
| D-13 | La API valida la prioridad en 0-3 y rechaza el resto | Decidido por Alfredo (QA-2). `tk` acepta cualquier entero, pero la interfaz solo representa cuatro niveles: sin validar, un valor de 4 o más se mostraba como «Sin prioridad» y no se podía volver a elegir. |
| D-14 | `close_reason` solo se presenta cuando la tarea está cerrada | Decidido por Alfredo (QA-3). Se corrige al presentar los datos, no escribiendo en la base de `tk`, que no ofrece forma de limpiarlo y no nos pertenece (D-5). |
| D-15 | La interfaz se llama «Gestor de tareas» | Decidido por Alfredo (QA-5). Deja de nombrar al producto del que se extrajo. Marca del icono: «G». |
| D-16 | En `mutate()`, una recarga superada (`null`) **sí** muestra la confirmación | Resolución de TM-R2. `null` no es un fallo: otra recarga posterior ya ha publicado un estado que incluye este cambio. Se descartó serializar o agrupar recargas por ser más complejo sin aportar nada aquí. El caso `false` sigue siendo un fallo explícito. |

---

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

Todas verificadas ejecutando `tk.exe` 0.2.4 sobre una base desechable.

| ID | Regla | Evidencia |
|---|---|---|
| RN-01 | **No existe borrado.** `tk delete` no es un subcomando válido (código 2). Lo máximo es cerrar. | Verificado |
| RN-02 | **No existe «reabrir».** Se hace con `update <id> -s open`. | Verificado |
| RN-03 | Tras reabrir, `close_reason` **conserva el valor anterior** (`"done"`) en la base de `tk`. **El servidor no lo propaga**: solo presenta el motivo cuando la tarea está cerrada (D-14). | Verificado |
| RN-04 | `--claim` asigna `assignee = "agent"` de forma fija, sin poder elegir el nombre. | Verificado |
| RN-05 | Cerrar una tarea con hijas abiertas **falla** (código 1) con el mensaje `has N open dependent(s)`. Requiere `--force`. | Verificado |
| RN-06 | `tk` **no valida la prioridad**: `-p 5` se acepta y se guarda. La ayuda del CLI documenta 0-3; el README de tacks, 0-4. **El servidor sí la valida** en 0-3 (D-13). | Verificado |
| RN-07 | `blocked` **no es un estado almacenado**. `tk blocked` devuelve las tareas con su estado original (`open`). El estado `blocked` lo calcula el servidor. | Verificado |
| RN-08 | `dep add` / `dep remove` **no devuelven JSON aunque se pase `--json`**: devuelven texto (`Added dependency: A is blocked by B`). El éxito se determina por el código de salida, no por el parseo. | Verificado |
| RN-09 | Las dependencias tienen **detección de ciclos** y de duplicados; ambas fallan con código 1 y mensaje explícito. | Verificado |
| RN-10 | Los IDs son `tk-XXXX` y `tk-XXXX.N`; una tarea puede ser a la vez subtarea y contenedor. | Verificado |
| RN-11 | Los estados válidos son `open`, `in_progress`, `done` y `blocked` (este último calculado). | Verificado |
| RN-12 | Los motivos de cierre son `done`, `duplicate`, `absorbed`, `stale` y `superseded`. | Ayuda del CLI |
| RN-13 | Una «épica» **no es un tipo**: es una tarea con el tag `epic`. | Persona del gestor |
| RN-14 | `notes` es contexto mutable y se sobrescribe; los comentarios son historial append-only. | README de tacks |
| RN-15 | La tabla `tags` de la respuesta de `list` es la única fuente de pertenencia a etiquetas. | Verificado |

---

## 11. Requisitos no funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-01 | **Cero dependencias de runtime npm.** Solo `devDependencies`: `esbuild`, `vitest`. SQLite vía `node:sqlite`. | M |
| RNF-02 | Node.js ≥ 22.5 por `node:sqlite`; referencia probada: v24.18.0. | M |
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

19 endpoints. Todos devuelven JSON. **El servidor comunica errores de `tk` con
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

Campos devueltos por el CLI, verificados:

```text
Task = {
  id: string,                 // "tk-1339" | "tk-1339.4"
  title: string,
  description: string | null,
  status: 'open' | 'in_progress' | 'done' | 'blocked',
  priority: number,           // sin validar en origen
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

## 14. Plan de migración

Orden pensado para poder verificar en cada paso.

| Fase | Trabajo | Entregable verificable |
|---|---|---|
| **F1. Esqueleto** | ~~Crear `package.json`, `.gitignore`, estructura de carpetas, `README.md`.~~ **Hecho.** | Verificado: `package.json` sin dependencias de runtime; solo `esbuild` y `vitest` como `devDependencies`, fijadas a las versiones exactas del origen (0.28.1 y 4.1.10). |
| **F2. Dependencia externa** | ~~Copiar `tk.exe`, `LICENSE` y `README.md` a `tk/`.~~ **Hecho.** | Verificado: `tk/tk.exe --version` responde `tk 0.2.4` y lee las 30 tareas desde la ubicación nueva. Hash del binario idéntico al origen. |
| **F3. Datos** | ~~Decidir y ejecutar la migración de `tacks.db`.~~ **Hecho**: copiada la base canónica (30 tareas) a `tk/.tacks/tacks.db`. | Verificado: hash idéntico al origen, `list -a` devuelve 30 tareas (15 abiertas o en curso, 15 cerradas). |
| **F4. Frontend** | ~~Copiar `src/task-manager/`, `src/shared/tasks/`, `public/vendor/` y `public/task-manager/app-vue.html`.~~ **Hecho.** | 39 archivos copiados; hashes verificados en una muestra de 5 archivos representativos (todos coincidentes). |
| **F5. Pipeline** | ~~Traer los scripts de esbuild y Vitest; copiar `tests/task-manager/`.~~ **Hecho.** | Verificado: `npm run build` reproduce `app-vue.js` y `app-vue.css` con **hash idéntico** a los artefactos del origen (reproducibilidad byte a byte). `vitest run` pasa 4 archivos y 18 pruebas. |
| **F6. Servidor** | ~~Extraer de `server.js` los 19 handlers, `runTk` / `runTkText`, `listTasksMerged`, `sendJson` / `readJson`, el servido de estáticos y la guarda de path traversal.~~ **Hecho.** Repartido en `server/index.js` (enrutado, estáticos), `tk.js` (frontera con el CLI), `tasks.js` (14 endpoints de tareas), `tags.js` (5 de etiquetas) y `http.js`. | Verificado: 19 endpoints ejercitados uno a uno contra datos reales. |
| **F7. Etiquetas** | ~~Sustituir la dependencia de `chatvoiceagent.db` por `data/task-manager.db` con `node:sqlite`.~~ **Hecho.** | Verificado: CRUD completo, renombrado en cascada propagado a las tareas, borrado con retirada, y validaciones 400/409/404. |
| **F8. Paridad** | ~~Recorrer la matriz de validación de la sección 17.~~ **Hecho en su parte funcional.** Verificado por Alfredo en navegador el 19/09/2026: el recorrido funcional es correcto. | Acta: recorrido funcional correcto. Quedan sin verificar de forma individualizada las anchuras 1440/1180/720/390 y el foco visible. Las carencias de accesibilidad de los diálogos que se registraron como TM-R11 están corregidas (véase `docs/known-risks.md`), con una corrección de por medio: el diagnóstico inicial afirmaba por error que Escape no cerraba los diálogos. |
| **F9. Documentación** | ~~Adaptar `architecture.md`, `contracts.md`, `operations.md`, `known-risks.md`.~~ **Hecho.** Movidos a `docs/` y reescritos para el proyecto autónomo. `handoff.md` pasa a `docs/development.md`: el estado vivo se registra en el PRD y el CHANGELOG. Añadidos `CHANGELOG.md` y el contrato de flujo de Git. | Verificado: ninguna referencia al anfitrión salvo las tres registradas en CA-17; `src/task-manager/docs/` ya no existe. |

### 14.1 Decisión sobre los datos de tareas — RESUELTA

**Decisión (D-10): copiar la base canónica al proyecto nuevo.** Los datos reales
sirven además como banco de pruebas para la validación de paridad (F8). La ruta
queda configurable por `TACKS_DB` o por la carpeta de trabajo, de modo que el
comportamiento se puede cambiar sin tocar código.

**Ejecutado.** Base copiada a `tk/.tacks/tacks.db` y verificada por hash.

### 14.1.1 Estado de ejecución

| Elemento | Estado | Evidencia |
|---|---|---|
| `tk/tk.exe` | Copiado | Hash `6EB22EED…D154` idéntico al origen; responde `tk 0.2.4` |
| `tk/LICENSE`, `tk/README.md` | Copiados | Atribución MIT presente (CA-21) |
| `tk/.tacks/tacks.db` | Copiada | Hash `68F2D934…F274` idéntico al zip; 30 tareas |
| Lectura end-to-end | Verificada | Desde `tk/`, `tk.exe --json list -a` devuelve 30 tareas (15 abiertas o en curso, 15 cerradas) |
| Build del frontend | Verificado | `npm run build` → `app-vue.js` (74.258 B) y `app-vue.css` (44.103 B) con **hash idéntico** a los artefactos del origen |
| Línea base vigente de artefactos | Registrada | `app-vue.js` (78.845 B) `AFDA142F…4524`; `app-vue.css` (44.103 B) `7A0D1A69…F38B7`, sin cambios porque no se ha tocado ningún estilo. Sustituye a la línea base de la extracción: el frontend ya ha divergido a propósito. |
| Suite de pruebas | Verificada | `vitest run` → 7 archivos, 36 pruebas, todas en verde |
| Foco de los diálogos (TM-R11) | Verificado | Algoritmo cubierto por 10 pruebas; el cableado de Vue se verificó en navegador el 19/09/2026: el foco entra, el tabulador no se escapa y vuelve al control de origen. Sin prueba que lo proteja de una regresión (TM-R4). |
| Validación de prioridad (QA-2, D-13) | Verificada | Rechazados con 400: 5, −1, 99, 4, «abc» y 1,5. Aceptados 0, 1, 2 y 3. `update` con 7, rechazado. |
| Coherencia de `close_reason` (QA-3, D-14) | Verificada | Tarea cerrada y reabierta: la API devuelve `null` en la respuesta, en `show` y en `list`, mientras `tk` conserva `done` en la base. |
| Marca visible (QA-5, D-15) | Verificada | Título de la página y cabecera pasan a «Gestor de tareas»; el bundle servido ya no contiene `Tacks Workspace` ni `ChatVoiceAgent`. |
| Sin regresión en el backlog real | Verificado | 30 tareas, 23 etiquetas y los mismos conteos por estado que antes de los cambios. |
| TM-R1 y TM-R2 (QA-7) | Verificados | Una prueba por riesgo en `task-actions.test.js`. **Ambas se comprobó que fallan sin el arreglo**: con el código anterior, 2 fallos; con el arreglo, todas en verde. |
| TM-R3, TM-R5, TM-R6 y TM-R7 | Verificados | Cinco pruebas nuevas. **Se comprobó que fallan sin los arreglos**: 5 fallos con el código anterior. |
| Servidor (F6) | Verificado | 19 endpoints ejercitados: 8 de lectura de tareas, 6 de escritura, 5 de etiquetas. Incluye creación, edición con diff de etiquetas, comentario, dependencia, retirada de dependencia, reparentado, promoción a raíz, reclamación y cierre. |
| Estado "blocked" cruzado (RF-11) | Verificado | Con un bloqueante abierto, `/api/tk/list` devuelve la tarea como `blocked` aunque `tk` la guarde como `open`; al retirarlo vuelve a su estado real. |
| Guardián de cierre (RN-05) | Verificado | Cerrar una tarea con hijas abiertas devuelve el error de `tk` y **no** se reintenta con `--force`; la tarea permanece abierta. |
| Renombrado de etiqueta en cascada | Verificado | El renombrado se propaga a las tareas que la usan; el borrado la retira. El color se actualiza. |
| Modo degradado (RF-04, RF-06) | Verificado | Con la capacidad deshabilitada: 404 y el mensaje exacto que el cliente reconoce, y la interfaz se sigue sirviendo. |
| Seguridad de rutas (RF-03) | Verificado | `/../package.json`, `/..%2fpackage.json`, `/task-manager/../../package.json` y `/%2e%2e/PRD.md` bloqueados (403/404). |
| Separación de bases (D-5) | Verificada | `data/task-manager.db` (12 KB) creada aparte de `tk/.tacks/tacks.db`. |
| Backlog real intacto | Verificado | 30 tareas, 0 tareas de prueba filtradas: las mutaciones se probaron sobre una base desechable. |

### 14.2 Hallazgo: había tres bases de datos distintas, y la que el servidor espera no existía

Al preparar la copia se descubrió que el proyecto de origen contiene **tres bases
divergentes**, no tres copias de la misma:

| Origen | Tamaño | Tareas | Estado | Fecha |
|---|---|---|---|---|
| `.tacks/tacks.db` (raíz del repo) | 61.440 B | **0** | Vacía | 05/08/2026 12:01 |
| `dist/.../app.asar.unpacked/tk/.tacks/tacks.db` | 61.440 B | **14** | Rama anterior | 06/08/2026 13:46 |
| `tk/.tacks/tacks.zip` | 90.112 B | **30** | **Canónica** | 07/08/2026 01:38 |

Dos hallazgos que conviene no perder de vista:

1. **La base canónica estaba solo dentro de un `.zip`.** La ruta que `server.js`
   calcula como base de datos (`tk/.tacks/tacks.db`) **no existía**. Como el
   servidor ejecuta `tk init` cuando el archivo falta, ChatVoiceAgent habría
   creado al arrancar una base **vacía** en esa ruta, mostrando el gestor sin
   ninguna tarea. Esto conecta con la tarea `tk-1339.8`, «Alinear la persistencia
   entre desarrollo y Electron empaquetado», que seguía en curso.
2. **Las dos bases con datos son ramas divergentes, no versiones.** La del
   paquete Electron (14 tareas) contiene la épica `tk-e285` «Version 0.1.2» con
   siete hijas, todas abiertas. La canónica (30 tareas) contiene esa **misma épica
   recreada como `tk-87ef`**, con las mismas siete hijas por título y cinco de
   ellas ya cerradas. Es decir: `tk-e285` está **superada** por `tk-87ef` y no se
   fusiona. La rama del paquete no aporta nada que la canónica no tenga en estado
   más avanzado.

**Consecuencia:** se copia la base del zip. La rama `tk-e285` se descarta
deliberadamente. Los orígenes quedan intactos y sin modificar.

**Nota de alcance:** la base de ChatVoiceAgent no se toca. Si se quiere recuperar
allí el backlog, hay que restaurar el zip en `tk/.tacks/tacks.db`; es una acción
sobre el proyecto antiguo, fuera del alcance de este PRD.

---

## 15. Criterios de aceptación

### 15.1 Funcionales

- [ ] **CA-1** El gestor arranca y es utilizable con ChatVoiceAgent desinstalado y parado.
- [ ] **CA-2** Los 19 endpoints responden con las formas documentadas en la sección 12.
- [ ] **CA-3** `status: "blocked"` aparece en el listado para tareas con bloqueantes abiertos, aunque `tk` las devuelva como `open`.
- [ ] **CA-4** Se pueden crear, editar, cerrar, reabrir, comentar y relacionar tareas.
- [ ] **CA-5** No existe ninguna acción de borrado de tareas en la interfaz ni en la API.
- [ ] **CA-6** Se puede crear, renombrar, recolorear, describir y borrar etiquetas; el renombrado y el borrado propagan a todas las tareas.
- [ ] **CA-7** Si la propagación falla a mitad, los cambios ya aplicados se revierten.
- [ ] **CA-8** La vista previa de tareas afectadas coincide con las tareas realmente modificadas.
- [ ] **CA-9** Los filtros por estado, prioridad, etiqueta y texto funcionan de forma combinada.
- [ ] **CA-10** El árbol muestra la jerarquía padre-hijo con niveles correctos.
- [ ] **CA-11** Cerrar una tarea con hijas abiertas muestra el error del CLI y no fuerza el cierre.
- [ ] **CA-12** La interfaz está en español de España.

### 15.2 Técnicos

- [ ] **CA-13** `package.json` no declara ninguna dependencia de runtime.
- [ ] **CA-14** `npm test` pasa: 7 archivos, 36 pruebas.
- [ ] **CA-15** `npm run build` regenera los artefactos sin diferencias inesperadas.
- [ ] **CA-16** No hay ningún `fetch(` fuera de `api/tk-client.js`.
- [ ] **CA-17** El proyecto no tiene acoplamiento de ejecución con el anfitrión: ninguna variable de entorno, ruta ni módulo de ChatVoiceAgent participa en el arranque. Se verifican solo las menciones en código y comentarios; las de la documentación se resuelven en F9.

  Estado actual — **2 menciones, ninguna visible al usuario y ninguna es una
  dependencia**:

  | Ubicación | Tipo | Acción |
  |---|---|---|
  | `server/index.js:25` | Comentario que explica la elección del puerto 8890 | Se conserva: es contexto útil |
  | `server/tasks.js:3` | Comentario de procedencia de los handlers | Se conserva: trazabilidad de la extracción |

  La tercera mención que había —la etiqueta visible `ChatVoiceAgent · Vue 3` en
  la cabecera— **desapareció al resolver QA-5**: la interfaz se llama ahora
  «Gestor de tareas». Verificado: el bundle servido ya no contiene ninguna de las
  dos cadenas anteriores.
- [ ] **CA-18** `tk.exe` se invoca siempre con `execFile` y argumentos en array.
- [ ] **CA-19** Ninguna petición saliente de red.
- [ ] **CA-20** Los archivos `.db` están excluidos del control de versiones.
- [ ] **CA-21** La licencia MIT de tacks está presente y la atribución es visible en el README.

---

## 16. Riesgos

### 16.1 Riesgos heredados del módulo actual

Se trajeron tal cual desde `src/task-manager/docs/known-risks.md` con el criterio de
**no corregirlos durante la extracción** (NO-7), para no mezclar la extracción con
cambios de comportamiento. Una vez cerrada la extracción se han abordado los dos
de prioridad alta.

| ID | Riesgo | Impacto | Prioridad | Estado |
|---|---|---|---|---|
| TM-R1 | Un fallo tardío de detalle podía publicar un error sobre una selección más reciente. | Aviso de error engañoso | Alta | **Resuelto** (QA-7) |
| TM-R2 | Dos mutaciones con claves distintas solapan recargas; la anterior devolvía `null` y se quedaba sin confirmación visible. | Escritura confirmada sin acuse | Alta | **Resuelto** (QA-7) |
| TM-R3 | Un ciclo completo de padres puede ocultar tareas: el recorrido empieza solo en raíces. | Tareas invisibles sin error | Media | **Resuelto** |
| TM-R4 | No hay pruebas de componentes ni de navegador: plantillas, `v-model`, foco, teclado y responsive sin cubrir. | Contrato visual puede romperse en verde | Media | Abierto |
| TM-R5 | Cualquier respuesta 404 con JSON inválido se interpreta como capacidad deshabilitada. | Problema de ruta o proxy enmascarado | Media | **Resuelto** |
| TM-R6 | Las acciones desconocidas del inspector se ignoran: el `switch` no tiene rama `default`. | Control que no responde, difícil de diagnosticar | Baja | **Resuelto** |
| TM-R7 | El diccionario `busy` conserva claves con valor `false`. | Crecimiento leve de memoria | Baja | **Resuelto** |

**El registro vivo de riesgos está en [`docs/known-risks.md`](docs/known-risks.md)**,
que es donde se añaden y se cierran. Además de los siete heredados, contiene cuatro
surgidos durante la extracción y su desarrollo. Quedan abiertos dos:

| ID | Riesgo | Prioridad |
|---|---|---|
| TM-R8 | El servidor no tiene pruebas automatizadas | Media |
| TM-R9 | El renombrado de etiquetas en cascada no es transaccional | Media |

Los otros dos, **TM-R10** (la marca visible era la del producto de origen) y
**TM-R11** (accesibilidad de los diálogos), se registraron, se corrigieron y están
cerrados. El diagnóstico inicial de TM-R11 contenía un error —afirmaba que Escape
no cerraba los diálogos cuando sí lo hacía— y la corrección queda documentada en
`docs/known-risks.md`.

### 16.2 Riesgos nuevos de la extracción

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| RX-1 | ~~Divergencia de datos si se copia `tacks.db` y se sigue usando el original.~~ **Resuelto**: se copió la base canónica y la del origen no era la que el servidor usaba. | Baja | Bajo | Decisión D-10 ejecutada y verificada por hash. Ver sección 14.2 para las tres bases divergentes. |
| RX-2 | ~~La prioridad no está validada por `tk`; un valor ≥ 4 creado por CLI o por un agente se muestra como «Sin prioridad».~~ **Resuelto**: la API valida 0-3 y rechaza el resto con 400. | Baja | Bajo | Decisión D-13, ejecutada y verificada. Queda la asimetría conocida: `tk` por CLI sigue aceptando cualquier entero. |
| RX-3 | ~~`close_reason` queda obsoleto al reabrir una tarea: estado `open` con motivo `done`.~~ **Resuelto** en la presentación de los datos. | Baja | Bajo | Decisión D-14, ejecutada y verificada. **El valor obsoleto sigue en la base de `tk`**, que no ofrece forma de borrarlo. |
| RX-4 | Un renombrado de etiqueta en cascada es una secuencia de invocaciones del CLI sin transacción; un fallo intermedio deja estado parcial. | Media | Medio | Ya hay reversión implementada; debe conservarse y probarse. |
| RX-5 | Al copiar solo los artefactos en vez de la fuente, el proyecto quedaría sin mantenimiento posible. | Baja | Alto | D-2 ya resuelto: se trae la fuente y el pipeline. |
| RX-6 | `node:sqlite` es relativamente reciente; la API puede cambiar entre versiones de Node. | Baja | Medio | Fijar la versión mínima de Node en `engines` y documentarla. |
| RX-7 | Pérdida de la licencia o atribución de tacks al copiar el binario. | Media | Alto (legal) | CA-21 y RNF-09 como requisitos de aceptación. |
| RX-8 | El backend extraído arrastra dependencias ocultas del anfitrión (variables de entorno, rutas, `PROJECT_ROOT`). | Media | Medio | CA-17 como verificación explícita. |

---

## 17. Matriz de validación

Recorrido manual obligatorio antes de dar la extracción por buena. Debe
registrarse con fecha, comando o URL y resultado. Anchuras de referencia: **1440,
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

## 18. Fases y hitos

| Hito | Contenido | Criterio de cierre |
|---|---|---|
| **H1 — Proyecto en pie** | F1 a F5 | `npm run build` y `npm test` en verde en el proyecto nuevo |
| **H2 — Gestor operativo** | F6 y F7 | La interfaz carga, lista tareas y gestiona etiquetas |
| **H3 — Paridad demostrada** | F8 | CA-1 a CA-12 verificados con acta |
| **H4 — Entrega documentada** | F9 | CA-13 a CA-21 y documentación sin referencias al anfitrión |

---

## 19. Cuestiones abiertas

| QA-1 a QA-5 **resueltas**. Quedan estas dos, ninguna bloqueante.

| ID | Cuestión | Fase | Recomendación |
|---|---|---|---|
| QA-1 | ~~¿Qué hacemos con los datos de tareas: copiar, compartir o empezar vacío?~~ **RESUELTA**: copiar. Ejecutado (D-10, sección 14.1). | F3 | — |
| QA-2 | ~~¿Se amplía la interfaz para soportar prioridades 4 y superiores, o se valida 0-3 en la API?~~ **RESUELTA**: validar 0-3 en la API. Ejecutado y verificado. | F6 | — |
| QA-3 | ~~¿Se limpia `close_reason` al reabrir una tarea?~~ **RESUELTA**: sí, en la presentación de los datos; `tk` no ofrece forma de borrarlo en la base. Ejecutado y verificado. | F6 | — |
| QA-4 | ~~¿El proyecto nuevo se publica como repositorio git propio?~~ **RESUELTA**: sí. Se adopta el contrato de flujo de Git del proyecto de origen y se hace el commit inicial. | F1 | — |
| QA-5 | ~~**Marca visible**: la cabecera mostraba `Tacks Workspace` y `ChatVoiceAgent · Vue 3`.~~ **RESUELTA**: la interfaz se llama «Gestor de tareas» y deja de nombrar al producto de origen. Ejecutado y verificado. | F9 | — |
| QA-6 | ¿Se implementa `tk prime` como panel de contexto, hoy no usado? | Posterior | No en este alcance |
| QA-7 | ~~¿Se abordan TM-R1 y TM-R2 tras la extracción?~~ **RESUELTA**: sí, y ambos están corregidos con su prueba. | H4+ | — |

---

## 20. Anexos

### 20.1 Inventario a traer

| Origen | Destino | Notas |
|---|---|---|
| `tk/tk.exe` | `tk/tk.exe` | **Copiado.** Binario de terceros, versión 0.2.4, hash verificado |
| `tk/LICENSE`, `tk/README.md` | `tk/` | **Copiados.** Obligatorio por licencia MIT |
| `tk/.tacks/tacks.db` | `tk/.tacks/tacks.db` | **Copiada** desde `tk/.tacks/tacks.zip` (30 tareas, hash verificado) |
| `src/task-manager/` (25 archivos) | `src/task-manager/` | Fuente del frontend |
| `src/shared/tasks/` (2 archivos) | `src/shared/tasks/` | Modelo compartido |
| `public/vendor/vue.global.dev.js`, `.prod.js` | `public/vendor/` | Vue 3.5.41, MIT |
| `public/task-manager/app-vue.html` | `public/task-manager/` | Mantenido a mano |
| `tests/task-manager/` (5 archivos) | `tests/task-manager/` | 4 suites + fixture |
| Scripts de `package.json` | `package.json` | `build:task-manager`, `test:task-manager` |
| `server.js` (handlers) | `server/tasks.js`, `server/tags.js` | Extracción, no copia |
| `src/task-manager/docs/` | `docs/` | **Hecho.** Adaptados y ampliados; `handoff.md` pasa a `development.md` |

### 20.2 Archivos del frontend que se traen sin cambios

```text
main.js                        app-shell.js
api/tk-client.js               state/workspace.js
state/workspace-data.js        state/ui.js
state/task-tree.js             state/task-actions.js
state/tag-actions.js           state/inspector.js
components/task-list.js        components/task-row.js
components/task-filters.js     components/task-inspector.js
components/new-task-dialog.js  components/tag-manager-drawer.js
components/tag-picker-field.js components/overflow-menu.js
components/toast.js
styles/tokens.css              styles/layout.css
styles/components.css          styles/responsive.css
../shared/tasks/task-model.js  ../shared/tasks/task-badge.js
```

### 20.3 Invariantes que deben preservarse

Heredadas de `src/task-manager/docs/architecture.md`. Romper cualquiera exige
justificación explícita.

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

### 20.4 Glosario

| Término | Significado |
|---|---|
| **tacks / `tk`** | Gestor de tareas de terceros, Rust, MIT, binario único. El «backend» real. |
| **Anfitrión** | ChatVoiceAgent: el producto del que se extrae el gestor. |
| **Bloqueada** | Estado calculado, no almacenado: la tarea tiene bloqueantes abiertos. |
| **Épica** | Tarea con el tag `epic`. No es un tipo de dato. |
| **Chip** | Etiqueta tal como la muestra la interfaz (`chips` en el modelo de UI). |
| **Mapper** | `mapTask()`: traduce la forma de `tk` a la forma de la interfaz. |
| **Mixin** | Cada uno de los seis objetos de opciones que se combinan en la instancia Vue raíz. |
| **Artefacto** | `app-vue.js` y `app-vue.css`, generados por esbuild y versionados. |
| **Mutación** | Escritura que sigue el ciclo comprobar busy, escribir, recargar, confirmar. |

---

## 21. Referencias

- `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\README.md` — alcance y comandos del módulo.
- `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\docs\architecture.md` — fronteras y flujos.
- `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\docs\contracts.md` — modelos, API y eventos.
- `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\docs\operations.md` — build, pruebas y entrega.
- `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\docs\known-risks.md` — deuda confirmada.
- `C:\PROJECT-CHAT-VOICE-AGENT\src\task-manager\docs\handoff.md` — estado vivo del módulo.
- `C:\PROJECT-CHAT-VOICE-AGENT\persona\gestor-tareas.md` — límites funcionales del gestor.
- `C:\PROJECT-CHAT-VOICE-AGENT\tk\README.md` — documentación de tacks 0.2.4.
