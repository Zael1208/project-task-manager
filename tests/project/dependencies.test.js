import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')
);

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

describe('RNF-01: dependencias del producto', () => {
  it('no declara dependencias de ejecución', () => {
    expect(Object.keys(packageJson.dependencies ?? {})).toEqual([]);
  });

  it('fija las dependencias de desarrollo a versiones exactas', () => {
    const ranged = Object.entries(packageJson.devDependencies ?? {})
      .filter(([, version]) => !EXACT_VERSION.test(version))
      .map(([name, version]) => `${name}@${version}`);

    expect(ranged).toEqual([]);
  });
});
