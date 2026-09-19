# Riesgos conocidos

Última revisión: 19 de septiembre de 2026.

Este registro contiene límites observables en el código o en la cobertura. No
implica que todos se hayan reproducido en producción. Al resolver uno, elimine su
entrada en el mismo cambio y añada la prueba que evita su regreso.

## Alta prioridad

### TM-R1: un fallo de detalle obsoleto puede publicar un error

**Ubicación:** [`state/task-actions.js`](../src/task-manager/state/task-actions.js),
`loadTaskDetail()`.

La respuesta correcta comprueba `detailRequestSequence` y `selectedTaskId` antes
de escribir `detail`. La rama `catch` no realiza esa comprobación. Si una
solicitud antigua falla después de seleccionar y cargar otra tarea, puede
sobrescribir `errorMessage` aunque sus datos ya no sean relevantes.

**Impacto:** aviso de error engañoso sobre una selección válida.

**Mitigación actual:** los datos obsoletos no sustituyen el detalle; el riesgo se
limita al mensaje de error.

**Resolución recomendada:** aplicar la misma guarda de vigencia antes de
`handleError()` y cubrir la carrera con una prueba.

### TM-R2: mutaciones distintas pueden solapar sus recargas

**Ubicación:** [`state/task-actions.js`](../src/task-manager/state/task-actions.js),
`mutate()` y `reloadWorkspace()`.

Las claves busy impiden repetir la misma operación, pero permiten mutaciones con
claves diferentes. Cada una inicia una recarga. La secuencia hace que la recarga
anterior devuelva `null`; `mutate()` no presenta toast ni error para ese retorno.

**Impacto:** una escritura confirmada puede quedar sin confirmación visible. La
última recarga sigue protegiendo el estado contra datos antiguos.

**Mitigación actual:** el estado final procede de la recarga más reciente y los
controles de una misma operación no se duplican.

**Resolución recomendada:** definir semántica para `null` dentro de `mutate()` o
serializar/coalescer recargas posteriores a escrituras; probar dos claves en
paralelo.

## Prioridad media

### TM-R3: un ciclo completo de padres puede ocultar tareas

**Ubicación:** [`state/task-tree.js`](../src/task-manager/state/task-tree.js),
`visibleTasks`.

`mappedTasks` evita recursión infinita al calcular niveles, pero `visibleTasks`
empieza su recorrido solo en raíces. Si varias tareas forman un ciclo y ninguna
queda como raíz, ninguna entra en el recorrido.

**Impacto:** datos corruptos o relaciones cíclicas pueden desaparecer del listado
sin un error explícito.

**Mitigación actual:** TK debería impedir jerarquías cíclicas; padres ausentes sí
se muestran como raíces.

**Resolución recomendada:** confirmar la garantía del servidor o agregar un
recorrido de nodos no visitados con protección de ciclos y prueba dedicada.

### TM-R4: no hay pruebas de componentes ni de navegador

**Ubicación:** `tests/task-manager/`.

La fixture de estado no monta Vue. La suite no detecta errores de plantilla,
argumentos reemitidos, nombres de `v-model`, foco, teclado, accesibilidad ni
regresiones responsive.

**Impacto:** un contrato documentado puede romperse en el cableado visual aunque
las 18 pruebas unitarias sigan pasando.

**Mitigación actual:** props y emits están declarados y existe una matriz manual
en [operations.md](operations.md). Esa matriz es un criterio de recorrido, no
evidencia persistida de que todos los casos se hayan ejecutado.

**Resolución recomendada:** priorizar pruebas del sobre `action`, los cinco
`v-model` del inspector y un recorrido de navegador desktop/móvil.

### TM-R5: cualquier JSON inválido con 404 se marca como indisponibilidad

**Ubicación:**
[`api/tk-client.js`](../src/task-manager/api/tk-client.js), parseo de respuesta.

Cuando `response.json()` falla, `unavailable` se calcula solo con
`response.status === 404`. No se puede comprobar el mensaje específico usado en
la rama de JSON válido.

**Impacto:** un 404 HTML o malformado de infraestructura puede mostrarse como
capacidad TK deshabilitada, ocultando un problema de ruta o proxy.

**Mitigación actual:** otros estados con JSON inválido se presentan como error
genérico de respuesta. En este proyecto el 404 de capacidad lo emite nuestro
propio servidor, así que la causa probable se reduce.

**Resolución recomendada:** reservar `unavailable` para una señal estructurada o
endpoint de capacidad y ampliar la prueba de JSON inválido 404.

### TM-R8: el servidor no tiene pruebas automatizadas

**Ubicación:** `server/`, `tests/`.

Los 19 endpoints se han verificado a mano, pero no hay ninguna prueba que los
cubra. Un cambio en `server/tasks.js`, `server/tags.js` o `server/tk.js` puede
romper la API sin que `npm test` se entere.

**Impacto:** regresión silenciosa en la capa que la interfaz consume entera.

**Mitigación actual:** verificación manual documentada en
[operations.md](operations.md). Al ser código determinista y sin dependencias,
es fácil de probar.

**Resolución recomendada:** añadir pruebas de integración que levanten el
servidor con una base desechable y recorran los endpoints principales, incluido
el cruce de `blocked` y la reversión del renombrado en cascada.

### TM-R9: el renombrado de etiquetas en cascada no es transaccional

**Ubicación:** [`server/tags.js`](../server/tags.js), `handleTagUpdate()` y
`handleTagDelete()`.

Renombrar o borrar una etiqueta recorre las tareas una a una con el CLI, sin
transacción. Si una invocación falla a mitad, las anteriores se revierten en
orden inverso.

**Impacto:** si también falla la reversión, algunas tareas conservan el nombre
nuevo y otras el viejo. La respuesta indica qué tareas no se pudieron restaurar,
pero el estado queda inconsistente y hay que arreglarlo a mano.

**Mitigación actual:** reversión implementada y mensaje explícito con los IDs que
no se pudieron restaurar.

**Resolución recomendada:** cubrirlo con una prueba que simule un fallo a mitad,
y valorar si merece la pena agrupar el cambio en una sola invocación.

### TM-R10: la marca visible todavía es la del producto de origen

**Ubicación:**
[`app-shell.js`](../src/task-manager/app-shell.js), cabecera.

La interfaz muestra `Tacks Workspace` como título y `ChatVoiceAgent · Vue 3` como
subtítulo. El segundo es el nombre del producto del que se extrajo el gestor.

**Impacto:** la aplicación independiente muestra el nombre de otro producto.
Confunde sobre qué se está usando.

**Mitigación actual:** ninguna. Se conserva a propósito para no romper la
reproducibilidad byte a byte del build durante la extracción.

**Resolución recomendada:** decidir el nombre definitivo (cuestión QA-5 del
[PRD](../PRD.md)), cambiarlo de una vez, regenerar el artefacto y registrar la
nueva línea base de hashes.

## Prioridad baja

### TM-R6: acciones desconocidas del inspector se ignoran

**Ubicación:** [`state/inspector.js`](../src/task-manager/state/inspector.js),
`handleInspectorAction()`.

El `switch` no tiene rama `default`. Un error tipográfico al emitir una acción no
produce aviso ni fallo de desarrollo.

**Impacto:** un control nuevo puede no responder y ser difícil de diagnosticar.

**Mitigación actual:** los tipos admitidos están centralizados y documentados.

**Resolución recomendada:** decidir si se desea advertencia solo en desarrollo o
una prueba exhaustiva del contrato antes de añadir comportamiento en runtime.

### TM-R7: el diccionario busy conserva claves con valor falso

**Ubicación:** [`state/ui.js`](../src/task-manager/state/ui.js), `setBusy()`.

Al finalizar una operación se asigna `false` en vez de eliminar la propiedad. IDs
o nombres distintos aumentan gradualmente el número de claves durante una sesión
larga.

**Impacto:** crecimiento pequeño de memoria y estado de depuración más ruidoso;
`isBusy()` conserva el comportamiento correcto.

**Mitigación actual:** el volumen normal de operaciones es reducido.

**Resolución recomendada:** eliminar la clave al desactivarla si se observa un
problema real; no es prioritario frente a los riesgos de concurrencia.

## Resueltos durante la extracción

| ID | Riesgo | Cómo se resolvió |
|---|---|---|
| RX-1 | Divergencia de datos entre el proyecto nuevo y el de origen | Se copió la base canónica y el origen no usaba la que el servidor esperaba. Decisión D-10. |
| RX-5 | Traer solo los artefactos generados y quedarse sin fuente mantenible | Se trajo la fuente, el pipeline y las pruebas. |
| RX-7 | Perder la licencia o la atribución de `tk` al copiar el binario | `tk/LICENSE` y `tk/README.md` viajan con el binario, verificado por hash. |
| RX-8 | Arrastrar dependencias ocultas del anfitrión | El servidor no lee ninguna variable ni ruta del proyecto de origen. |

## Riesgos que quedan del análisis de la extracción

| ID | Riesgo | Por qué sigue abierto |
|---|---|---|
| RX-2 | La prioridad no está validada por `tk`; un valor ≥ 4 se muestra como «Sin prioridad» porque la interfaz solo conoce 0-3 | Depende de la decisión QA-2 del [PRD](../PRD.md) |
| RX-3 | Al reabrir, `close_reason` conserva el valor anterior | Depende de la decisión QA-3 del [PRD](../PRD.md) |
| RX-4 | El renombrado en cascada no es transaccional | Registrado como TM-R9 |
| RX-6 | `node:sqlite` puede cambiar entre versiones de Node | Mitigado fijando `engines.node >= 22.5.0` |

## Cobertura de seguimiento

| Riesgo | Prueba mínima para cerrarlo |
|---|---|
| TM-R1 | Fallo tardío de detalle A después de confirmar detalle B |
| TM-R2 | Dos mutaciones con claves distintas y recargas intercaladas |
| TM-R3 | Ciclo de dos padres sin raíz |
| TM-R4 | Montaje de inspector y recorrido responsive en navegador |
| TM-R5 | Respuesta 404 con cuerpo no JSON |
| TM-R6 | Todos los tipos del inspector llegan al método esperado |
| TM-R7 | No requiere prueba hasta decidir cambiar la representación |
| TM-R8 | Integración de servidor con base desechable |
| TM-R9 | Fallo simulado a mitad del renombrado en cascada |
| TM-R10 | Recorrido visual que compruebe la marca definitiva |
