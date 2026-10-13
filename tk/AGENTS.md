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

El estado de Git no se copia en tk. No se editan las bases SQLite con SQL para
cambiar tareas: la base de tacks pertenece al binario y se modifica únicamente
mediante su CLI.

El ciclo correcto empieza en tk: se crea o selecciona la tarea antes de explorar
o modificar archivos, se marca `in_progress`, se mantienen `notes` y comentarios
durante el trabajo, y se cierra inmediatamente tras verificar el resultado.

No se crean nuevos registros ODD en archivos Markdown. La base es local y no se
sincroniza automáticamente entre Windows y WSL; no se levantan dos instancias
escribiendo sobre la misma base.
