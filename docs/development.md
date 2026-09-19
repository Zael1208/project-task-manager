# Guía de desarrollo

Este documento explica cómo cambiar el proyecto sin romper sus contratos.
Sustituye al antiguo documento de relevo: el estado vivo está ahora en
[`PRD.md`](../PRD.md) (sección 14) y en [`CHANGELOG.md`](../CHANGELOG.md).

## Mapa del proyecto

```text
PRD.md                        Requisitos, alcance, plan y estado de ejecución
CHANGELOG.md                  Cambios relevantes, en formato Keep a Changelog
CONTRATO_FLUJO_GIT_VERSIONADO.md   Flujo de ramas, commits y versionado
README.md                     Punto de entrada: comandos, configuración, estructura
server/                       Servidor Node: API y ficheros estáticos
  index.js                      Arranque, enrutado y estáticos
  tasks.js                      Handlers de /api/tk/*
  tags.js                       Handlers de /api/tags* y base de etiquetas
  tk.js                         Única frontera con el CLI tk
  http.js                       Utilidades HTTP compartidas
src/task-manager/             Fuente del frontend (Vue 3, Options API)
  api/tk-client.js              Única frontera fetch del frontend
  state/                        Seis mixins sobre una sola instancia Vue
  components/                   Presentación y emisión de intenciones
  styles/                       tokens, layout, components, responsive
src/shared/tasks/             Modelo de tarea compartido
public/                       Página a mano y artefactos generados
tests/task-manager/           Suite de Vitest
tk/                           Binario de terceros, su licencia y su base
data/                         Base del catálogo de etiquetas
docs/                         Esta documentación
```

## Ruta de incorporación

Lectura recomendada, en este orden:

1. [`../README.md`](../README.md) para alcance y comandos.
2. [`architecture.md`](architecture.md) para fronteras y flujos.
3. [`contracts.md`](contracts.md) para modelos, API y eventos.
4. [`../server/tk.js`](../server/tk.js) para entender cómo se habla con `tk`.
5. [`../server/tasks.js`](../server/tasks.js) y [`../server/tags.js`](../server/tags.js)
   para los endpoints.
6. [`../src/task-manager/state/task-actions.js`](../src/task-manager/state/task-actions.js)
   para cargas y escrituras del frontend.
7. [`known-risks.md`](known-risks.md) antes de ampliar comportamiento.
8. [`operations.md`](operations.md) antes de entregar.

Con esa secuencia se comprende el núcleo sin leer primero las plantillas largas
ni el CSS.

## Cómo realizar un cambio

### Cambio en un endpoint

1. Decida si es lectura o escritura y edítelo en `server/tasks.js` o
   `server/tags.js`.
2. Si es una ruta nueva, añádala a `EXACT_ROUTES` o `PREFIX_ROUTES` en
   `server/index.js`. Los prefijos incluyen la barra final.
3. Mantenga el contrato de error: **error de `tk` se devuelve con estado 200 y
   `{ error }`**. El cliente depende de ello.
4. Si el endpoint pasa a estar disponible para la interfaz, añádalo a
   `api/tk-client.js` y a [`contracts.md`](contracts.md).
5. Si la operación toca la base de etiquetas, prevea la reversión ante fallo a
   mitad, como hacen `handleTagUpdate()` y `handleTagDelete()`.

### Cambio en la interacción con `tk`

1. Todo va en [`../server/tk.js`](../server/tk.js). Ningún otro módulo invoca el
   binario.
2. Use `runTk` si el subcomando devuelve JSON y `runTkText` si no.
3. Mantenga el tiempo máximo, `windowsHide` y el `--db` explícito.
4. Confirme el comportamiento ejecutando el binario sobre una base desechable
   **antes** de escribir el código: el contrato real de `tk` no siempre coincide
   con su documentación.

### Cambio de API o modelo TK

1. Ajuste [`api/tk-client.js`](../src/task-manager/api/tk-client.js) o
   [`task-model.js`](../src/shared/tasks/task-model.js).
2. Mantenga el modelo estable de UI o actualice todos sus consumidores.
3. Amplíe pruebas de cliente o mapper.
4. Actualice [`contracts.md`](contracts.md).

### Cambio de estado o caso de uso

1. Elija el mixin propietario del dominio.
2. Revise colaboraciones a través de `this` en los otros mixins.
3. Preserve secuencias, busy y semántica de recarga.
4. Amplíe `workspace-fixture.js` si aparece un módulo nuevo.
5. Cubra retornos y fallos, no solo el camino correcto.

### Cambio de componente

1. Siga props hacia abajo y eventos hacia arriba desde `app-shell.js`.
2. Emita copias para borradores y arrays.
3. Mantenga sincronizados `emits`, intermediarios y manejadores.
4. Valide teclado, foco, móvil y desbordamientos en navegador.

### Cambio visual

1. Elija la capa CSS propietaria.
2. No altere el orden de imports salvo decisión explícita.
3. Regenerar artefactos.
4. Revise 1440, 1180, 720 y 390 px.

## Convenciones

- **Idioma**: español de España en código, comentarios, documentación e interfaz.
  Sin voseo ni giros rioplatenses.
- **Comentarios**: explican *por qué*, no *qué*. Los que documentan decisiones,
  procedencia o trampas de `tk` son valiosos y no deben borrarse.
- **Sin dependencias de runtime**: si necesita una, justifíquelo en el PRD y en
  [`architecture.md`](architecture.md). `node:sqlite`, `node:http` y
  `node:child_process` cubren lo que el proyecto necesita.
- **Nada de red saliente.** El producto es local.
- **Los artefactos no se editan a mano.** `npm run build` los regenera.
- **Las mutaciones no son optimistas.** Primero confirma la API, después se
  recarga el estado confirmado.
- **Pruebe sobre copias.** No hay comando de borrado en `tk`: una tarea de prueba
  creada contra los datos reales se queda ahí.

## Flujo de trabajo con Git

Se sigue [CONTRATO_FLUJO_GIT_VERSIONADO.md](../CONTRATO_FLUJO_GIT_VERSIONADO.md):

1. `git status --short --branch` antes de empezar.
2. Rama por tarea: `feature/…`, `fix/…`, `docs/…`, `refactor/…`.
3. Commits pequeños con prefijo de tipo (`feat:`, `fix:`, `docs:`, `test:`,
   `build:`, `chore:`).
4. Verificar antes de integrar: `git diff main...HEAD`, build y pruebas.
5. Actualizar `CHANGELOG.md` en `[Sin publicar]`.
6. Integrar con `git merge --no-ff`.
7. Etiquetar versiones solo al publicar, y solo si se ha pedido.

## Verificación mínima antes de entregar

```powershell
npm run build
npm test
git status --short
```

Y, si se tocó el servidor, levantar una instancia contra una base desechable y
recorrer los endpoints afectados. No hay pruebas automatizadas del servidor
(véase TM-R8 en [known-risks.md](known-risks.md)).

## Evidencia

La suite automatizada contiene 7 archivos y 36 pruebas. El build reproduce los
artefactos con hash idéntico a la línea base de la extracción.

No hay log de CI, ni pruebas de navegador, ni cobertura automatizada del
servidor. Los recorridos manuales se registran en el `CHANGELOG.md` solo cuando
cambian el comportamiento.
