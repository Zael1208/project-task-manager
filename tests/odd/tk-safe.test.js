import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { findForbiddenMetadata, textValuesForCommand, validateCommand } = require('../../scripts/odd-tk.cjs');

describe('guardia de escritura ODD para tk', () => {
  it('rechaza hashes, ramas y operaciones de Git en notas o comentarios', () => {
    expect(findForbiddenMetadata(['commit 7f911c7', 'branch feature/test'])).toEqual([
      'commit',
      'branch'
    ]);
    expect(findForbiddenMetadata(['sin push'])).toContain('push');
    expect(findForbiddenMetadata(['merge'])).toContain('merge');
    expect(findForbiddenMetadata(['árbol limpio'])).toContain('árbol limpio');
  });

  it('permite evidencia funcional sin estado de Git', () => {
    expect(validateCommand('update', ['tk-1', '--notes', 'Tests 17/90 y build correctos'])).toEqual({
      ok: true,
      message: ''
    });
  });

  it('solo inspecciona texto de comandos que escriben en tk', () => {
    expect(textValuesForCommand('list', ['--notes', 'commit 7f911c7'])).toEqual([]);
    expect(validateCommand('comment', ['tk-1', 'Se corrigió el contrato SSE'])).toEqual({
      ok: true,
      message: ''
    });
    expect(validateCommand('comment', ['tk-1', 'sha256:0123456789abcdef'])).toMatchObject({ ok: false });
  });
});
