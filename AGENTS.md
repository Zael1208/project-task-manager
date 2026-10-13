# PROJECT-TASK-MANAGER — reglas del repositorio

Reglas que deben valer **en cada turno** dentro de este repositorio. Esto es un
**router**: el detalle canónico vive en los documentos enlazados y no se copia aquí.

## Flujo de trabajo (contrato vinculante)

Contrato completo: `CONTRATO_FLUJO_GIT_VERSIONADO.md`.

- **Rama antes de tocar ficheros.** `main` es estable; cada tarea va en una rama
  `feature/`, `fix/`, `docs/` o `refactor/`. **No se trabaja directamente en `main`.**
- **Commits pequeños, por intención, en inglés** (`tipo: descripción breve`).
- **Verificar antes de integrar**: pruebas, compilación, `git status` limpio y
  `CHANGELOG.md` al día. Se integra con `git merge --no-ff`.
- **El push y las etiquetas son del usuario.** No hacer `push`.
- **No crear una etiqueta por tanda de cambios**: lo nuevo se acumula en
  `[Sin publicar]` del `CHANGELOG.md`.
- Al terminar, informe breve en el formato de §14 del contrato (rama, cambios,
  pruebas, commits, integración, CHANGELOG, etiqueta, estado del árbol, no verificado).

- El trabajo ODD operativo se registra en `tk` con la etiqueta `ODD`; las decisiones durables se documentan en `docs/decisions/`.

## Idioma

- Código, comentarios, documentación, `CHANGELOG.md` e interfaz: **español de España**.
- Mensajes de commit y etiquetas anotadas: **inglés**.

## Comandos

| Comando | Qué hace | Nota |
|---|---|---|
| `npm test` | suite de vitest (99 pruebas, 19 ficheros) | bajo el sandbox de DSH necesita permiso ampliado: vitest lanza workers con tuberías y falla con `EPERM` en `spawn` |
| `npm run build` | esbuild → `public/task-manager/app-vue.js` y `.css` | los artefactos están **versionados**: si el build los cambia, se versionan con el cambio |
| `npm run server` | servidor local en el 8890 | `npm run dev` lo arranca con `--watch` |

## Lo que es petición explícita y no se recorta

Cuando se aplique un criterio de minimalismo —Ponytail u otro— esto **no** está
sujeto a la tijera:

- **La suite de pruebas** (`vitest` + `jsdom`, con `// @vitest-environment jsdom` en
  los ficheros de componentes). La lógica nueva añade pruebas **a esa suite**.
- **El PRD** (`PRD.md`): requisitos RF/RNF y el reparto de módulos del servidor
  (`server/tk.js`, `server/tasks.js`, `server/tags.js`, `server/http.js`).
- **La seguridad**: validación en fronteras de confianza, como el control de
  recorrido de rutas de RF-03 en `server/index.js`.
- **La documentación pedida** en `docs/`.

## ODD en tk

El tablero operativo del proyecto vive en `tk/.tacks/tacks.db`, que no se versiona.
Todo frente ODD lleva la etiqueta `ODD`; una épica lleva además `epic` y cada tarea
recibe un único tipo principal (`docs`, `feat`, `fix`, `refactor`, `test`, `style`,
`improvement` o `chore`).

```bash
npm run odd:tk -- stats
npm run odd:tk -- ready --limit 1
npm run odd:tk -- list --tag ODD
```

El ciclo correcto empieza siempre por crear o seleccionar la tarea tk, antes de
explorar o modificar archivos, y marcarla `in_progress`. Después es obligatorio
actualizar `notes` cuando cambie el relevo, añadir comentarios con decisiones y
evidencias, y cerrarla inmediatamente después de verificar el resultado. El
estado de Git se consulta con Git y no se copia en tk; el estado del proceso de
revisión tampoco, porque vive en el almacén del revisor. El tablero registra el
trabajo y su evidencia funcional, no el ciclo de vida de Git ni el de la
revisión. Para escribir en tk se usa
`npm run odd:tk -- ...`; la guardia rechaza ese estado en títulos, notas,
comentarios y descripciones. No se crean nuevos
registros ODD en archivos Markdown.

## Mapa

`PRD.md` (requisitos, alcance y estado funcional del producto) · `tk/.tacks/tacks.db`
(estado operativo ODD, no versionado) · `docs/architecture.md` · `docs/contracts.md` ·
`docs/operations.md` · `docs/development.md` · `docs/known-risks.md` · `docs/decisions/` ·
`CONTRATO_FLUJO_GIT_VERSIONADO.md` · `CHANGELOG.md` · `README.md`
