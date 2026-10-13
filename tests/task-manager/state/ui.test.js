import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn()
}));

vi.mock('../../../src/task-manager/notifications/toast-anchor.js', () => ({
  notifyError: toast.error,
  notifyInfo: toast.info,
  notifySuccess: toast.success
}));

import { createWorkspace } from '../helpers/workspace-fixture.js';

beforeEach(() => vi.clearAllMocks());

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

  it('informa cada tarea afectada por un cambio externo', () => {
    const workspace = createWorkspace();

    workspace.showWorkspaceChangeToast([
      { id: 'tk-1', action: 'actualizada', title: 'Preparar informe' },
      { id: 'tk-2', action: 'cerrada', title: 'Revisar entrega' }
    ]);

    expect(toast.info).toHaveBeenNthCalledWith(1, 'Tarea tk-1 actualizada: “Preparar informe”. La lista se ha recargado.');
    expect(toast.info).toHaveBeenNthCalledWith(2, 'Tarea tk-2 cerrada: “Revisar entrega”. La lista se ha recargado.');
  });
});
