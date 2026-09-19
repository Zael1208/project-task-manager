# Registro de cambios

Cambios relevantes del gestor de tareas local. El formato sigue las
recomendaciones de *Keep a Changelog* y el versionado es semántico.

Las versiones se publican desde `main` con una etiqueta anotada `vMAJOR.MINOR.PATCH`.
El proyecto declara `0.1.0` en `package.json`, todavía **sin etiqueta ni
publicación**.

## [Sin publicar]

Primera entrega funcional: el gestor de tareas extraído a un proyecto
independiente, sin dependencias de otros productos.

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

### Corregido

- El arranque informa del **motivo exacto** por el que la capacidad de tareas no
  está disponible, distinguiendo «deshabilitada a propósito» de «falta el
  binario». Antes ambos casos se presentaban igual.
- El enrutado del servidor ya no admite coincidencias por prefijo accidentales:
  los prefijos incluyen la barra final, de modo que `/api/tk/show/` no casa con
  `/api/tk/showcase`.
- La resolución de ficheros estáticos comprueba también la ruta real del archivo,
  de modo que un enlace simbólico tampoco permite salir de `public/`.

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
  se trasladaron sin perder nada.
- La suite de pruebas se trasladó intacta: 4 archivos, 18 pruebas.
- **Pendiente de decisión**: la cabecera de la interfaz todavía muestra el nombre
  del producto de origen. Véase TM-R10 en `docs/known-risks.md`.
