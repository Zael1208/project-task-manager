# ADR-001: Adoptar Git v2 como contrato operativo

- **Estado:** Aceptada
- **Fecha:** 2026-10-13

## Contexto

El repositorio tenía un contrato de Git anterior y una revisión local del contrato
que adapta el flujo a un trabajo proporcional al riesgo. La revisión ya está
incorporada en `CONTRATO_FLUJO_GIT_VERSIONADO.md` y el usuario ha confirmado que
Git v2 es el contrato que debe gobernar este proyecto.

## Decisión

Adoptar Git v2 como contrato operativo del repositorio. El contrato define la
protección de cambios previos, el uso proporcional de ramas, la confirmación de
commits, la verificación, la integración separada de la publicación y las
operaciones que requieren autorización explícita.

La corrección de `.engram/.gitignore` se conserva como configuración propia de
Engram; no se trata como una copia del patrón de CodeGraph.

## Consecuencias

- `AGENTS.md` y la documentación del proyecto deben remitir a Git v2.
- Las tareas normales o complejas se trabajan fuera de `main` antes de modificar
  archivos.
- Los commits requieren la confirmación prevista por el contrato.
- Push, integración, etiquetas y operaciones destructivas conservan autorización
  independiente.
- El árbol de trabajo conserva los cambios previos del usuario.

## Alternativas consideradas

- Mantener el contrato anterior: rechazada porque no refleja el flujo adoptado.
- Usar reglas informales sin contrato: rechazada porque reduce la trazabilidad y
  hace ambiguas las autorizaciones.
