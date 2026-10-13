# ADR-003: Compartir la base de tk con el tablero ODD

- **Estado:** Aceptada
- **Fecha:** 2026-10-13

## Contexto

`tk/.tacks/tacks.db` ya es la base que utiliza el producto. La base no se
versiona y cada entorno puede tener su propia copia. En WSL la copia local actual
está vacía; la copia de Windows contiene tareas preexistentes y no tiene la
etiqueta `ODD`.

Crear una segunda base para el ODD separaría el tablero operativo del producto,
pero introduciría otra configuración, otra ruta de relevo y riesgo de consultar
una base distinta de la que se usa para el proyecto.

## Decisión

Compartir `tk/.tacks/tacks.db` entre las tareas del producto y las tareas ODD.

- Toda tarea ODD se distingue con la etiqueta `ODD`.
- Los comandos de mantenimiento usan siempre `--db tk/.tacks/tacks.db` explícito.
- `tk list --tag ODD` permite consultar solo el tablero ODD.
- Las bases de distintos entornos no se sincronizan automáticamente.
- No se ejecutan dos instancias escribiendo sobre la misma base.

## Consecuencias

- Existe un único backlog consultable por el binario y por la interfaz.
- Las tareas del producto y las de desarrollo pueden coexistir sin mezclarse en
  las consultas etiquetadas.
- La base sigue siendo estado local no versionado; el relevo operativo depende de
  usar el mismo archivo o una ruta `TACKS_DB` explícita.
- La interfaz puede mostrar tareas ODD junto con tareas del producto, lo que hace
  visible el dogfooding y exige mantener la etiqueta correctamente.

## Alternativas consideradas

- Crear `tk/.tacks/odd.db`: rechazada por añadir configuración y una segunda
  fuente de estado.
- Versionar la base: rechazada porque contiene datos locales y SQLite no es un
  formato de colaboración Git.
- No etiquetar las tareas ODD: rechazada porque impediría separar ambos ámbitos.
