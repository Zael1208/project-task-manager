# Riesgos conocidos

Última revisión: 19 de septiembre de 2026.

Este registro contiene límites observables en el código o en la cobertura. No
implica que todos se hayan reproducido en producción. Al resolver uno, elimine su
entrada en el mismo cambio y añada la prueba que evita su regreso.

## Alta prioridad

No queda ninguno. TM-R1 y TM-R2, los dos que había, están resueltos: véase
「TM-R1 y TM-R2」 en la sección de resueltos, más abajo.

## Prioridad media

### TM-R4: no hay pruebas de componentes ni de navegador

**Ubicación:** `tests/task-manager/`.

La fixture de estado no monta Vue. La suite no detecta errores de plantilla,
argumentos reemitidos, nombres de `v-model`, foco, teclado, accesibilidad ni
regresiones responsive.

**Impacto:** un contrato documentado puede romperse en el cableado visual aunque
las pruebas unitarias sigan pasando.

**Mitigación actual:** props y emits están declarados y existe una matriz manual
en [operations.md](operations.md). Esa matriz es un criterio de recorrido, no
evidencia persistida de que todos los casos se hayan ejecutado.

**Estado parcial:** el 19/09/2026 Alfredo recorrió la aplicación en navegador y
el comportamiento funcional resultó correcto. Eso cubre el camino visual
principal, pero no sustituye a una prueba automatizada ni demuestra que se
hayan revisado de forma individualizada las cuatro anchuras de referencia ni el
detalle de accesibilidad.

**Avance:** se ha añadido la primera prueba de componentes del módulo
(`dialog-focus.test.js`, 10 pruebas), aunque sin montar DOM. El cableado de Vue
y el comportamiento en navegador siguen sin cubrirse automáticamente.

**Resolución recomendada:** priorizar pruebas del sobre `action`, los cinco
`v-model` del inspector y un recorrido de navegador desktop/móvil.

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

## Prioridad baja

No queda ninguno. TM-R6 y TM-R7 están resueltos: véase más abajo.

## Resueltos durante la extracción

| ID | Riesgo | Cómo se resolvió |
|---|---|---|
| RX-1 | Divergencia de datos entre el proyecto nuevo y el de origen | Se copió la base canónica y el origen no usaba la que el servidor esperaba. Decisión D-10. |
| RX-5 | Traer solo los artefactos generados y quedarse sin fuente mantenible | Se trajo la fuente, el pipeline y las pruebas. |
| RX-7 | Perder la licencia o la atribución de `tk` al copiar el binario | `tk/LICENSE` y `tk/README.md` viajan con el binario, verificado por hash. |
| RX-8 | Arrastrar dependencias ocultas del anfitrión | El servidor no lee ninguna variable ni ruta del proyecto de origen. |
| RX-2 | La prioridad no estaba validada y un valor ≥ 4 se mostraba como «Sin prioridad» | La API valida 0-3 al crear y al actualizar, y rechaza el resto con 400. Decisión QA-2. |
| RX-3 | Al reabrir, `close_reason` conservaba el valor anterior | El servidor solo presenta el motivo cuando la tarea está cerrada. Decisión QA-3. |
| TM-R10 | La marca visible era la del producto de origen | La cabecera y el título pasan a «Gestor de tareas». Decisión QA-5. |

**Nota sobre RX-3:** la corrección es de presentación, no de almacenamiento.
`tk` no ofrece ninguna bandera para limpiar `close_reason` y su base no se toca
(D-5), así que **el valor obsoleto sigue en la base**: consultándola con el CLI
se ve. La API es la que no lo propaga. Es una limitación deliberada y conviene
tenerla presente si algún día se lee `tacks.db` por otra vía.

### TM-R3, TM-R5, TM-R6 y TM-R7: los cuatro de baja y media — resueltos

Los cuatro eran pequeños y se han cerrado de una vez, cada uno con su prueba.

| Riesgo | Qué pasaba | Corrección |
|---|---|---|
| **TM-R3** | `visibleTasks` empezaba el recorrido solo en raíces. Un ciclo de padres no produce ninguna raíz, así que sus tareas **desaparecían del listado sin ningún error**. | Se calcula primero qué es alcanzable desde las raíces reales y lo que queda fuera se trata como raíz adicional. Se añadió protección de ciclos al recorrido, que además elimina el riesgo de recursión infinita. |
| **TM-R5** | Si la respuesta no era JSON, un 404 se marcaba como «capacidad no disponible» solo por el código de estado. Un 404 de un proxy o de una ruta mal escrita se presentaba como que el gestor de tareas estaba desactivado. | `unavailable` se reserva a la señal estructurada: 404 **y** el mensaje concreto en un cuerpo JSON válido. |
| **TM-R6** | El `switch` de acciones del inspector no tenía rama `default`: una acción mal emitida no hacía nada y no avisaba. | Rama `default` con `console.warn` indicando el tipo desconocido. |
| **TM-R7** | `setBusy(key, false)` dejaba la clave con valor `false` en vez de eliminarla; los identificadores cambian en cada operación, así que el diccionario crecía durante una sesión larga. | Se elimina la clave al desactivarla. |

**Cobertura:** cinco pruebas nuevas entre
[`task-tree.test.js`](../tests/task-manager/state/task-tree.test.js),
[`tk-client.test.js`](../tests/task-manager/api/tk-client.test.js),
[`inspector.test.js`](../tests/task-manager/state/inspector.test.js) y
[`ui.test.js`](../tests/task-manager/state/ui.test.js). **Se comprobó que fallan
sin los arreglos**: 5 fallos con el código anterior.

### TM-R1 y TM-R2: carreras de carga y mutación — resueltos

Eran los dos únicos de prioridad alta, y los dos con el mismo patrón de fondo: una
respuesta asíncrona que llega tarde y no comprueba si sigue siendo la vigente.

**TM-R1 — un fallo de detalle obsoleto publicaba un error sobre otra selección.**
La rama correcta de `loadTaskDetail()` comprobaba `detailRequestSequence` y
`selectedTaskId` antes de escribir; la rama `catch` no. Si se cambiaba de tarea
mientras la anterior seguía cargando y esa carga fallaba, el aviso de error
aparecía sobre la tarea nueva, que sí era válida. Corregido aplicando **la misma
guarda** en el `catch`, antes de `handleError()`.

**TM-R2 — una escritura confirmada podía quedarse sin confirmación visible.**
Las claves busy impiden repetir la misma operación, pero permiten dos distintas a
la vez, cada una con su recarga. La segunda incrementa la secuencia, así que la
recarga de la primera devuelve `null` y `mutate()` no mostraba nada: la operación
parecía no haberse realizado, aunque estaba guardada.

Se descartó serializar o agrupar las recargas —es más complejo y no aporta nada
aquí— y se definió la semántica que faltaba: **`null` no significa fallo, sino
que otra recarga posterior ha publicado ya un estado que incluye este cambio**, de
modo que la confirmación es correcta. Se añadió `null` a la condición que muestra
el aviso. El caso `false` sigue tratándose como fallo explícito, porque ahí la
recarga sí falló y el usuario no debe reintentar a ciegas.

**Cobertura:** dos pruebas nuevas en
[`task-actions.test.js`](../tests/task-manager/state/task-actions.test.js), una por
riesgo. **Ambas se comprobó que fallan sin el arreglo**, para que no fueran
pruebas vacías que pasan por casualidad.

### TM-R11: accesibilidad de los diálogos — resuelto, con una corrección

**Este riesgo se registró con un diagnóstico parcialmente erróneo y conviene
dejar constancia de ello.**

El diagnóstico original afirmaba tres carencias. La primera era **falsa**: decía
que Escape no cerraba los diálogos. Sí los cierra. `workspace.js` registra un
único listener global de `keydown` que llama a `handleEscape()`, y esa función
cierra los menús **y** los diálogos (`isNewTaskOpen`, `isTagManagerOpen`,
`deletingTag`). El error vino de buscar el manejo de teclado solo en los
componentes y de recortar el contexto al leer `ui.js`, de modo que no se vieron
las líneas que cierran los diálogos.

Lo que sí era cierto, y ya está corregido:

| Carencia | Corrección |
|---|---|
| No había gestión de foco: nada movía el foco al abrir, lo retenía ni lo devolvía | Mixin nuevo [`components/dialog-focus.js`](../src/task-manager/components/dialog-focus.js): al abrir, el foco entra en el diálogo y se recuerda de dónde venía; con el tabulador no se sale del diálogo; al cerrar, el foco vuelve al control de origen |
| La tarjeta de confirmación de borrado no tenía nombre accesible | `aria-labelledby` apuntando al `<h3>`, que ahora tiene `id` |
| — | La confirmación de borrado es un diálogo anidado: al abrirse el foco entra en ella y al cancelarse vuelve al cajón |

Además se corrigió un defecto real que apareció al revisar esta área: con el
selector de etiquetas abierto dentro del diálogo de nueva tarea, **un solo
Escape cerraba las dos capas**, porque el selector y el espacio de trabajo
escuchaban el mismo evento en `window`. Ahora el selector se registra en fase de
captura, solo actúa si está abierto y corta la propagación, de modo que Escape
cierra únicamente la capa más interna. Si está cerrado, deja pasar el evento.

**Cobertura:** [`tests/task-manager/components/dialog-focus.test.js`](../tests/task-manager/components/dialog-focus.test.js),
10 pruebas. Cubren el algoritmo —entrar, devolver el foco, no devolverlo a un
elemento que ya no está, filtrar los elementos no visibles y envolver el
tabulador en los cuatro casos—, no el cableado de Vue.

Ese cableado —que el watcher de `open` dispare la entrada de foco y que
`ref="dialogRoot"` apunte al elemento correcto— se verificó **manualmente en
navegador el 19/09/2026**: el foco entra, el tabulador no se escapa y vuelve al
control de origen. Es una comprobación puntual, no una garantía: **nada protege
esto de una regresión futura**. Sigue sin haber pruebas que monten componentes
con DOM (TM-R4), y esa es la vía para cerrarlo de verdad.

## Riesgos que quedan del análisis de la extracción

| ID | Riesgo | Por qué sigue abierto |
|---|---|---|
| RX-4 | El renombrado en cascada no es transaccional | Registrado como TM-R9 |
| RX-6 | `node:sqlite` puede cambiar entre versiones de Node | Mitigado fijando `engines.node >= 22.5.0` |

## Cobertura de seguimiento

| Riesgo | Prueba mínima para cerrarlo |
|---|---|
| TM-R1 | **Cubierto**: «does not publish an error from an obsolete task detail failure» |
| TM-R2 | **Cubierto**: «confirms a mutation whose reload was superseded by a later one» |
| TM-R3 | **Cubierto**: «shows tasks that form a parent cycle instead of hiding them» |
| TM-R4 | Montaje de inspector y recorrido responsive en navegador |
| TM-R5 | **Cubierto**: «does not treat a 404 without a JSON body as a disabled capability» |
| TM-R6 | **Cubierto**: «warns instead of staying silent when the action type is unknown» |
| TM-R7 | **Cubierto**: «removes the busy key when the operation ends instead of storing false» |
| TM-R8 | Integración de servidor con base desechable |
| TM-R9 | Fallo simulado a mitad del renombrado en cascada |
| TM-R11 | **Cubierto**: `dialog-focus.test.js` prueba entrar, devolver el foco y envolver el tabulador. Falta el montaje real de Vue |
