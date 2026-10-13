# Arquitectura

## Contexto de ejecución

El gestor es una aplicación local con tres piezas:

1. **Servidor Node** (`server/`), sin framework y sin dependencias de runtime.
2. **Interfaz Vue 3** (`src/task-manager/` → `public/task-manager/`), con
   Options API, empaquetada como IIFE por esbuild.
3. **`tk` (tacks)**, binario de terceros que posee la base de tareas.

La interfaz no ejecuta `tk` ni toca el sistema de archivos: todo pasa por la API
HTTP del servidor. El servidor es el único que habla con el binario.

No hay router, Pinia, TypeScript ni archivos `.vue`. La página carga primero
`public/vendor/vue.global.prod.js` y después el bundle, por lo que
[`main.js`](../src/task-manager/main.js) espera que `globalThis.Vue` ya exista.

## Capas y dirección de dependencias

```text
Navegador
  │
  │  http://localhost:8890/task-manager/app-vue.html
  ▼
public/task-manager/app-vue.html
  -> main.js
     -> app-shell.js
        -> components/*
        -> state/workspace.js
           -> state/*
              -> api/tk-client.js      (unica frontera fetch del frontend)
              -> ../shared/tasks/task-model.js
  │
  │  fetch /api/tk/*  y  /api/tags*
  ▼
server/index.js                            (enrutado y estaticos)
  -> server/tasks.js                       (handlers de tareas)
  -> server/tags.js                        (handlers de etiquetas)
       -> server/tk.js                     (unica frontera con el CLI)
            -> tk/tk.exe (Windows)  ──►  tk/.tacks/tacks.db
               tk/tk     (Linux)
       -> data/task-manager.db             (catalogo de etiquetas)
  -> server/http.js                        (utilidades compartidas)
```

Reglas de frontera:

- [`main.js`](../src/task-manager/main.js) monta una única raíz e importa CSS en
  orden.
- [`app-shell.js`](../src/task-manager/app-shell.js) compone la vista y conecta
  props y eventos.
- `components/` presenta datos y emite intenciones.
- `components/dialog-focus.js` es el único sitio que mueve el foco de los
  diálogos modales.
- `state/` posee el estado, los cálculos y los casos de uso.
- [`api/tk-client.js`](../src/task-manager/api/tk-client.js) es el único archivo
  con `fetch`.
- [`task-model.js`](../src/shared/tasks/task-model.js) aísla alias y formas
  brutas de `tk` del resto del frontend.
- `server/tk.js` es el único archivo que sabe que existe `tk`: elige
  `tk/tk.exe` en Windows y `tk/tk` en Linux, así que el mismo repositorio sirve
  en las dos plataformas.

Una dependencia nueva debe apuntar hacia abajo en este esquema. Un componente no
debe importar el cliente, el cliente no debe conocer Vue, y ningún módulo salvo
`server/tk.js` debe invocar el binario.

## Raíz y mixins

[`workspace.js`](../src/task-manager/state/workspace.js) combina seis objetos de
opciones en la misma instancia Vue. No son stores independientes: todos leen y
escriben el mismo `this`.

| Mixin | Propiedad principal | Colabora con |
|---|---|---|
| `workspace-data.js` | Estado inicial y fábricas de borradores | Base de todos |
| `ui.js` | Errores, notificaciones, busy, menús, teclado y etiquetas visuales | Todos los casos de uso |
| `task-tree.js` | Mapeo jerárquico, filtros, selección y props del listado | Datos, UI y etiquetas |
| `task-actions.js` | Carga, detalle y mutaciones de tareas | API, mapper, UI y borradores |
| `tag-actions.js` | Catálogo y CRUD de etiquetas | Mutación común, árbol y UI |
| `inspector.js` | Props y despacho del inspector | Todos los métodos de tareas |

El orden actual del array de mixins expresa la progresión de responsabilidades,
pero la colaboración real se resuelve sobre la instancia combinada. Antes de
renombrar un método o dato hay que buscar su uso en todos los mixins y en
`app-shell.js`.

El ciclo de vida raíz registra `Escape`, restaura las preferencias locales
compatibles antes de abrir `EventSource('/api/events')` y lanzar
`reloadWorkspace()` al montar. La selección restaurada se valida contra las
tareas devueltas y su detalle se carga mediante la API existente. Al desmontar
cierra el EventSource, cancela la escritura pendiente de preferencias y retira
el listener.

## Servidor

[`index.js`](../server/index.js) resuelve cada petición con dos tablas de rutas:

- `EXACT_ROUTES`: método y ruta completa (la mayoría de los endpoints).
- `PREFIX_ROUTES`: rutas con parámetro al final. El prefijo incluye la barra, de
  modo que `/api/tk/show/` no casa con `/api/tk/showcase`.

Antes de enrutar se comprueba si `tk` está disponible; si no lo está, cualquier
ruta `/api/tk/*` o `/api/tags*` responde 404 con el mensaje exacto que el cliente
reconoce como capacidad no disponible. La interfaz se sigue sirviendo, para que
el usuario vea el aviso y no una página rota. `GET /api/events` es la excepción:
abre el canal SSE del proceso HTTP y no necesita consultar `tk` al conectarse.

Los ficheros estáticos se resuelven contra `public/` comprobando la ruta
resuelta y, si el archivo existe, también su ruta real: así un enlace simbólico
tampoco permite escapar del directorio.

### Las dos bases de datos

| Base | Contenido | Propietario |
|---|---|---|
| `tk/.tacks/tacks.db` | Tareas, dependencias, comentarios | El binario `tk` |
| `data/task-manager.db` | Catálogo de etiquetas: nombre, descripción, color | Este servidor |

`events.js` mantiene las conexiones SSE activas y publica `workspace.changed`
después de mutaciones HTTP confirmadas y de cambios externos detectados en la
base de tareas. Cada evento incluye `resource` (`tasks` o `tags`) y `source`
(`http` o `external`). El servidor vigila `tacks.db` y sus sidecars `-wal`/`-shm` con polling de
`fs.watchFile`, agrupa las escrituras de SQLite con un debounce y descarta la
firma que acaba de producir una mutación HTTP propia para no duplicarla.
Cada navegador se identifica en el EventSource y en sus mutaciones HTTP para
que el originador conserve su confirmación local y los demás reciban el aviso
compartido. `EventSource` se encarga de reintentar la conexión del cliente; los
eventos externos recargan el workspace incluso durante la carga inicial y todos
los eventos remotos muestran, en la esquina inferior derecha, un aviso por cada
tarea afectada con su ID, acción y título.

Se mantienen separadas a propósito. `tk` no tiene concepto de color ni de
descripción de etiqueta, y su base la administra un tercero: no conviene que
nuestros metadatos dependan de su ciclo de vida.

### Estado "bloqueada"

`tk` no almacena `blocked`: guarda el estado real de la tarea (normalmente
`open`) y `tk blocked` devuelve las que tienen bloqueantes abiertos.
`listTasksMerged()`, en [`server/tk.js`](../server/tk.js), cruza ambas listas y
devuelve el estado `blocked` ya aplicado. El cruce se hace en código
determinista, no en la interfaz.

### Invocación de `tk`

Toda llamada usa `execFile` con argumentos en array —nunca interpolación de
shell—, con un tiempo máximo de 5 segundos y `--db` explícito, de modo que la
ubicación de la base no depende del directorio de trabajo.

`dep add` y `dep remove` **no devuelven JSON aunque se pase `--json`**: devuelven
texto. Por eso existe `runTkText()`, que determina el éxito por el código de
salida real del proceso.

### Correcciones de presentación

`tk` es de solo lectura para nosotros: su base no se toca nunca. Cuando su
comportamiento deja un estado incoherente, la corrección se hace al presentar los
datos, no escribiendo en su base. `normalizeTask()` en
[`server/tk.js`](../server/tk.js) es el único sitio donde ocurre, y hoy hace una
cosa: no presentar `close_reason` mientras la tarea no esté cerrada, porque `tk`
no ofrece forma de limpiarlo al reabrir.

Es una distinción importante: **el valor obsoleto sigue en la base**. Si algún día
se lee `tacks.db` por otra vía, ahí estará. La API es la que no lo propaga.

## Flujo de carga

`reloadWorkspace(preferredId)` coordina la carga completa:

1. Incrementa `reloadRequestSequence` y conserva el número local.
2. Distingue carga inicial (`loading`) de recarga (`refreshing`).
3. Solicita tareas y etiquetas en paralelo.
4. Valida que ambas respuestas sean arrays.
5. Descarta la respuesta si una recarga posterior ya incrementó la secuencia.
6. Normaliza todas las tareas con `mapTask()`.
7. Conserva `preferredId` si sigue existiendo; en otro caso selecciona la
   primera tarea o deja la selección vacía.
8. Conserva los padres expandidos y colapsados que siguen presentes, y carga el
   detalle de la selección.
9. Solo la petición vigente puede retirar `loading` y `refreshing`.

Durante una recarga se mantienen visibles los últimos datos confirmados. La
función devuelve `true` al confirmar el nuevo estado, `false` ante un fallo
vigente y `null` cuando su respuesta quedó obsoleta.

## Selección y detalle

La lista y el detalle tienen fuentes distintas:

- `tasks` contiene la instantánea completa y alimenta árbol y filtros.
- `detail` contiene la respuesta enriquecida de la tarea seleccionada.
- `selectedTaskId` identifica la intención de selección actual.
- `selectedTask` combina detalle y fila listada; el estado de la lista prevalece
  para no presentar un estado antiguo en el inspector.

`loadTaskDetail()` incrementa `detailRequestSequence`. Solo aplica una respuesta
si sigue siendo la última y la selección no cambió. Al cambiar de tarea elimina
el detalle anterior antes de solicitar el nuevo, sincroniza el borrador de
edición al confirmar y puede abrir el inspector móvil.

## Flujo de mutación

Todas las escrituras de tareas y etiquetas pasan por
`mutate(key, request, message, preferredId, options)`:

```text
comprobar busy -> marcar busy -> ejecutar escritura
  -> servidor publica workspace.changed -> recargar workspace
  -> confirmar notificación o explicar recarga fallida -> retirar busy
```

La mutación no aplica cambios optimistas. La API confirma primero y la UI vuelve
a consultar tareas, etiquetas y detalle. Esto mantiene una única verdad
confirmada por TK y permite que cambios derivados, como bloqueos o usos de
etiquetas, lleguen juntos.

Si la escritura se confirma pero la recarga falla, el mensaje de error declara
explícitamente que la operación sí se realizó. El usuario no debe reintentar a
ciegas una mutación en ese estado.

Las claves `busy` impiden repetir la misma operación y deshabilitan el control
correspondiente. No serializan operaciones con claves diferentes.

## Árbol y filtros

`mappedTasks` enriquece cada tarea normalizada con:

- `level`, calculado al recorrer padres existentes;
- `children`, que indica si tiene descendientes directos.

`filteredTaskIds` combina filtros rápidos, estados, prioridades, etiquetas y
búsqueda normalizada. `visibleTasks` reconstruye el recorrido padre-hijo:

- sin filtros solo visita descendientes de padres expandidos;
- con cualquier filtro visita descendientes para encontrar coincidencias, salvo
  los padres que el usuario ha colapsado explícitamente, y agrega solo las tareas
  que cumplen el filtro;
- una tarea padre que no cumple el filtro no se agrega automáticamente por
  tener un hijo coincidente.

Los hijos conservan el orden recibido de la API. Los padres sin padre conocido
se tratan como raíces.

## Catálogo de etiquetas

El catálogo combina dos fuentes:

- **Las tareas**, que aportan las etiquetas realmente en uso y su número de usos.
- **`tag_metadata`**, que aporta descripción y color.

Una etiqueta puede existir en un solo lado: en las tareas (`uses > 0`, sin
metadatos) o solo en el catálogo (`uses: 0`, creada pero aún sin usar). El listado
rellena descripción y color ausentes con `""` y `"blue"`.

Renombrar o borrar recorre todas las tareas que usan la etiqueta y las actualiza
una a una con el CLI. No hay transacción: si una falla a mitad, las anteriores se
revierten en orden inverso y el error indica cuáles no se pudieron restaurar.

## Componentes

`AppShell` es el único componente que conoce directamente el workspace. Sus dos
ramas principales son:

- `TaskList`, que contiene filtros y filas y reemite eventos hacia la raíz.
- `TaskInspector`, que concentra detalle, edición, subtareas, dependencias y
  comentarios mediante un único evento `action`.

Los diálogos de alta y etiquetas reciben borradores inmutables desde la raíz y
emiten copias actualizadas. `TagPickerField` implementa el contrato estándar
`modelValue` / `update:modelValue`. `OverflowMenu` es una hoja sin conocimiento
de dominio. `notifications/toast-anchor.js` es el adapter único de Toast Anchor,
que vive vendorizado en `public/vendor/toast-anchor.mjs`: los componentes no
importan la librería directamente y `package.json` no declara dependencias de
ejecución (RNF-01).

### Diálogos modales

[`components/dialog-focus.js`](../src/task-manager/components/dialog-focus.js)
es un mixin compartido por los diálogos que declaran `aria-modal="true"`. Sin él
esa declaración sería falsa: promete al lector de pantalla que el resto de la
página queda inerte, y eso no ocurre solo.

El mixin, al abrirse el diálogo, recuerda dónde estaba el foco y lo mueve al
contenedor del diálogo —no a su primer control, para que el lector lo anuncie
por su nombre y no se abra sobre la «x» de cerrar—. Mientras está abierto,
`trapDialogTab` impide que el tabulador se escape: del último vuelve al primero
y del primero, hacia atrás, al último. Al cerrarse, el foco regresa al control
que lo abrió, si sigue en la página.

Los componentes marcan su elemento modal con `ref="dialogRoot"` y le ponen
`tabindex="-1"`. La confirmación de borrado del gestor de etiquetas es un
diálogo anidado y usa la misma pieza con su propio `ref`.

**El cierre con Escape no vive aquí.** Lo centraliza
[`state/ui.js`](../src/task-manager/state/ui.js) con `handleEscape()`, y
`workspace.js` registra un único listener global que lo invoca. Un solo sitio
decide qué se cierra, en vez de repartir esa decisión entre componentes. La
excepción es el selector de etiquetas, que se cierra a sí mismo cuando está
abierto y corta la propagación para que Escape cierre solo la capa más interna;
si está cerrado, deja pasar el evento.

Consulte [contracts.md](contracts.md) para los sobres exactos de datos y eventos.

## CSS y responsive

El orden de importación forma parte del contrato visual:

1. `tokens.css`: variables y base.
2. `layout.css`: estructura principal.
3. `components.css`: controles y componentes.
4. `responsive.css`: adaptaciones por anchura.

Cambiar este orden puede alterar la cascada aunque no cambie ninguna regla.
esbuild extrae los imports al único `app-vue.css` generado.

## Invariantes

- No hay `fetch` fuera del cliente.
- No hay invocaciones de `tk` fuera de `server/tk.js`.
- El formato bruto de TK no debe llegar a componentes.
- La selección debe seguir apuntando a una tarea existente tras recargar.
- Una respuesta de carga obsoleta no debe sobrescribir datos confirmados.
- Una escritura solo se presenta como completada después de recargar.
- Los componentes emiten intenciones y no mutan props.
- Los artefactos públicos se regeneran; nunca se corrigen a mano.
- Ninguna llamada de red saliente: el producto es estrictamente local.

Los límites actuales de estas garantías se registran en
[known-risks.md](known-risks.md).
