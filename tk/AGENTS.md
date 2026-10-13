# tk — binario y estado local

Reglas de esta carpeta. El binario es de terceros y aquí no se desarrolla: se
usa desde la raíz del proyecto como frontera de tareas y del tablero ODD.

## Archivos

| Ruta | Uso |
|---|---|
| `tk` | Binario Linux de tacks 0.2.4; no se modifica |
| `tk.exe` | Binario Windows de tacks 0.2.4; no se modifica |
| `.tacks/tacks.db` | Base local de tareas; no se versiona |
| `../data/task-manager.db` | Catálogo local de etiquetas; no se versiona |
| `LICENSE` | Licencia MIT del binario de terceros |

## Uso

Los comandos se ejecutan desde la raíz y llevan siempre salida JSON y base
explícita:

```bash
npm run odd:tk -- stats
npm run odd:tk -- ready --limit 1
npm run odd:tk -- list --tag ODD
```

La interfaz del gestor se arranca desde la raíz con `npm run server` y queda en
`http://localhost:8890/task-manager/app-vue.html`.

## ODD

El trabajo operativo del proyecto vive en tk. Todo frente ODD lleva la etiqueta
`ODD`; las decisiones durables se documentan en `../docs/decisions/` y se enlazan
desde comentarios de tk. `notes` conserva el relevo actual y los comentarios
conservan peticiones y evidencias.

El estado de Git no se copia en tk, y el del proceso de revisión tampoco:
identificadores de revisión, códigos de parada, presupuestos y dictámenes se
consultan donde viven, no aquí. El tablero registra el trabajo y su evidencia
funcional. La guardia de escritura de `../scripts/odd-tk.cjs` rechaza ese estado
en títulos, notas, comentarios y descripciones.

No se editan las bases SQLite con SQL para cambiar tareas: la base de tacks
pertenece al binario y se modifica únicamente mediante su CLI. Un saneado puntual
de los campos de texto, como el que retiró el estado de revisión y los residuos
de Git, se hace sobre una copia, con copia de seguridad previa y el diff revisado
campo a campo, y nunca toca el estado, las relaciones ni las prioridades de las
tareas.

El ciclo correcto empieza en tk: se crea o selecciona la tarea antes de explorar
o modificar archivos, se marca `in_progress`, se mantienen `notes` y comentarios
durante el trabajo, y se cierra inmediatamente tras verificar el resultado.

El tablero registra **trabajo**: una tarea o una parte de épica. Las **acciones**
—integrar, retirar una rama, comprobar un cierre— no son tareas y no reciben una
fila propia: se ven en Git y, como mucho, se anotan como comentario de la tarea a
la que pertenecen.

No se crean nuevos registros ODD en archivos Markdown. La base es local y no se
sincroniza automáticamente entre Windows y WSL; no se levantan dos instancias
escribiendo sobre la misma base.
