# Gestor de tareas local

Aplicación web local para gestionar tareas y proyectos. Interfaz en Vue 3 sobre
`tk` (tacks), un gestor de tareas de línea de comandos respaldado por SQLite, más
un catálogo de etiquetas propio con nombre, descripción y color.

Producto local y de un solo usuario: sin cuentas, sin red y sin sincronización.

## Estado

Proyecto en construcción. Los requisitos, el alcance y el estado funcional están en
[`PRD.md`](PRD.md); el trabajo operativo ODD vive en `tk`.

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

Para consultar el trabajo ODD actual:

```bash
./tk/tk --db tk/.tacks/tacks.db --json stats
./tk/tk --db tk/.tacks/tacks.db --json ready --limit 1
./tk/tk --db tk/.tacks/tacks.db --json list --tag ODD
```

Las tareas ODD llevan la etiqueta `ODD`; las decisiones durables se documentan
en [`docs/decisions/`](docs/decisions/). El estado de Git se consulta con Git,
no en tk.

El gestor **ya es utilizable**: `npm run server` y abre
<http://localhost:8890/task-manager/app-vue.html>.

## Requisitos

- **Node.js 22.5 o superior** (por `node:sqlite`, que es nativo).
- Windows **o** Linux/WSL. El proyecto incluye el binario de las dos plataformas
  y el servidor elige el que corresponde.

No hay dependencias de runtime: `esbuild`, `vitest` y `jsdom` son solo de
desarrollo, y están fijadas a versiones exactas.

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
PRD.md                   Requisitos, alcance y estado funcional del producto
CHANGELOG.md             Cambios relevantes del proyecto
CONTRATO_FLUJO_GIT_VERSIONADO.md   Flujo de ramas, commits y versionado
docs/                    Arquitectura, contratos, desarrollo, operación y riesgos
server/                  Servidor Node: API y ficheros estáticos
  index.js                 Arranque, enrutado y estáticos
  tk.js                    Única frontera con el CLI tk
  tasks.js                 Handlers de /api/tk/*
  tags.js                  Handlers de /api/tags* y base de etiquetas
  http.js                  Utilidades HTTP compartidas
tk/                      Binarios tacks, reglas locales y base de tareas ODD
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
| [`docs/decisions/`](docs/decisions/) | Decisiones durables del proyecto, en formato ADR |
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
- `public/vendor/vue.global.prod.js` aporta `globalThis.Vue` antes del bundle, así
  que Vue no entra en el empaquetado.

## Sobre `tk`

Los binarios `tk/tk.exe` (Windows) y `tk/tk` (Linux) son **software de terceros**:
[tacks](https://github.com/srmccray/tacks) 0.2.4, escrito en Rust y distribuido
bajo licencia MIT. Se incluyen sin modificar, junto con su licencia en
`tk/LICENSE`.

`server/tk.js` elige uno u otro según la plataforma, así que el mismo repositorio
funciona en Windows y en WSL sin ningún paso adicional. El de Linux es la
compilación estática para `x86_64-unknown-linux-musl`, verificada contra el
`sha256` que publica el autor.

La base de tareas vive en `tk/.tacks/tacks.db` y la posee `tk`. No se versiona en
git, así que **cada máquina tiene la suya**.

## Trabajar desde WSL

Todo funciona igual que en Windows, salvo la base de tareas: al no versionarse,
en WSL el backlog empieza vacío.

Para ver los datos reales desde WSL, apunte a la base del checkout de Windows,
que es accesible por `/mnt/c`:

```bash
TACKS_DB=/mnt/c/PROJECT-TASK-MANAGER/tk/.tacks/tacks.db npm run server
```

**No levante las dos instancias a la vez sobre la misma base.** SQLite no está
pensado para dos escritores simultáneos, y aquí además son dos sistemas
operativos distintos sobre una carpeta compartida: el riesgo de corromperla no
compensa. Úsela de una en una.

Las pruebas no dependen de esto: crean su propia base desechable en una carpeta
temporal, así que `npm test` funciona en WSL sin configurar nada.

## Verificación

```powershell
npm run build
npm test
git status --short
```

El build produce `app-vue.js` y `app-vue.css` de forma reproducible. La suite
cubre el cliente HTTP, el mapper, el árbol, las acciones de estado, el foco de los
diálogos y la integración del servidor (12 archivos, 77 pruebas).

Las de servidor levantan una instancia real sobre una base desechable, así que no
tocan tus datos. Al probar mutaciones a mano, usa también una copia: `tk` **no
tiene comando de borrado**, así que cualquier tarea de prueba creada contra los
datos reales se queda ahí.

## Flujo de trabajo

El proyecto sigue [`CONTRATO_FLUJO_GIT_VERSIONADO.md`](CONTRATO_FLUJO_GIT_VERSIONADO.md):
una rama por tarea, commits pequeños con prefijo de tipo, verificación antes de
integrar, `CHANGELOG.md` al día y etiquetas SemVer solo al publicar. El tablero
operativo ODD se consulta en `tk`; las decisiones durables se registran en ADRs.

## Licencia

El código propio de este proyecto no tiene licencia definida todavía. El binario
de `tk/` conserva la suya (MIT), que es independiente de este repositorio.
