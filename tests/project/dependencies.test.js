import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import toast from '../../public/vendor/toast-anchor.mjs';

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')
);

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

// Toda sección que no sea devDependencies acaba instalando código en ejecución:
// `optionalDependencies` y `peerDependencies` también cuentan para RNF-01.
const RUNTIME_SECTIONS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

const METODOS_DEL_ADAPTADOR = ['configure', 'success', 'error', 'info', 'modal'];

describe('RNF-01: dependencias del producto', () => {
  it('no declara dependencias de ejecución en ninguna sección', () => {
    const declaradas = RUNTIME_SECTIONS.flatMap((section) =>
      Object.keys(packageJson[section] ?? {}).map((name) => `${section}:${name}`)
    );

    expect(declaradas).toEqual([]);
  });

  it('fija las dependencias de desarrollo a versiones exactas', () => {
    const devDependencies = Object.entries(packageJson.devDependencies ?? {});

    // Si la sección desapareciera, la comprobación de rangos pasaría sin mirar nada.
    expect(devDependencies.length).toBeGreaterThan(0);

    const ranged = devDependencies
      .filter(([, version]) => !EXACT_VERSION.test(version))
      .map(([name, version]) => `${name}@${version}`);

    expect(ranged).toEqual([]);
  });
});

describe('Toast Anchor vendorizado', () => {
  it('expone en el fichero copiado la API que usa el adaptador', () => {
    for (const metodo of METODOS_DEL_ADAPTADOR) {
      expect(typeof toast[metodo], `toast.${metodo}`).toBe('function');
    }
  });
});
