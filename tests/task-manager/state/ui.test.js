import { describe, expect, it } from 'vitest';
import { createWorkspace } from '../helpers/workspace-fixture.js';

describe('workspace ui state', () => {
  it('removes the busy key when the operation ends instead of storing false', () => {
    const workspace = createWorkspace();

    workspace.setBusy('edit:tk-1', true);
    expect(workspace.isBusy('edit:tk-1')).toBe(true);
    expect(Object.keys(workspace.busy)).toEqual(['edit:tk-1']);

    workspace.setBusy('edit:tk-1', false);
    expect(workspace.isBusy('edit:tk-1')).toBe(false);
    // Antes quedaba la clave con valor false y el diccionario crecia durante
    // una sesion larga, porque los identificadores cambian en cada operacion.
    expect(Object.keys(workspace.busy)).toEqual([]);
  });

  it('leaves the other keys untouched when one operation ends', () => {
    const workspace = createWorkspace();

    workspace.setBusy('edit:tk-1', true);
    workspace.setBusy('edit:tk-2', true);
    workspace.setBusy('edit:tk-1', false);

    expect(Object.keys(workspace.busy)).toEqual(['edit:tk-2']);
    expect(workspace.isBusy('edit:tk-2')).toBe(true);
  });
});
