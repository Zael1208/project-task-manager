# Operación y validación

## Requisitos

- **Node.js 22.5 o superior** (por `node:sqlite`, que es nativo).
- Windows para el binario `tk.exe` incluido.

No hay dependencias de runtime. `esbuild` y `vitest` son solo de desarrollo, y
están fijadas a versiones exactas para que el build sea reproducible.

## Instalación

```powershell
npm install
npm run build
npm test
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run server` | Arranca el servidor en el puerto 8890 |
| `npm run dev` | Igual, con recarga al cambiar el servidor |
| `npm run build` | Compila el frontend a `public/task-manager/` |
| `npm run watch` | Recompila al cambiar la fuente |
| `npm test` | Ejecuta la suite de Vitest |
| `npm run test:watch` | Vitest en modo interactivo |

La aplicación queda en `http://localhost:8890/task-manager/app-vue.html`. La raíz
`/` redirige allí.

## Configuración

| Variable | Para qué | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `8890` |
| `TACKS_DB` | Ruta de la base de tareas | `tk/.tacks/tacks.db` |
| `DATA_DIR` | Carpeta de la base de etiquetas | `data/` |
| `TAGS_DB` | Ruta de la base de etiquetas | `data/task-manager.db` |
| `TK_ROOT` | Carpeta del binario `tk` | `tk/` |
| `TK_WORK_DIR` | Directorio de trabajo de `tk` | `tk/` |
| `TK_TIMEOUT_MS` | Tiempo máximo por invocación de `tk` | `5000` |
| `DISABLE_TK` | `1` arranca sin la capacidad de tareas | — |

## Propiedad de archivos

| Archivo | Propietario | Política |
|---|---|---|
| `server/**/*.js` | Desarrollo | Editar y probar |
| `src/task-manager/**/*.js` | Desarrollo | Editar y probar |
| `src/task-manager/styles/*.css` | Desarrollo | Editar respetando la cascada |
| `public/task-manager/app-vue.html` | Desarrollo | Mantener a mano |
| `public/task-manager/app-vue.js` | esbuild | Regenerar y versionar |
| `public/task-manager/app-vue.css` | esbuild | Regenerar y versionar |
| `tk/**` | Terceros | **No modificar** |
| `tk/.tacks/`, `data/*.db` | Datos locales | No versionar |

No mezcle una corrección manual de `public/task-manager/app-vue.js` o CSS con la
fuente. El siguiente build la perdería.

## Build reproducible

La entrada es `src/task-manager/main.js`. esbuild produce formato IIFE con
objetivo ES2020. Los imports CSS se extraen automáticamente.

Las versiones de `esbuild` y `vitest` están fijadas sin rango (`0.28.1` y
`4.1.10`) precisamente para que el artefacto salga idéntico byte a byte. Con un
rango `^`, esa garantía se pierde.

Después de cambiar JavaScript o CSS:

1. Ejecute `npm run build`.
2. Compruebe que existen `app-vue.js` y `app-vue.css`.
3. Revise los cambios de fuente y artefactos juntos.
4. No acepte diferencias de artefactos sin una diferencia fuente explicable.

El orden de imports CSS en `main.js` debe seguir siendo tokens, layout,
componentes y responsive.

## Pruebas automatizadas

La suite vive en `tests/task-manager/` y ejecuta módulos ES directamente.

Cobertura actual (4 archivos, 18 pruebas):

- **Cliente HTTP**: JSON válido, red, JSON inválido, error HTTP y capacidad TK
  deshabilitada.
- **Mapper**: valores por defecto, tipos de tarea, alias, relaciones y
  comentarios.
- **Árbol**: niveles, expansión y combinación de filtros.
- **Acciones**: selección tras recarga, descarte de respuestas obsoletas, busy,
  normalización de prioridad y mutación confirmada con recarga fallida.

[`tests/task-manager/helpers/workspace-fixture.js`](../tests/task-manager/helpers/workspace-fixture.js)
ensambla los mismos mixins en un objeto JavaScript, sin montar Vue ni DOM. Esto
hace las pruebas rápidas, pero no valida plantillas, props en tiempo de
ejecución, foco ni responsive.

Las pruebas simulan el cliente HTTP y no escriben en ninguna base de datos.

### Qué NO cubre la suite

El servidor no tiene pruebas automatizadas. Su verificación es manual y está en
la matriz de abajo. Tampoco hay pruebas de componentes, de navegador ni del
comportamiento frente a `tk` real.

## Criterios de validación manual

Cada recorrido realizado debe registrarse con fecha, comando o URL y resultado.

Para una sesión local:

1. Prepare una copia desechable de la base TK si va a crear o mutar datos. **No
   hay comando de borrado**, así que las tareas de prueba se quedan.
2. Ejecute `npm run build`.
3. Ejecute `npm run server`.
4. Abra `http://localhost:8890/task-manager/app-vue.html`.
5. Revise consola y red antes y después de cada flujo.

### Matriz funcional mínima

- Carga inicial, recarga y aviso cuando `tk` no está disponible.
- Selección, expansión, búsqueda y filtros combinados.
- Cambio de prioridad y estado; cierre de tarea.
- Cierre rechazado por subtareas abiertas.
- Reapertura de una tarea cerrada.
- Creación de tarea y subtarea.
- Edición de título, descripción, notas, responsable y etiquetas.
- Alta y retirada de dependencias; comportamiento ante ciclo y duplicado.
- Alta de comentarios.
- Creación, renombrado, recoloreado y borrado de etiquetas.
- Vista previa de tareas afectadas antes de renombrar y borrar.
- Menús, Escape, portapapeles y mensajes de error y toast.

### API

Los 19 endpoints se pueden recorrer con `Invoke-RestMethod`. Para las mutaciones,
levante una segunda instancia apuntando a una base desechable:

```powershell
$env:TACKS_DB='C:\ruta\a\copia\tasks.db'
$env:DATA_DIR='C:\ruta\a\copia'
$env:PORT='8891'
npm run server
```

### Anchuras y accesibilidad

Anchuras de referencia: 1440, 1180, 720 y 390 px. En móvil compruebe apertura y
retorno del inspector, scroll de paneles y ausencia de desbordamiento horizontal.

Accesibilidad mínima:

- Navegación de tareas con Tab, Enter y Espacio.
- Nombres accesibles de iconos, selects y menús.
- `aria-expanded`, `aria-selected`, diálogos y regiones live.
- Foco visible y cierre por Escape donde está implementado.

## Checklist de entrega

```powershell
npm run build
npm test
git status --short
```

Además:

- Buscar `fetch(` fuera de `api/tk-client.js` si se cambió el acceso a datos.
- Buscar invocaciones de `tk` fuera de `server/tk.js`.
- Confirmar que los artefactos generados están incluidos si cambió la fuente.
- Revisar [contracts.md](contracts.md) si cambiaron datos, eventos o claves.
- Añadir o actualizar un riesgo en [known-risks.md](known-risks.md).
- Actualizar `CHANGELOG.md` si el cambio es relevante para el usuario.
- No incluir bases de datos ni `node_modules` en el commit.

## Diagnóstico rápido

### «La capacidad de tareas no está disponible»

El servidor respondió con el 404 específico de capacidad deshabilitada. No es un
listado vacío. Compruebe `DISABLE_TK`, que `tk/tk.exe` exista y que la ruta de
`TACKS_DB` sea accesible. La consola del servidor indica el motivo exacto al
arrancar.

### La interfaz se ve sin tareas

Puede que la base apuntada esté vacía y `tk` la haya inicializado. El arranque
imprime la ruta de la base que está usando: compruébela. Si el gestor arranca con
una base recién creada, el listado estará vacío pero no habrá error.

### La página carga sin estilos o con estilos antiguos

Ejecute el build y compruebe que `app-vue.css` cambió. Revise la caché del
navegador; el servidor envía `Cache-Control: no-store`, así que la caché
problemática suele ser la del propio navegador.

### Aparece `spawn EPERM` en la API

El servidor no puede lanzar `tk.exe`. Ocurre bajo sandbox de archivos o
confinamiento de procesos: `execFile` con stdio por tubería requiere abrir una
tubería con nombre. Fuera de un sandbox no sucede.

### «El puerto ya está en uso»

Otra instancia está corriendo. Use otro puerto:

```powershell
$env:PORT='8891'; npm run server
```

### Una prueba de estado falla tras mover un método

Actualice la lista de mixins de `workspace-fixture.js` si creó un módulo nuevo.
La fixture replica manualmente el ensamblaje de `state/workspace.js`.

## Flujo de trabajo con Git

El proyecto sigue [CONTRATO_FLUJO_GIT_VERSIONADO.md](../CONTRATO_FLUJO_GIT_VERSIONADO.md).
En resumen: rama por tarea, commits pequeños con prefijo de tipo, verificación
antes de integrar, `CHANGELOG.md` al día y etiquetas SemVer solo al publicar.

Véase [development.md](development.md) para el procedimiento de cambio concreto.
