# Registro de cambios

Cambios relevantes del gestor de tareas local. El formato sigue las
recomendaciones de *Keep a Changelog* y el versionado es semántico.

Las versiones se publican desde `main` con una etiqueta anotada `vMAJOR.MINOR.PATCH`.

## [Sin publicar]

### Añadido

- **Delimitación del proyecto para herramientas** (`jsconfig.json`): fija el
  alcance en `src/`, `server/` y `tests/` para que el servidor de lenguaje
  resuelva referencias en todo el repositorio y no solo en los ficheros abiertos.
  No interviene en la ejecución, en el build ni en las pruebas.

### Cambiado

- **La página sirve el build de producción de Vue** (`vue.global.prod.js`) en vez
  del de desarrollo: la carga útil pasa de 591 KB a 166 KB y desaparecen los avisos
  de desarrollo. El build de desarrollo se conserva en `public/vendor/` para
  depurar, y las pruebas montan los componentes con el mismo fichero que sirve la
  página.
- **Limpieza interna sin cambio de comportamiento**: la tabla de tipos MIME se
  reduce a lo que `public/` contiene de verdad (html, js, css y json); el aviso de
  reversión de etiquetas deja de estar duplicado cuatro veces en `server/tags.js`,
  que ahora lo compone `restoreTagUpdates`; y `MIME` deja de exportarse desde
  `server/http.js` porque ningún módulo lo importaba.
- **Deuda técnica declarada en `server/tags.js`**: los dos atajos conocidos —el
  recorrido completo del catálogo al buscar metadatos y la recarga de todas las
  tareas en cada listado de etiquetas— quedan marcados con comentarios
  `ponytail:` que nombran su techo y la vía de mejora. Así son cosechables en un
  registro en vez de quedar en decisiones que nadie recuerda haber tomado.
- **Idioma de los mensajes de commit y de etiqueta anotada**: pasan a escribirse
  en inglés. El código, los comentarios, la documentación y la interfaz siguen en
  español de España, y los commits anteriores no se reescriben.

### Seguridad

- **Actualizado `vitest` de 4.1.10 a 4.1.11**, que corrige CVE-2026-84373
  (recorrido de rutas en `@vitest/mocker`, CVSS 5.9). `npm audit` pasa de 2
  vulnerabilidades moderadas a 0. Afecta solo a dependencias de desarrollo: el
  producto no tiene dependencias de runtime.

## [0.1.0] - 2026-09-19

Primera entrega funcional: el gestor de tareas extraído a un proyecto
independiente, sin dependencias de otros productos y con soporte para Windows y
WSL.

### Añadido

- **Servidor local propio** (`server/`), sin framework y sin dependencias de
  runtime, que sirve la interfaz y expone la API del gestor. Sustituye a la capa
  que vivía incrustada en el servidor del proyecto de origen.
- **19 endpoints HTTP**: 14 de tareas (listado, detalle, subtareas, bloqueos,
  estadísticas, progreso de épicas, conteo activo, creación, edición, cierre,
  dependencias, comentarios) y 5 de etiquetas (listado, alta, edición, borrado y
  vista previa de tareas afectadas).
- **Catálogo de etiquetas con base de datos propia** (`data/task-manager.db`),
  con nombre, descripción, color y número de usos. Renombrar o borrar una
  etiqueta se propaga a todas las tareas que la usan, con reversión si falla a
  mitad.
- **Modo degradado**: si el gestor de tareas no está disponible, la interfaz se
  sigue sirviendo y la API responde con el aviso correspondiente en lugar de
  fallar.
- **Guía de desarrollo** (`docs/development.md`) y documentación completa del
  proyecto en `docs/`: arquitectura, contratos, operación y riesgos conocidos.
- **Contrato de flujo de Git** adaptado al proyecto.
- **Configuración por variables de entorno**: puerto, rutas de ambas bases de
  datos, carpeta del binario y tiempo máximo de ejecución, todas con valores por
  defecto utilizables.
- **Gestión de foco en los diálogos modales**: al abrirse, el foco entra en el
  diálogo; el tabulador no puede salir de él; al cerrarse, el foco vuelve al
  control que lo abrió. Antes, un diálogo que se declaraba modal no retenía el
  foco, de modo que quien navega con teclado podía acabar detrás de él.
- **Pruebas del comportamiento de foco** (`dialog-focus.test.js`, 10 pruebas):
  entrar, devolver el foco, no devolverlo a un elemento que ya no está en la
  página, filtrar los elementos no visibles y envolver el tabulador.
- **Pruebas de integración del servidor** (`tests/server/api.test.js`, 11
  pruebas): levantan el servidor de verdad en un puerto libre y sobre una base
  desechable que el propio gestor de tareas crea vacía, y recorren el arranque,
  los ficheros estáticos, el bloqueo de rutas, la validación de prioridad, el
  ciclo completo de una tarea, el cruce del estado bloqueado, el guardián de
  cierre, la coherencia del motivo de cierre y la cascada del catálogo de
  etiquetas. No tocan ni el backlog ni el catálogo reales.
- **Soporte para Linux y WSL**: se incorpora el binario de Linux del gestor de
  tareas subyacente, verificado contra el `sha256` que publica su autor y marcado
  ejecutable en el índice de git. El servidor elige el binario según la
  plataforma, así que el mismo repositorio funciona en Windows y en WSL sin ningún
  paso adicional. Antes, en WSL el gestor arrancaba con la capacidad desactivada.
- **Pruebas de componentes con Vue montado de verdad** (jsdom, 30 pruebas):
  comprueban el sobre `action` llegando a su destino, los cinco `v-model` del
  inspector, los eventos de intención del gestor de etiquetas, el contrato del
  selector de etiquetas y el foco de los diálogos. Hasta ahora esa parte del
  cableado solo la cubrían revisiones manuales en el navegador, sin nada que las
  protegiera de una regresión. jsdom es una dependencia **de desarrollo**: no
  viaja al producto.

### Cambiado

- El gestor de tareas **deja de depender del producto del que se extrajo**: ya no
  necesita su servidor, su base de datos ni su empaquetado de escritorio.
- El catálogo de etiquetas **abandona la base de datos compartida** del proyecto
  de origen y pasa a un archivo propio, para no depender del ciclo de vida de una
  base administrada por un binario de terceros.
- El puerto por defecto es **8890**, distinto del que usaba el proyecto de origen
  (8792), para poder ejecutar ambos a la vez.
- Las dependencias de desarrollo (`esbuild` y `vitest`) quedan **fijadas a
  versiones exactas** para que el build sea reproducible byte a byte.
- El documento de relevo pasa a ser una **guía de desarrollo**: el estado vivo se
  registra en el `PRD.md` y en este `CHANGELOG.md`.
- La interfaz pasa a llamarse **«Gestor de tareas»** en la cabecera y en el
  título de la página, y deja de mostrar el nombre del producto del que se
  extrajo. La marca del icono pasa de «T» a «G».

### Corregido

- El arranque informa del **motivo exacto** por el que la capacidad de tareas no
  está disponible, distinguiendo «deshabilitada a propósito» de «falta el
  binario». Antes ambos casos se presentaban igual.
- El enrutado del servidor ya no admite coincidencias por prefijo accidentales:
  los prefijos incluyen la barra final, de modo que `/api/tk/show/` no casa con
  `/api/tk/showcase`.
- La resolución de ficheros estáticos comprueba también la ruta real del archivo,
  de modo que un enlace simbólico tampoco permite salir de `public/`.
- **Escape cierra solo la capa más interna.** Con el selector de etiquetas abierto
  dentro del diálogo de nueva tarea, un solo Escape cerraba los dos, porque el
  selector y el espacio de trabajo escuchaban el mismo evento en `window`. Ahora
  el selector se registra en fase de captura, actúa solo si está abierto y corta
  la propagación. Si está cerrado, deja pasar el evento.
- **La tarjeta de confirmación de borrado tiene nombre accesible**: declara
  `role="dialog"` pero no tenía `aria-label` ni `aria-labelledby`, así que el
  lector de pantalla la anunciaba sin título.
- **La prioridad se valida.** El gestor de tareas subyacente acepta cualquier
  entero como prioridad —se comprobó con un valor 5— pero la interfaz solo
  representa cuatro niveles, de 0 a 3. Se guardaba el valor y luego aparecía como
  «Sin prioridad», sin poder volver a elegirlo. Ahora la API rechaza lo que no
  puede representar.
- **Al reabrir una tarea deja de mostrarse el motivo de cierre anterior.** El
  gestor subyacente no permite borrarlo, así que una tarea abierta podía seguir
  diciendo que se cerró por `done`. La API solo presenta el motivo cuando la
  tarea está realmente cerrada.
- **Un fallo tardío del detalle ya no publica un error sobre otra selección.** Si
  se cambiaba de tarea mientras la anterior aún se estaba cargando y esa carga
  fallaba, el aviso de error aparecía sobre la tarea nueva, que sí era válida. La
  rama de error no comprobaba que su petición siguiera siendo la vigente; la rama
  correcta sí lo hacía.
- **Una escritura confirmada ya no se queda sin confirmación visible.** Cuando
  dos operaciones distintas lanzaban recargas solapadas, la más antigua quedaba
  superada y no mostraba nada, de modo que la operación parecía no haberse
  realizado aunque estaba guardada. Ahora confirma igualmente, porque la recarga
  más reciente publica un estado que ya incluye ese cambio.
- **El árbol ya no puede ocultar tareas por un ciclo de padres.** El listado
  empezaba el recorrido solo en tareas raíz, y un ciclo de padres no produce
  ninguna, así que esas tareas desaparecían sin ningún error. Ahora se recorren
  también, con protección de ciclos.
- **Un 404 sin cuerpo JSON ya no se confunde con la capacidad desactivada.** Se
  presentaba como «capacidad no disponible» solo por el código de estado, lo que
  ocultaba un problema de ruta o de proxy detrás de un aviso equivocado.
- **Una acción de interfaz mal emitida avisa en vez de no hacer nada.** El
  despachador de acciones del inspector no tenía rama por defecto, así que un
  error tipográfico dejaba el control sin responder, sin ninguna pista.
- **El registro de operaciones en curso ya no acumula claves.** Al terminar se
  marcaban como inactivas en lugar de eliminarse, y como los identificadores
  cambian en cada operación, el diccionario crecía durante una sesión larga.

### Seguridad

- Todas las invocaciones del gestor de tareas usan `execFile` con argumentos en
  array, nunca interpolación de shell.
- No hay ninguna llamada de red saliente: el producto es estrictamente local.
- Las bases de datos y las dependencias están excluidas del control de versiones.

### Notas de la extracción

- El binario `tk/tk.exe` es software de terceros ([tacks](https://github.com/srmccray/tacks)
  0.2.4, licencia MIT). Se incluye sin modificar, junto con su licencia.
- Los datos de tareas se copiaron desde la base canónica del proyecto de origen:
  **30 tareas reales**, que sirven además como banco de pruebas.
- El build reproduce `app-vue.js` y `app-vue.css` con **hash idéntico** a los
  artefactos del proyecto de origen, lo que demuestra que la fuente y el pipeline
  se trasladaron sin perder nada. Esa igualdad se mantuvo hasta el primer cambio
  funcional del frontend; desde entonces la línea base es la de este proyecto.
- La suite de pruebas se trasladó intacta: 4 archivos, 18 pruebas. Después se
  añadieron el foco de diálogos, pruebas de estado e integración del servidor, así
  que la suite vigente tiene 12 archivos y 77 pruebas.

### Limitaciones conocidas de esta entrega

Se registran aquí porque afectan al uso, no porque sean defectos de la
extracción. El detalle está en [`docs/known-risks.md`](docs/known-risks.md).

- **No hay pruebas que monten componentes Vue** (TM-R4): la suite prueba lógica
  con contextos mínimos y un DOM simulado, no plantillas ni comportamiento real
  de navegador. El cableado de foco de los diálogos se comprueba a mano.
- **El renombrado de etiquetas en cascada no es transaccional** (TM-R9): si falla
  a mitad, se revierte, y las tareas que no se pudieron restaurar se indican en
  el mensaje de error.
- **El motivo de cierre obsoleto sigue en la base de datos.** La API ya no lo
  presenta en tareas abiertas, pero `tk` no ofrece forma de borrarlo y su base no
  se toca, así que consultándola por CLI se sigue viendo.
