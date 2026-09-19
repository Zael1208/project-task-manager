# Contrato operativo de Git, CHANGELOG y versionado

## 1. Propósito

Este documento define el flujo que debe seguir el agente de IA al trabajar en un proyecto Git local de uso personal.

Objetivos:

- Mantener `main` estable y utilizable.
- Aislar cada tarea en una rama breve.
- Hacer los cambios trazables y reversibles.
- Registrar las modificaciones relevantes en `CHANGELOG.md`.
- Aplicar versionado semántico mediante etiquetas Git.
- Evitar cambios accidentales, pérdida de trabajo y regresiones.

## 2. Alcance y prioridad

Estas reglas se aplican a todas las operaciones Git del proyecto, salvo que el usuario indique expresamente otra cosa.

Si existe una instrucción específica del usuario, prevalece sobre este contrato. Si una operación puede destruir trabajo, sobrescribir cambios o alterar el historial, el agente debe detenerse y pedir autorización explícita.

## 3. Modelo de ramas

El flujo estándar utiliza únicamente:

- `main`: rama principal, estable y verificable.
- `feature/<nombre>`: nueva funcionalidad o mejora.
- `fix/<nombre>`: corrección de errores.
- `docs/<nombre>`: documentación.
- `refactor/<nombre>`: reorganización interna sin cambio funcional intencionado.

No se utilizará `develop` por defecto. Solo se añadirá si el usuario lo solicita o si el proyecto necesita mantener una línea de desarrollo separada de la versión estable.

## 4. Inicio obligatorio de una tarea

Antes de modificar archivos, el agente debe:

1. Identificar el directorio raíz del repositorio.
2. Ejecutar `git status --short --branch`.
3. Comprobar la rama actual.
4. Detectar cambios previos del usuario.
5. No sobrescribir, descartar ni ocultar cambios previos sin permiso.
6. Actualizar `main` solo si existe un remoto configurado y el usuario lo permite o lo ha solicitado.
7. Crear una rama específica para la tarea.

Ejemplo:

```powershell
git status --short --branch
git switch main
git switch -c feature/nombre-de-la-tarea
```

Si hay cambios sin confirmar, el agente debe informar de ellos y decidir con el usuario si se mantienen, se incorporan a la tarea o se separan.

## 5. Trabajo y commits

Los commits deben ser pequeños, coherentes y relacionados con una sola intención.

Formato recomendado:

```text
tipo: descripción breve
```

Tipos habituales:

- `feat`: nueva funcionalidad.
- `fix`: corrección.
- `docs`: documentación.
- `refactor`: reorganización interna.
- `test`: pruebas.
- `build`: compilación o dependencias.
- `chore`: mantenimiento.

Ejemplos:

```powershell
git add archivo.js archivo.css
git commit -m "feat: añade filtro por estado"

git add README.md
git commit -m "docs: documenta el flujo de instalación"
```

El agente no debe crear commits gigantes que mezclen funcionalidades, refactorizaciones y documentación no relacionada.

## 6. Verificación antes de integrar

Antes de fusionar una rama, el agente debe:

- Revisar `git diff main...HEAD`.
- Ejecutar las pruebas disponibles.
- Ejecutar la comprobación o compilación del proyecto si existe.
- Revisar que no haya archivos temporales o secretos.
- Confirmar que el `CHANGELOG.md` refleja los cambios relevantes.
- Revisar que no haya regresiones conocidas.

Comandos mínimos:

```powershell
git diff main...HEAD
git status --short
```

Si falla una prueba o existe una duda relevante, no se debe integrar la rama como si estuviera terminada.

## 7. Integración en `main`

Cuando la tarea esté verificada:

```powershell
git switch main
git merge --no-ff feature/nombre-de-la-tarea
```

El uso de `--no-ff` conserva explícitamente la integración de la tarea en el historial.

Después de fusionar:

1. Ejecutar de nuevo las pruebas principales.
2. Comprobar `git status`.
3. Revisar el commit resultante.
4. Eliminar la rama local solo cuando ya no sea necesaria.

```powershell
git branch -d feature/nombre-de-la-tarea
git status --short --branch
```

Nunca se debe borrar una rama que contenga trabajo no integrado sin autorización.

## 8. CHANGELOG.md

El proyecto debe mantener un archivo `CHANGELOG.md` en la raíz.

Formato recomendado:

```markdown
# Registro de cambios

## [Sin publicar]

### Añadido
- Nueva funcionalidad todavía no publicada.

### Modificado
- Cambio relevante en el comportamiento.

### Corregido
- Error solucionado.

## [0.1.0] - 2026-08-18

### Añadido
- Primera versión funcional.
```

Reglas:

- Las modificaciones se anotan primero en `[Sin publicar]`.
- Al publicar una versión, el contenido de `[Sin publicar]` se pasa a la nueva versión.
- No se anotan cambios puramente internos si no afectan al usuario, salvo que tengan valor técnico o de mantenimiento.
- No se debe afirmar que una característica existe si no está verificada en el código.
- Las fechas deben usar el formato ISO `AAAA-MM-DD`.

## 9. Versionado semántico

Las versiones deben seguir el formato:

```text
MAJOR.MINOR.PATCH
```

Ejemplos:

- `0.1.0`: primera versión de desarrollo.
- `0.1.1`: corrección compatible.
- `0.2.0`: nueva funcionalidad compatible.
- `1.0.0`: primera versión estable.
- `2.0.0`: cambio incompatible con versiones anteriores.

Reglas de incremento:

| Cambio | Incremento |
|---|---|
| Corrección compatible | `PATCH` |
| Nueva funcionalidad compatible | `MINOR` |
| Cambio incompatible | `MAJOR` |

Mientras el proyecto esté por debajo de `1.0.0`, la API y el comportamiento pueden cambiar con mayor libertad, pero el agente debe documentar los cambios importantes.

## 10. Publicación de una versión

Una versión solo se publica desde `main`, después de verificar el proyecto.

Proceso:

1. Revisar el estado del repositorio.
2. Decidir el siguiente número de versión.
3. Actualizar `CHANGELOG.md`.
4. Actualizar archivos de versión si el proyecto los tiene.
5. Ejecutar pruebas y compilación.
6. Crear un commit de versión.
7. Crear una etiqueta anotada.
8. Verificar la etiqueta.

Ejemplo:

```powershell
git switch main
git status --short

git add CHANGELOG.md package.json
git commit -m "chore: prepara versión 0.2.0"

git tag -a v0.2.0 -m "Versión 0.2.0"
git show --stat --oneline v0.2.0
```

La etiqueta debe llevar el prefijo `v`: `v0.1.0`, `v1.0.0`, etc.

## 11. Versiones preliminares

Cuando sea necesario identificar una versión no definitiva, se pueden usar sufijos:

```text
0.3.0-alpha.1
0.3.0-beta.1
0.3.0-rc.1
```

- `alpha`: todavía experimental.
- `beta`: funcional, pero en validación.
- `rc`: candidata a publicación.

No se debe presentar una versión preliminar como estable.

## 12. Operaciones que requieren confirmación

El agente debe pedir confirmación antes de:

- Ejecutar `git reset` si puede eliminar cambios.
- Usar `git reset --hard`.
- Ejecutar `git clean`.
- Sobrescribir cambios del usuario.
- Reescribir historial con `rebase` o `filter-repo`.
- Forzar un `push`.
- Eliminar ramas con trabajo no integrado.
- Crear o publicar una versión que el usuario no haya solicitado.
- Subir cambios a un remoto.

## 13. Operaciones que no deben hacerse automáticamente

El agente no debe:

- Trabajar directamente en `main` si la tarea implica cambios relevantes.
- Crear `develop` por costumbre.
- Hacer `push` sin autorización.
- Cambiar el número de versión solo porque ha realizado muchos cambios.
- Marcar como corregido algo que no haya comprobado.
- Modificar el historial para ocultar errores.
- Eliminar cambios previos del usuario.

## 14. Informe final obligatorio

Al terminar una tarea, el agente debe informar de:

- Rama utilizada.
- Cambios realizados.
- Pruebas ejecutadas y resultado.
- Commit o commits creados.
- Si se integró en `main`.
- Si se actualizó `CHANGELOG.md`.
- Si se creó una etiqueta de versión.
- Estado final de `git status`.
- Cualquier aspecto no verificado.

Formato breve recomendado:

```text
Estado: completado
Rama: feature/nombre-de-la-tarea
Integración: sí/no
Versión: v0.2.0 / no creada
CHANGELOG: actualizado/no actualizado
Pruebas: OK / fallan / no disponibles
Árbol de trabajo: limpio / contiene cambios
```

## 15. Flujo resumido

```text
comprobar estado
    ↓
crear rama de tarea
    ↓
trabajar y hacer commits pequeños
    ↓
verificar pruebas y diferencias
    ↓
actualizar CHANGELOG
    ↓
integrar en main
    ↓
verificar regresiones
    ↓
crear etiqueta SemVer si corresponde
```

## 16. Principio rector

Cada cambio debe ser:

1. Identificable.
2. Revisable.
3. Reversible.
4. Verificable.
5. Explicable en el historial y en el `CHANGELOG.md`.

Si el agente no puede cumplir una de estas condiciones, debe declarar la limitación antes de continuar.

