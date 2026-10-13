# ADR-005: Definir la pestaña Actuales por creación o actualización

- **Estado:** Aceptada
- **Fecha:** 2026-10-13

## Contexto

Tacks 0.2.4 devuelve `created_at` y `updated_at` como fechas ISO 8601 con
nanosegundos. No devuelve una fecha de vencimiento, de inicio ni otro campo que
represente una fecha objetivo. La aplicación conserva esos campos con sus
nombres de Tacks: el servidor solo normaliza `close_reason` y `mapTask()` no
convierte ni renombra las fechas.

La pestaña Actuales necesita una regla que no invente una semántica de fechas y
que permita seleccionar Hoy, Semana, Mes o Año.

## Decisión

Una tarea pertenece a Actuales cuando `created_at` o `updated_at` cae dentro del
periodo seleccionado. Los dos límites son inclusivos para el inicio y
exclusivos para el siguiente periodo.

Los periodos usan el calendario local del navegador y comienzan a medianoche:
Hoy es el día local, Semana comienza el lunes, Mes comienza el primer día del
mes y Año comienza el uno de enero.

## Consecuencias

- Una tarea creada o modificada dentro del periodo aparece sin necesitar campos
  adicionales ni cambios en Tacks o en su base SQLite.
- La vista sigue funcionando con la forma real que ya entrega la API y descarta
  valores temporales ausentes o no interpretables.
- Cambiar de periodo solo cambia el conjunto filtrado: la jerarquía expandida y
  la selección del inspector permanecen en el estado del workspace.
- La fecha de vencimiento queda fuera del alcance hasta que Tacks proporcione un
  campo con esa semántica.

## Alternativas consideradas

- Usar solo `created_at`: rechazada porque una tarea existente modificada en el
  periodo no aparecería.
- Usar solo `updated_at`: rechazada porque una tarea creada en el periodo podría
  desaparecer después de una actualización anterior no relacionada.
- Inventar una fecha de vencimiento o leer SQLite directamente: rechazado porque
  rompería la frontera de solo lectura del binario Tacks y asumiría un campo que
  no existe en su contrato.
