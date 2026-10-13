import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));

// Documentos normativos: fijan lo que debe ser. Su misión no admite cifras,
// medidas, valores de hash ni fechas. Lo exige CONTRATO_DOCUMENTACION.md (§6).
const NORMATIVOS = [
  'PRD.md',
  'README.md',
  'AGENTS.md',
  'CONTRATO_DOCUMENTACION.md',
  'CONTRATO_FLUJO_GIT_VERSIONADO.md',
  'docs/architecture.md',
  'docs/contracts.md',
  'docs/development.md'
];

// Todo lo que el contrato exige que tenga parcela declarada.
const DOCUMENTADOS = [
  'PRD.md',
  'README.md',
  'AGENTS.md',
  'CONTRATO_FLUJO_GIT_VERSIONADO.md',
  'CONTRATO_DOCUMENTACION.md',
  'CHANGELOG.md',
  'docs/architecture.md',
  'docs/contracts.md',
  'docs/operations.md',
  'docs/development.md',
  'docs/known-risks.md',
  'docs/decisions/',
  'tk'
];

const RECUENTOS = /(?<![\d.,])\d+\s*(?:pruebas|ficheros|archivos|tareas|comentarios|campos|filas|l[ií]neas|lineas|endpoints|rutas)\b/i;
const MEDIDAS = /\b\d+(?:[.,]\d+)?\s*(?:B|KB|MB)\b/;
const HASHES = /\b(?:sha256|sha1|md5)\s*[:=]\s*[0-9a-f]{8,}|\b[0-9a-f]{16,}\b/i;
const FECHAS = /\b\d{2}\/\d{2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/;
const TABLA_DE_PROGRESO = /^\|\s*(?:Fase|Hito|Paso)\s*\|\s*(?:Estado|Hecho|Progreso)/i;

const RECOMENDADOS = /\b(?:RF|RNF|RN|CA|CU|NO|O)-\d+\b/g;
const RIESGOS = /\bTM-R\d+\b|\bRX-\d+\b/g;
const DESCARTADOS = /\b(?:D|QA)-\d+\b/;

const ignorar = new Set(['node_modules', '.git', 'tk', 'public']);

function recorrer(rel, acc = []) {
  for (const entrada of readdirSync(path.join(root, rel))) {
    if (ignorar.has(entrada)) continue;
    const hijo = rel ? `${rel}/${entrada}` : entrada;
    if (statSync(path.join(root, hijo)).isDirectory()) recorrer(hijo, acc);
    else acc.push(hijo);
  }
  return acc;
}

function lineasDe(rel) {
  // Las líneas dentro de un bloque de código son ejemplos, no afirmaciones.
  let enBloque = false;
  return readFileSync(path.join(root, rel), 'utf8').split('\n').map((texto, indice) => {
    if (/^\s*```/.test(texto)) enBloque = !enBloque;
    return { numero: indice + 1, texto, enBloque };
  });
}

const documentos = recorrer('').filter((f) => f.endsWith('.md'));
const codigo = recorrer('').filter((f) => f.endsWith('.js') || f.endsWith('.cjs'));

describe('documentación: documentos normativos sin estado ni medidas', () => {
  for (const documento of NORMATIVOS) {
    it(`${documento} no lleva cifras, medidas, hashes ni fechas`, () => {
      const encontrados = lineasDe(documento)
        .filter((l) => !l.enBloque)
        .flatMap((l) => [
          ...[RECUENTOS, MEDIDAS, HASHES, FECHAS]
            .filter((patron) => patron.test(l.texto))
            .map((patron) => `${documento}:${l.numero} [${patron.source.slice(0, 40)}]`)
        ]);

      expect(encontrados).toEqual([]);
    });
  }
});

describe('documentación: sin tablas de progreso', () => {
  it('ningún documento mantiene una tabla de fases o hitos con estado', () => {
    const encontrados = documentos.flatMap((documento) =>
      lineasDe(documento)
        .filter((l) => TABLA_DE_PROGRESO.test(l.texto))
        .map((l) => `${documento}:${l.numero}`)
    );

    expect(encontrados).toEqual([]);
  });
});

describe('documentación: identificadores sin dueño', () => {
  it('ningún documento cita un identificador descartado', () => {
    const encontrados = [...documentos, ...codigo]
      .flatMap((fichero) => readFileSync(path.join(root, fichero), 'utf8').split('\n')
        .map((texto, indice) => ({ texto, indice }))
        .filter(({ texto }) => DESCARTADOS.test(texto))
        .map(({ indice }) => `${fichero}:${indice + 1}`));

    expect(encontrados).toEqual([]);
  });

  it('todo requisito citado está definido en el PRD', () => {
    const definidos = new Set(readFileSync(path.join(root, 'PRD.md'), 'utf8').match(RECOMENDADOS) ?? []);
    const citados = [...documentos, ...codigo]
      .filter((fichero) => fichero !== 'PRD.md')
      .flatMap((fichero) => (readFileSync(path.join(root, fichero), 'utf8').match(RECOMENDADOS) ?? [])
        .filter((id) => !definidos.has(id))
        .map((id) => `${fichero}: ${id}`));

    expect(citados).toEqual([]);
  });

  it('todo riesgo citado está definido en el registro de riesgos', () => {
    const registro = 'docs/known-risks.md';
    const definidos = new Set(readFileSync(path.join(root, registro), 'utf8').match(RIESGOS) ?? []);
    const citados = [...documentos, ...codigo]
      .filter((fichero) => fichero !== registro)
      .flatMap((fichero) => (readFileSync(path.join(root, fichero), 'utf8').match(RIESGOS) ?? [])
        .filter((id) => !definidos.has(id))
        .map((id) => `${fichero}: ${id}`));

    expect(citados).toEqual([]);
  });
});

describe('documentación: el contrato cubre cada documento', () => {
  it('la tabla de misiones nombra todos los documentos con parcela', () => {
    const contrato = readFileSync(path.join(root, 'CONTRATO_DOCUMENTACION.md'), 'utf8');

    expect(DOCUMENTADOS.filter((nombre) => !contrato.includes(nombre))).toEqual([]);
  });
});
