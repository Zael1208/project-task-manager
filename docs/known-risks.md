# Riesgos conocidos

Última revisión: 19 de septiembre de 2026.

Este registro contiene límites observables en el código o en la cobertura. No
implica que todos se hayan reproducido en producción. Al resolver uno, elimine su
entrada en el mismo cambio y añada la prueba que evita su regreso.

## Alta prioridad

No queda ninguno. TM-R1 y TM-R2, los dos que había, están resueltos: véase
「TM-R1 y TM-R2」 en la sección de resueltos, más abajo.

## Prioridad media

### TM-R4: no hay pruebas de navegador ni de responsive

**Ubicación:** `tests/task-manager/`.

**Lo que ya está cubierto:** el cableado de los componentes se prueba montando
Vue de verdad con jsdom. Se comprueban el sobre `action` llegando a su destino,
los cinco `v-model` del inspector, los eventos de intención del gestor de
etiquetas, el contrato `modelValue` del selector de etiquetas —incluido que no
muta el array que recibe—, y el foco de los diálogos: que entre al abrirse,
envuelva con el tabulador y vuelva al cerrarse. Son 30 pruebas en
`tests/task-manager/components/`.

**Lo que sigue sin cubrirse:** jsdom **no tiene motor de composición**. No calcula
geometría, así que no valida CSS, ni las anchuras de referencia, ni los anillos de
foco, ni el teclado real del navegador. La comprobación en navegador del
19/09/2026 cubrió el camino funcional principal y el foco de los diálogos, pero no
demuestra que se hayan revisado de forma individualizada las cuatro anchuras.

**Impacto:** una regresión visual o de responsive puede pasar en verde. El
cableado lógico de los componentes ya no.

**Resolución recomendada:** un recorrido de navegador desktop/móvil, que es
infraestructura aparte y no se ha acometido.

### TM-R8: el servidor no tenía pruebas automatizadas — resuelto

Los 19 endpoints solo estaban verificados a mano, de modo que un cambio en
`server/tasks.js`, `server/tags.js` o `server/tk.js` podía romper la API sin que
`npm test` se enterase.

**Corrección:** [`tests/server/api.test.js`](../tests/server/api.test.js), 11
pruebas de integración que **levantan el servidor de verdad**, en un puerto libre
y sobre una base desechable que el propio gestor de tareas crea vacía. Recorren el
arranque, los estáticos, el bloqueo de rutas, la validación de prioridad, el ciclo
completo de una tarea, el cruce de `blocked`, el guardián de cierre, la coherencia
de `close_reason` y la cascada del catálogo de etiquetas. No tocan ni el backlog
ni el catálogo reales.

Dos ajustes que hicieron falta, ambos pequeños y con motivo:

- El servidor acepta **`PORT=0`** para que el sistema elija un puerto libre. Sin
  eso, las pruebas chocarían con una instancia en marcha. `startServer()` devuelve
  ahora el puerto real, que no es el 0 que se pidió.
- [`server/tags.js`](../server/tags.js) expone `closeTagDatabase()`. En Windows no
  se puede borrar la carpeta temporal mientras la base del catálogo siga abierta,
  así que sin cerrarla las pruebas no podían limpiar lo que crean.

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
| TM-R4 | Recorrido de navegador desktop/móvil y anchuras. El montaje de componentes ya está cubierto |
| TM-R5 | **Cubierto**: «does not treat a 404 without a JSON body as a disabled capability» |
| TM-R6 | **Cubierto**: «warns instead of staying silent when the action type is unknown» |
| TM-R7 | **Cubierto**: «removes the busy key when the operation ends instead of storing false» |
| TM-R8 | **Cubierto**: `tests/server/api.test.js`, 16 pruebas de integración contra un servidor real y una base desechable |
| TM-R9 | Fallo simulado a mitad del renombrado en cascada |
| TM-R11 | **Cubierto**: `dialog-focus.test.js` prueba entrar, devolver el foco y envolver el tabulador. Falta el montaje real de Vue |
