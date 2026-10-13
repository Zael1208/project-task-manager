# Contrato de documentación y estado del proyecto

## 1. Propósito

Este contrato define qué documenta cada archivo del repositorio, qué puede
contener y qué no, y de dónde sale cada dato.

Sus objetivos son:

- que cada dato tenga un único dueño y una única ubicación;
- que ningún documento pueda quedar obsoleto sin que nadie lo edite;
- evitar el acoplamiento entre documentos: nada de copias, nada de listas de
  cifras que haya que sincronizar a mano;
- que quien lea un documento sepa qué es normativo y qué es registro;
- reducir la documentación a lo que aporta valor real.

Lo que da seguridad no es repetir la información en varios sitios, sino saber
dónde vive cada cosa.

## 2. Alcance y prioridad

Estas reglas se aplican a todos los documentos versionados del repositorio y a
las bases locales del proyecto.

Las instrucciones concretas del usuario prevalecen sobre este contrato.

Ante la duda entre documentar y no documentar: se documenta lo **estable**, se
enlaza lo que ya está escrito y no se copia lo que cambia solo.

## 3. Principio rector

**Un dato tiene un único dueño.** Si el mismo dato aparece en dos documentos, es
un defecto: se elige el dueño y en el otro sitio se enlaza.

De ahí se sigue la prueba práctica de este contrato: *un documento que puede
quedar obsoleto sin que nadie lo edite está mal escrito.*

## 4. Dueño de cada dato

| Dato | Dueño | Cómo se consulta |
|---|---|---|
| Estado del trabajo: qué se hace, relevo, evidencias | Tablero `tk` | `npm run odd:tk -- ...` sobre `tk/.tacks/tacks.db` |
| Historia de la entrega: qué se entregó y cuándo | Git y `CHANGELOG.md` | `git log`, `CHANGELOG.md` |
| Requisitos, alcance y criterios de aceptación | `PRD.md` | `PRD.md` |
| Decisiones durables: contexto, alternativas, consecuencias | `docs/decisions/` (un ADR por decisión) | `docs/decisions/` |
| Porqué del diseño tal y como está | `docs/architecture.md` | `docs/architecture.md` |
| Contratos técnicos: API, modelos, eventos | `docs/contracts.md` | `docs/contracts.md` |
| Cómo se construye, se prueba y se entrega | `docs/operations.md` | `docs/operations.md` |
| Estructura de ficheros y convenciones de trabajo | `docs/development.md` | `docs/development.md` |
| Riesgos, deuda y su cobertura de pruebas | `docs/known-risks.md` | `docs/known-risks.md` |
| Flujo de Git, CHANGELOG y versionado | `CONTRATO_FLUJO_GIT_VERSIONADO.md` | ese contrato |
| Reglas que valen en cada turno para agentes | `AGENTS.md` y reglas de carpeta | `AGENTS.md`, `tk/AGENTS.md` |
| Presentación del producto y puesta en marcha | `README.md` | `README.md` |
| Contenido de los artefactos generados | El build | `npm run build` y los ficheros versionados |

**Identificadores.** Cada registro numera lo suyo y es su dueño: los requisitos y
criterios (`O-`, `NO-`, `CU-`, `RF-`, `RN-`, `RNF-`, `CA-`) son del `PRD.md`, y
los riesgos (`TM-R#`, `RX-#`) de `docs/known-risks.md`. Los identificadores son de
**solo añadir**: no se renumeran ni se borran, y su dueño garantiza que existen.
Desde otro documento solo se citan esos registros y los ADR; cualquier otro dato se
enuncia o se enlaza.

## 5. Misión y frontera de cada documento

| Documento | Misión | Puede contener | No puede contener |
|---|---|---|---|
| `PRD.md` | Lo que el producto debe cumplir | Requisitos, alcance, no objetivos, casos de uso, contratos de datos y criterios de aceptación | Estado, cifras, verificaciones, progreso, decisiones, inventarios de ficheros ni historia de la extracción |
| `README.md` | Qué es el proyecto y cómo se arranca | Descripción, requisitos de entorno, instalación, comandos, mapa de carpetas | Progreso, fases, recuentos ni estado |
| `AGENTS.md` | Lo que vale en cada turno dentro del repositorio | Reglas, enrutado al detalle canónico, comandos | Estado, planes, cifras |
| `CONTRATO_FLUJO_GIT_VERSIONADO.md` | Cómo se versiona y se integra el trabajo | Ramas, commits, verificación, integración, CHANGELOG, etiquetas, autorizaciones | Estado del producto |
| `CONTRATO_DOCUMENTACION.md` (este) | Dónde vive cada dato y qué escribe cada documento | Misiones, propiedad de los datos, prohibiciones y procedimiento | Estado, cifras, contenido duplicado de otros documentos |
| `CHANGELOG.md` | Qué cambió entre versiones | Cambios por versión, con su fecha y su tipo; `[Sin publicar]` acumula lo pendiente de publicar | Planes, requisitos, estado del trabajo |
| `docs/architecture.md` | Cómo está construido y por qué | Capas, fronteras, flujos, invariantes y el motivo de cada elección de diseño | Listas de pendientes, progreso, cifras |
| `docs/contracts.md` | Formas de datos y API que no se pueden romper | Modelos, endpoints, eventos, claves de estado | Estado, decisiones sin contexto, cifras |
| `docs/operations.md` | Cómo se opera y qué se ha verificado | Comandos, build, pruebas, entrega y el registro de verificaciones con su fecha | Requisitos, decisiones, progreso general |
| `docs/development.md` | Cómo trabajar en el código | Estructura, convenciones, flujo de trabajo, mapa de ficheros vigente | Historia de la extracción, cifras de la suite, estado |
| `docs/known-risks.md` | Qué riesgo y qué deuda existen y cómo se cubren | Riesgos vivos con su cobertura, los resueltos y su lección, deuda aceptada | Requisitos, planes, estado del trabajo |
| `docs/decisions/` | Por qué se decidió algo y qué se descartó | Un ADR por decisión: contexto, decisión, alternativas y consecuencias | Requisitos, cifras, estado |
| Tablero `tk` | Qué se está haciendo | Tareas y partes de épica, relevo y evidencia funcional en frases cortas | Documentación: misiones, resúmenes, métricas, cifras, listas de ficheros, estado de Git ni del proceso de revisión |
| `src/task-manager/README.md`, `tk/AGENTS.md` | Reglas y notas de esa carpeta | Lo específico de esa carpeta | Lo que ya cubre un documento de la raíz o `docs/` |

## 6. Lo que no puede aparecer en un documento normativo

En `PRD.md`, `docs/contracts.md`, `docs/architecture.md`, `README.md`,
`AGENTS.md`, `docs/development.md`, este contrato **y el tablero `tk`**:

1. **Recuentos que cambian con el código**: pruebas, ficheros, tareas, endpoints,
   líneas de un documento. Se escribe «la suite» o «los endpoints de la sección
   12». Con más motivo en el tablero `tk`, que no es un documento.
2. **Tamaños, hashes y comprobaciones de artefactos.** El artefacto es su propio
   registro; el build lo reproduce.
3. **Fechas de verificación.** Una fecha convierte un requisito en una promesa
   caducada; el registro con fecha vive en `docs/operations.md` o en `tk`.
4. **Tablas de progreso o de estado** («Fase | Estado», listas con marca) y pasos
   ya completados mezclados con lo que hay que cumplir.
5. **Inventarios de ficheros copiados a mano.** La estructura la describe
   `docs/development.md` y la comprueba el propio repositorio.
6. **Identificadores de otro documento**, salvo los tres registros numerados con
dueño declarado y de solo añadir —requisitos del `PRD.md`, riesgos de
`docs/known-risks.md` y ficheros ADR de `docs/decisions/`—. Los identificadores de
decisiones internas o de cuestiones abiertas no existen fuera del documento que
los definió: en su lugar se enuncia el hecho.
7. **Secciones duplicadas de otro documento.** Se enlaza.
8. **Afirmaciones sobre el presente que nadie actualizará** («hoy», «vigente»,
   «actualmente») salvo que formen parte de un requisito.
9. **Métricas y resúmenes en el tablero `tk`.** El tablero no es un documento vivo:
   no se redacta en él. Se anotan el relevo y, como comentarios, la evidencia
   funcional del trabajo; ni informes de estado, ni recuentos de lo que se ha
   tocado, ni resúmenes del proyecto.

## 7. Cómo se escribe

- **Idioma**: español de España en documentos, código, comentarios y mensajes de
  la interfaz. Los mensajes de commit y las etiquetas anotadas van en inglés
  (contrato de Git).
- **Forma**: frases cortas, tablas para lo enumerable, enlaces relativos dentro
  del repositorio.
- **Cabecera**: cada documento declara su misión en su primera sección. Si no cabe
  en una línea, tiene dos misiones y hay que partirlo.
- **Tiempo verbal**: los documentos normativos describen lo que debe ser, en
  presente. La historia se cuenta en `CHANGELOG.md` y en `tk`; el porqué del
  diseño, en `docs/architecture.md` y en los ADR.
- **Momento**: se escribe al hacer el cambio, no después. Un dato que hay que
  sincronizar a mano termina mintiendo.

## 8. Procedimiento al cambiar algo

| Cambio | Dónde se escribe | Dónde no |
|---|---|---|
| Requisito nuevo o modificado | `PRD.md`, solo el requisito | Cifras, estado, ni la historia de por qué se añadió |
| Decisión de diseño | ADR en `docs/decisions/` y, si explica el diseño vivo, `docs/architecture.md` | `PRD.md` |
| Comportamiento del producto | Código, pruebas, `CHANGELOG.md` y `tk`; `docs/contracts.md` o `docs/architecture.md` si cambian formas o fronteras | `PRD.md`, salvo que cambie un requisito |
| Riesgo nuevo o resuelto | `docs/known-risks.md` | `PRD.md` |
| Comandos, scripts o estructura | El documento que los describe: `README.md`, `docs/operations.md` o `docs/development.md` | Los demás |
| Verificación realizada | `tk` como evidencia, y `docs/operations.md` si debe quedar como registro | Los documentos normativos |
| Cierre de versión | `CHANGELOG.md` sale de `[Sin publicar]` y se etiqueta (contrato de Git) | — |

**Señal de alarma**: si un cambio obliga a «actualizar las cifras» en dos sitios,
uno de los dos sobra. Se para, se decide el dueño y se elimina la copia.

## 9. Comprobaciones antes de cerrar un cambio

Estas búsquedas detectan los acoplamientos descritos. Son **heurísticas**: cada
resultado se revisa; no se aplican a ciegas. Lo que aparezca se justifica como
registro de un hecho pasado (`CHANGELOG.md`, el registro de verificaciones de
`docs/operations.md`, las entradas ya resueltas de `docs/known-risks.md`, los ADR)
o se retira.

Las comprobaciones **mecánicas** —cifras, medidas, hashes, fechas, tablas de
progreso e identificadores sin dueño— corren dentro de `npm test`, en
[`tests/project/documentation.test.js`](tests/project/documentation.test.js), y
también solas con `npm run docs:check`. Los comandos de abajo sirven para revisar a
mano lo que un patrón no distingue.

```bash
# Recuentos que cambian con el código.
rg -n "[0-9]+ (pruebas|ficheros|archivos|tareas|endpoints|líneas)" -g '*.md' -g '!CHANGELOG.md' -g '!docs/operations.md'

# Tamaños, hashes y fechas sueltas.
rg -n "[0-9]+\.[0-9]{3} (B|KB|MB)|sha256|[0-9]{2}/[0-9]{2}/[0-9]{4}" -g '*.md' -g '!CHANGELOG.md' -g '!docs/operations.md'

# Tablas de progreso y afirmaciones de presente.
rg -n "^\| *(Fase|Hito|Paso) *\| *(Estado|Hecho)" -g '*.md'
rg -n "\b(hoy|actualmente|vigente|pendiente de)\b" -g 'PRD.md' -g 'docs/contracts.md'

# Identificadores citados desde otro documento.
rg -n "\((D|QA|RX|TM-R)-?[0-9]+\)|\b(D|QA)-[0-9]+\b" -g '*.md' -g '*.js' -g '!docs/decisions'
```

## 10. Excepciones

- **Registros de hechos pasados**: las secciones que narran lo ya ocurrido
  —`CHANGELOG.md`, el registro de verificaciones de `docs/operations.md`, las
  entradas de riesgo ya resueltas y los ADR— pueden citar cifras, fechas o tamaños
  como parte del hecho, con su fecha y sin presentarlos como vigentes.
- **Vocabulario técnico**: «vigente» o «actual» aplicados a una petición, a un
  proceso o a una conexión en curso no son afirmaciones sobre el estado del
  proyecto.
- **Software de terceros**: se fija por versión, no por hash ni por tamaño.
- **Enlaces**: citar el nombre de un documento, de un fichero o de un endpoint es
  enlazar, no duplicar.

## 11. Relación con el contrato de Git

El contrato de Git gobierna ramas, commits, verificación, integración, CHANGELOG,
versionado y las operaciones que exigen autorización. Este contrato gobierna qué
contiene cada documento y dónde vive cada dato. No se contradicen: cuando un
cambio de código o de flujo obliga a documentar, los dos se aplican.

## 12. Flujo resumido

```text
cambio
   ↓
¿requisito nuevo?          → PRD.md
¿decisión?                 → ADR y, si aplica, architecture.md
¿forma o frontera nueva?   → contracts.md / architecture.md
¿riesgo?                   → known-risks.md
¿comando, estructura?      → README.md / operations.md / development.md
   ↓
tk: tarea, relevo y evidencia funcional
   ↓
CHANGELOG.md en [Sin publicar]
   ↓
verificación (contrato de Git)
   ↓
cierre e integración (contrato de Git)
```

## 13. Principio rector

Cada dato, un solo dueño. Cada documento, una sola misión. Lo que cambia solo, no
se copia.

Cuando una regla de este contrato choque con la utilidad del momento, el agente
debe explicar brevemente el riesgo y proponer la opción más sencilla que lo
controle.
