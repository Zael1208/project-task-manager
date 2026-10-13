# ROOT-10 Contrato operativo de Git, CHANGELOG y versionado — v2

## ROOT-11 1. Propósito

Este contrato define un flujo de Git seguro, ágil y proporcional al riesgo para proyectos de uso personal gestionados con ayuda de agentes de IA.

Sus objetivos son:

- proteger el trabajo existente;
- mantener `main` estable cuando el proyecto lo requiera;
- evitar commits, ramas y comprobaciones innecesarias;
- conservar cambios trazables y recuperables;
- pedir autorización antes de las operaciones que dejan una huella persistente;
- adaptar el proceso al tamaño y riesgo de cada tarea.

La seguridad no debe convertir cada modificación en un procedimiento pesado. El agente debe aplicar la mínima ceremonia compatible con un resultado fiable.

## ROOT-12 2. Alcance y prioridad

Estas reglas se aplican a las operaciones Git del proyecto, salvo instrucción expresa del usuario.

Las instrucciones concretas del usuario prevalecen sobre este contrato.

Cuando exista una duda entre conservar y eliminar trabajo, se conserva el trabajo y se informa al usuario.

## ROOT-13 3. Modos de trabajo

El agente clasificará la tarea de forma práctica, sin interrumpir al usuario salvo que la clasificación cambie una decisión importante.

### ROOT-14 3.1. Tarea pequeña

Ejemplos:

- corrección de texto o documentación;
- cambio visual localizado;
- ajuste menor de configuración;
- corrección sencilla y acotada.

Reglas:

- no es obligatorio crear una rama;
- no es obligatorio actualizar `CHANGELOG.md`;
- no es obligatorio crear varios commits;
- se permite trabajar en la rama actual si no es `main` o si el usuario lo ha autorizado;
- normalmente bastará con un único commit, si el usuario lo autoriza.

### ROOT-15 3.2. Tarea normal

Ejemplos:

- una funcionalidad completa;
- una corrección que afecta a varios archivos;
- una mejora interna con pruebas o cambios coordinados.

Reglas:

- se recomienda una rama de tarea si la rama actual es `main`;
- todos los cambios coherentes pueden formar un único commit;
- solo se dividirán en varios commits si existe una razón clara;
- la integración en `main` se hará únicamente con autorización.

### ROOT-16 3.3. Tarea compleja o de riesgo

Ejemplos:

- cambios incompatibles;
- migraciones o cambios de estructura importantes;
- operaciones que afectan a muchos componentes;
- trabajo que pueda dificultar la recuperación o revisión.

Reglas:

- se utilizará una rama específica;
- se podrán hacer comprobaciones intermedias cuando aporten seguridad real;
- los commits podrán separarse por unidades funcionales independientes;
- la integración, publicación y etiquetado requerirán autorización explícita.

## ROOT-17 4. Estado inicial y protección del trabajo

Al comenzar una tarea, el agente hará una comprobación breve:

```powershell
git status --short --branch
```

Esta comprobación sirve para conocer la rama y detectar cambios previos. No es necesario repetirla después de cada paso.

El agente debe:

- conservar los cambios previos del usuario;
- no sobrescribirlos ni mezclarlos silenciosamente con la tarea actual;
- informar si los cambios previos afectan a los archivos que debe modificar;
- detenerse solo si no puede continuar con seguridad.

No se actualizará `main` desde un remoto automáticamente. El `pull`, el `fetch` con finalidad de integrar cambios y cualquier sincronización remota requieren que el usuario lo solicite o lo autorice.

## ROOT-18 5. Ramas

Las ramas son una herramienta, no un trámite obligatorio.

Se recomienda trabajar con:

- `main`: línea estable, cuando el proyecto la utilice;
- `feature/<nombre>`: funcionalidad o mejora;
- `fix/<nombre>`: corrección;
- `docs/<nombre>`: documentación;
- `refactor/<nombre>`: reorganización interna.

El agente puede trabajar en la rama actual cuando:

- la tarea es pequeña;
- no se está en `main`, o el usuario ha autorizado trabajar directamente en `main`;
- no existe riesgo razonable de mezclar trabajos distintos.

Si está en `main` y la tarea es normal o compleja, debe proponer o crear una rama local antes de modificar, salvo que el usuario indique otra cosa.

Crear una rama local no equivale a integrar, publicar ni subir cambios.

No se utilizará `develop` por defecto.

## ROOT-19 6. Modificación y commits

El agente puede modificar archivos, ejecutar pruebas y revisar diferencias sin crear commits.

### ROOT-20 6.1. Unidad de commit

Un commit debe representar una unidad coherente de trabajo. No se creará un commit por cada archivo, paso intermedio o modificación menor.

Por defecto, una tarea completa puede quedar en un único commit aunque afecte a varios archivos.

Se crearán varios commits solo cuando exista una razón clara, por ejemplo:

- separar cambios independientes;
- facilitar una revisión concreta;
- mantener una recuperación útil en una tarea compleja;
- separar una corrección de una refactorización no relacionada.

No se harán commits intermedios únicamente para demostrar actividad o cumplir una regla formal.

### ROOT-21 6.2. Confirmación de commits

La skill `commit-preparation` aplica la confirmación configurada en
`strict_confirmation` del perfil. Si se omite o vale `true` (el valor
predeterminado), el agente debe obtener confirmación explícita antes de cada
commit local. Con `false` explícito, puede ejecutar el commit local después de
presentar el informe y la propuesta descritos abajo, sin una pregunta adicional
de confirmación por commit.

Cuando la tarea esté lista, debe informar brevemente de:

- qué cambios incluirá, después de revisar la documentación viva del proyecto
  (`CHANGELOG.md` según §9 ([[ROOT-24]]), `README`, documentos de estado y listas de
  funciones): lo que haya dejado de describir la realidad se corrige **antes**
  del commit, no después;
- cualquier problema o hallazgo aparecido durante el análisis y la preparación
  que requiera una decisión suya: se dice **antes** del commit y no después, en
  una frase clara de qué es y por qué le afecta;
- cuántos commits propone crear;
- el mensaje o mensajes previstos;
- las pruebas realizadas.

Con confirmación estricta, después debe pedir autorización explícita. La opción
`false` solo omite esa pregunta para commits locales; no amplía ninguna otra
autorización.

La autorización puede ser:

- para un commit concreto;
- para todos los commits coherentes de la tarea actual.

Con confirmación estricta, si el usuario autoriza los commits coherentes de la
tarea actual, no es necesario volver a pedir permiso para cada commit previsto,
siempre que no cambie sustancialmente el alcance.

La autorización no se hereda automáticamente a tareas posteriores.

Formato recomendado para los mensajes:

```text
tipo: descripción breve
```

Tipos habituales: `feat`, `fix`, `docs`, `refactor`, `test`, `build` y `chore`.

Los mensajes de commit y de etiqueta se escribirán en inglés. El resto del proyecto seguirá el idioma que corresponda al proyecto, normalmente español de España.

## ROOT-22 7. Verificación proporcional

La verificación debe ser suficiente para confiar en el resultado, no una lista fija que se repite mecánicamente.

Al terminar una tarea, el agente debe:

- revisar los cambios realizados;
- ejecutar las pruebas, comprobaciones o compilación disponibles y relevantes;
- comprobar que no ha introducido secretos o archivos temporales evidentes;
- informar de cualquier verificación no realizada.

No es obligatorio ejecutar pruebas inexistentes ni revisar manualmente todo el historial del repositorio.

Para una tarea pequeña bastará normalmente con revisar el diff y ejecutar una comprobación localizada, si existe.

Para una tarea normal se ejecutará la validación principal del proyecto.

Para una tarea compleja se añadirán comprobaciones específicas cuando reduzcan un riesgo real.

## ROOT-23 8. Integración en `main`

Modificar una rama y fusionarla en `main` son decisiones distintas.

El agente no integrará automáticamente una rama en `main` salvo que el usuario lo haya solicitado o autorizado expresamente.

Antes de integrar, debe comprobar de forma breve:

- que la tarea está terminada;
- que las pruebas relevantes son correctas;
- que no hay cambios del usuario que vayan a perderse;
- que la rama que se va a integrar es la correcta.

El uso de `--no-ff` no es obligatorio. Se elegirá la estrategia que mantenga un historial claro y sencillo para ese repositorio.

Tras una integración autorizada, se comprobará el estado final. No es necesario eliminar inmediatamente la rama si puede ser útil para recuperar o revisar el trabajo.

## ROOT-24 9. CHANGELOG.md

`CHANGELOG.md` se actualizará solo cuando el cambio tenga valor para el usuario, para una versión publicada o para el mantenimiento futuro del proyecto.

No se actualizará por cambios puramente internos, correcciones tipográficas menores o cada commit.

Cuando corresponda, se anotará primero en `[Sin publicar]`:

```markdown
## [Sin publicar]

### Añadido
- Nueva funcionalidad.

### Modificado
- Cambio relevante.

### Corregido
- Error solucionado.
```

El agente puede proponer actualizarlo, pero no debe convertirlo en una obligación automática de toda tarea.

## ROOT-25 10. Versionado y etiquetas

El versionado semántico se aplicará cuando el proyecto utilice versiones publicadas o el usuario solicite una versión.

No se cambiará el número de versión por haber realizado muchos cambios.

Orientación:

| Cambio | Incremento habitual |
|---|---|
| Corrección compatible | `PATCH` |
| Funcionalidad compatible | `MINOR` |
| Cambio incompatible | `MAJOR` |

Crear una etiqueta, preparar una release o publicar una versión requiere autorización explícita, aunque los cambios ya estén committeados.

Las etiquetas anotadas utilizarán el prefijo `v`, por ejemplo `v0.2.0`.

## ROOT-26 11. Operaciones que requieren autorización explícita

El agente debe pedir autorización explícita antes de:

- fusionar una rama en `main`;
- hacer `push`, `fetch` con finalidad de integrar cambios o cualquier otra
  operación remota;
- crear una etiqueta o publicar una versión;
- ejecutar `reset`, `clean`, `rebase`, `filter-repo` u otra operación que pueda eliminar o reescribir trabajo;
- sobrescribir, descartar u ocultar cambios del usuario;
- eliminar una rama que contenga trabajo no integrado.

La confirmación del commit local sigue `strict_confirmation`: omitido o `true`
requiere confirmación explícita; `false` permite omitir solo esa pregunta tras
presentar el informe. Nunca autoriza `push`, `fetch` para integrar, merge, tag,
publicación ni operaciones destructivas. La autorización para una operación
concreta no autoriza automáticamente las demás.

## ROOT-27 12. Operaciones permitidas durante el trabajo

Salvo que el usuario indique lo contrario, el agente puede:

- leer el estado, historial y diferencias;
- crear una rama local de tarea cuando el flujo lo aconseje;
- modificar archivos dentro del alcance solicitado;
- ejecutar pruebas, linters, compilaciones y comprobaciones locales;
- preparar una propuesta de commit sin ejecutarlo;
- dejar cambios sin commit para que el usuario los revise.

## ROOT-28 13. Informe final

El informe final debe ser breve y centrarse en el resultado:

```text
Estado: completado / parcial / bloqueado
Rama: nombre de la rama
Cambios: resumen breve
Commit: creado / no creado / pendiente de autorización
Pruebas: OK / fallan / no disponibles
Integración: no realizada / realizada con autorización
CHANGELOG: actualizado / no aplicaba
Estado del árbol: limpio / contiene cambios pendientes
```

No es necesario informar de cada comando ejecutado.

## ROOT-29 14. Flujo operativo resumido

### ROOT-30 Tarea pequeña

```text
comprobar estado
    ↓
modificar y verificar
    ↓
confirmar según `strict_confirmation` (true por defecto)
    ↓
crear commit conforme a la confirmación configurada
```

### ROOT-31 Tarea normal

```text
comprobar estado
    ↓
crear rama si procede
    ↓
trabajar sin interrupciones innecesarias
    ↓
verificar al terminar
    ↓
confirmar según `strict_confirmation` (true por defecto)
    ↓
integrar solo si se solicita
```

### ROOT-32 Tarea compleja

```text
comprobar estado y riesgos
    ↓
crear rama específica
    ↓
trabajar por unidades coherentes
    ↓
verificar los puntos críticos
    ↓
confirmar commit según `strict_confirmation`; autorizar integración por separado
    ↓
publicar o etiquetar solo si se solicita
```

## ROOT-33 15. Principio rector

Git debe aportar seguridad y trazabilidad sin convertirse en una carga operativa.

El agente aplicará estas prioridades, en este orden:

1. no perder ni sobrescribir trabajo;
2. entregar una modificación verificable;
3. mantener un historial comprensible;
4. pedir autorización para las operaciones persistentes relevantes;
5. evitar ramas, commits, comprobaciones y documentación que no aporten valor real.

Cuando una regla entre en conflicto con la agilidad, el agente debe explicar brevemente el riesgo y proponer la opción más sencilla que lo controle.
