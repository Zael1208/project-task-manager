# Gestor de tareas — interfaz Vue

Interfaz del gestor de tareas. Muestra el árbol de tareas, su detalle y el
catálogo de etiquetas, y permite crear, editar, cerrar, relacionar y comentar
tareas mediante la API HTTP del servidor del proyecto.

Esta carpeta es **solo el frontend**. El servidor vive en
[`../../server/`](../../server/) y la documentación del proyecto en
[`../../docs/`](../../docs/).

## Inicio rápido

Desde la raíz del repositorio:

```powershell
npm install
npm run build
npm test
npm run server
```

La aplicación queda disponible en
`http://localhost:8890/task-manager/app-vue.html`.

Las pruebas unitarias no necesitan servidor ni escriben en ninguna base de datos.
La comprobación manual contra el servidor sí opera sobre la base TK configurada:
use una copia desechable cuando pruebe mutaciones.

La suite contiene 8 archivos y 47 pruebas. La de `dialog-focus.test.js` cubre el
algoritmo de foco de los diálogos, no el montaje de Vue.

## Mapa del módulo

```text
main.js                 Entrada y orden de la cascada CSS
app-shell.js            Composición de la pantalla y cableado raíz
api/tk-client.js        Única frontera fetch del módulo
../shared/tasks/        Modelo y presentación TK compartidos
state/                  Estado raíz dividido en mixins por dominio
components/             Componentes de presentación y emisión de intenciones
styles/                 Tokens, layout, componentes y responsive
```

El flujo normal es:

```text
interacción -> evento de componente -> método del workspace -> cliente HTTP
            -> mapper -> estado raíz -> props de componentes
```

Los componentes no llaman a `fetch` ni mutan directamente los objetos recibidos
por props. Los seis mixins de `state/` se combinan en una sola instancia Vue y
colaboran mediante `this`.

## Fuentes y artefactos

- `src/task-manager/` es la fuente que se edita.
- `public/task-manager/app-vue.html` se mantiene a mano.
- `public/task-manager/app-vue.js` y `app-vue.css` son artefactos generados y
  versionados.
- `public/vendor/vue.global.dev.js` aporta `globalThis.Vue`; Vue no entra en el
  bundle de esbuild.

No edite los artefactos generados. Ejecute `npm run build` y revise que sus
cambios correspondan a los cambios de fuente.

## Documentación

La documentación del proyecto está en [`../../docs/`](../../docs/):

- [Arquitectura](../../docs/architecture.md): límites, estado y flujos.
- [Contratos](../../docs/contracts.md): datos, API, eventos y claves busy.
- [Desarrollo](../../docs/development.md): cómo cambiar cada capa.
- [Operación](../../docs/operations.md): build, pruebas y checklist.
- [Riesgos conocidos](../../docs/known-risks.md): deuda confirmada.

## Reglas de cambio

1. Mantenga el acceso HTTP dentro de `api/tk-client.js`.
2. Normalice campos TK en `../shared/tasks/task-model.js`, no en componentes.
3. Asigne cada estado o acción al mixin que sea propietario de su dominio.
4. Preserve los retornos y secuencias de concurrencia de carga y mutación.
5. Cambie props y eventos en emisor, intermediarios, receptor y documentación.
6. Ejecute build, pruebas y `git status --short` antes de entregar.
