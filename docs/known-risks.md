# Riesgos conocidos

Última revisión: 19 de septiembre de 2026.

Este registro contiene límites observables en el código o en la cobertura. No
implica que todos se hayan reproducido en producción. Al resolver uno, elimine su
entrada en el mismo cambio y añada la prueba que evita su regreso.

## Alta prioridad

No queda ninguno. TM-R1 y TM-R2, los dos que había, están resueltos: véase
「TM-R1 y TM-R2」 en la sección de resueltos, más abajo.

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
| RX-2 | La prioridad no estaba validada y un valor ≥ 4 se mostraba como «Sin prioridad» | La API valida 0-3 al crear y al actualizar, y rechaza el resto con 400. Decisión QA-2. |
| RX-3 | Al reabrir, `close_reason` conservaba el valor anterior | El servidor solo presenta el motivo cuando la tarea está cerrada. Decisión QA-3. |
| TM-R10 | La marca visible era la del producto de origen | La cabecera y el título pasan a «Gestor de tareas». Decisión QA-5. |

**Nota sobre RX-3:** la corrección es de presentación, no de almacenamiento.
`tk` no ofrece ninguna bandera para limpiar `close_reason` y su base no se toca
(D-5), así que **el valor obsoleto sigue en la base**: consultándola con el CLI
se ve. La API es la que no lo propaga. Es una limitación deliberada y conviene
tenerla presente si algún día se lee `tacks.db` por otra vía.

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
| TM-R3 | Ciclo de dos padres sin raíz |
| TM-R4 | Montaje de inspector y recorrido responsive en navegador |
| TM-R5 | Respuesta 404 con cuerpo no JSON |
| TM-R6 | Todos los tipos del inspector llegan al método esperado |
| TM-R7 | No requiere prueba hasta decidir cambiar la representación |
| TM-R8 | Integración de servidor con base desechable |
| TM-R9 | Fallo simulado a mitad del renombrado en cascada |
| TM-R11 | **Cubierto**: `dialog-focus.test.js` prueba entrar, devolver el foco y envolver el tabulador. Falta el montaje real de Vue |
