# Gestor de tareas local

Aplicación web local para gestionar tareas y proyectos. Interfaz en Vue 3 sobre
`tk` (tacks), un gestor de tareas de línea de comandos respaldado por SQLite, más
un catálogo de etiquetas propio con nombre, descripción y color.

Producto local y de un solo usuario: sin cuentas, sin red y sin sincronización.

## Estado

Proyecto en construcción. El plan y el alcance completos están en
[`PRD.md`](PRD.md).

| Fase | Estado |
|---|---|
| F1. Esqueleto | Hecho |
| F2. Dependencia externa (`tk`) | Hecho |
| F3. Datos | Hecho — 30 tareas reales copiadas como banco de pruebas |
| F4. Frontend | Hecho |
| F5. Pipeline (build y pruebas) | Hecho |
| F6. Servidor | Hecho |
| F7. Etiquetas sobre base propia | Hecho |
| F8. Validación de paridad | Pendiente |
| F9. Documentación | Hecho |

El gestor **ya es utilizable**: `npm run server` y abre
<http://localhost:8890/task-manager/app-vue.html>.

## Requisitos

- **Node.js 22.5 o superior** (por `node:sqlite`, que es nativo).
- Windows para el binario `tk.exe` incluido.

No hay dependencias de runtime: `esbuild` y `vitest` son solo de desarrollo.

## Instalación

```powershell
npm install
npm run build
npm test
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | Compila el frontend a `public/task-manager/app-vue.js` y su CSS |
| `npm run watch` | Recompila al cambiar la fuente |
| `npm test` | Ejecuta la suite de Vitest |
| `npm run test:watch` | Vitest en modo interactivo |
| `npm run server` | Arranca el servidor local en el puerto 8890 |

## Estructura

```text
PRD.md                   Requisitos, alcance, plan y estado de ejecución
CHANGELOG.md             Cambios relevantes del proyecto
CONTRATO_FLUJO_GIT_VERSIONADO.md   Flujo de ramas, commits y versionado
docs/                    Arquitectura, contratos, desarrollo, operación y riesgos
server/                  Servidor Node: API y ficheros estáticos
  index.js                 Arranque, enrutado y estáticos
  tk.js                    Única frontera con el CLI tk
  tasks.js                 Handlers de /api/tk/*
  tags.js                  Handlers de /api/tags* y base de etiquetas
  http.js                  Utilidades HTTP compartidas
tk/                      Binario tacks, su licencia y la base de tareas
data/                    Base del catálogo de etiquetas
src/task-manager/        Fuente del frontend (Vue 3, Options API, esbuild)
src/shared/tasks/        Modelo de tarea compartido y utilidades de presentación
public/task-manager/     Página mantenida a mano y artefactos generados
public/vendor/           Vue 3.5.41, vendorizado como global
tests/task-manager/      Suite de Vitest
```

## Documentación

| Documento | Contenido |
|---|---|
| [`PRD.md`](PRD.md) | Requisitos, alcance, decisiones, plan por fases y criterios de aceptación |
| [`docs/architecture.md`](docs/architecture.md) | Piezas, fronteras, flujos y las dos bases de datos |
| [`docs/contracts.md`](docs/contracts.md) | Modelos de datos, los 19 endpoints, eventos y claves busy |
| [`docs/development.md`](docs/development.md) | Cómo cambiar cada capa sin romper contratos |
| [`docs/operations.md`](docs/operations.md) | Comandos, build, pruebas y matriz de validación manual |
| [`docs/known-risks.md`](docs/known-risks.md) | Deuda confirmada y su cobertura |
| [`CHANGELOG.md`](CHANGELOG.md) | Qué ha cambiado y cuándo |

## Configuración

Todo es opcional; los valores por defecto funcionan sin tocar nada.

| Variable | Para qué | Por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `8890` |
| `TACKS_DB` | Ruta de la base de tareas | `tk/.tacks/tacks.db` |
| `DATA_DIR` | Carpeta de la base de etiquetas | `data/` |
| `TAGS_DB` | Ruta de la base de etiquetas | `data/task-manager.db` |
| `TK_ROOT` | Carpeta del binario `tk` | `tk/` |
| `TK_TIMEOUT_MS` | Tiempo máximo por invocación de `tk` | `5000` |
| `DISABLE_TK` | `1` arranca sin la capacidad de tareas | — |

## Dos bases de datos distintas

No es un descuido, es deliberado:

- `tk/.tacks/tacks.db` guarda **las tareas** y pertenece al binario `tk`.
- `data/task-manager.db` guarda **el catálogo de etiquetas** (nombre, descripción
  y color) y pertenece a este servidor.

`tk` no tiene concepto de color ni de descripción de etiqueta, así que esos
metadatos son nuestros. Se mantienen en un archivo aparte para que no dependan
del ciclo de vida de una base que administra un tercero.

## Fuente frente a artefactos

- `src/` es la fuente que se edita.
- `public/task-manager/app-vue.html` se mantiene a mano.
- `public/task-manager/app-vue.js` y `app-vue.css` son **generados** por
  `npm run build`. No se editan a mano: el siguiente build los sobrescribe.
- `public/vendor/vue.global.dev.js` aporta `globalThis.Vue` antes del bundle, así
  que Vue no entra en el empaquetado.

## Sobre `tk`

El binario `tk/tk.exe` es **software de terceros**: [tacks](https://github.com/srmccray/tacks)
0.2.4, escrito en Rust y distribuido bajo licencia MIT. Se incluye sin
modificar, junto con su licencia en `tk/LICENSE`.

La base de tareas vive en `tk/.tacks/tacks.db` y la posee `tk`. Ninguno de los
dos se versiona en git.

## Verificación

```powershell
npm run build
npm test
git status --short
```

El build produce `app-vue.js` y `app-vue.css` de forma reproducible. La suite
cubre el cliente HTTP, el mapper, el árbol, las acciones de estado y el
comportamiento de foco de los diálogos (5 archivos, 30 pruebas).

**El servidor no tiene pruebas automatizadas** (TM-R8): su verificación es manual
y está descrita en [`docs/operations.md`](docs/operations.md).

Al probar mutaciones, use una copia desechable de la base de tareas: `tk` **no
tiene comando de borrado**, así que cualquier tarea de prueba creada contra los
datos reales se queda ahí.

## Flujo de trabajo

El proyecto sigue [`CONTRATO_FLUJO_GIT_VERSIONADO.md`](CONTRATO_FLUJO_GIT_VERSIONADO.md):
una rama por tarea, commits pequeños con prefijo de tipo, verificación antes de
integrar, `CHANGELOG.md` al día y etiquetas SemVer solo al publicar.

## Licencia

El código propio de este proyecto no tiene licencia definida todavía. El binario
de `tk/` conserva la suya (MIT), que es independiente de este repositorio.
