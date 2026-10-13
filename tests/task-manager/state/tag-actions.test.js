import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mapTask } from '../../../src/shared/tasks/task-model.js';

const api = vi.hoisted(() => ({
  deleteTag: vi.fn()
}));
const toast = vi.hoisted(() => ({
  configure: vi.fn(),
  modal: vi.fn()
}));

vi.mock('../../../src/task-manager/api/tk-client.js', () => ({
  createTag: vi.fn(),
  deleteTag: api.deleteTag,
  updateTag: vi.fn()
}));
vi.mock('toast-anchor', () => ({ default: toast }));

import { createWorkspace } from '../helpers/workspace-fixture.js';

beforeEach(() => {
  vi.clearAllMocks();
  api.deleteTag.mockResolvedValue({ ok: true });
});

describe('tag actions', () => {
  it('confirma el borrado con Toast Anchor antes de mutar', async () => {
    toast.modal.mockResolvedValue(true);
    const workspace = createWorkspace({
      tasks: [mapTask({ id: 'tk-1', title: 'Una tarea', tags: ['alfa'] })],
      reloadWorkspace: vi.fn().mockResolvedValue(true),
      showToast: vi.fn()
    });

    await workspace.requestDeleteTag({ name: 'alfa' });

    expect(toast.modal).toHaveBeenCalledWith(
      'Eliminar etiqueta',
      'Vas a eliminar “alfa” de 1 tarea.',
      expect.objectContaining({ confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' })
    );
    expect(api.deleteTag).toHaveBeenCalledWith('alfa');
  });

  it('no borra la etiqueta si se cancela la confirmación', async () => {
    toast.modal.mockResolvedValue(false);
    const workspace = createWorkspace({
      tasks: [mapTask({ id: 'tk-1', title: 'Una tarea', tags: ['alfa'] })],
      reloadWorkspace: vi.fn(),
      showToast: vi.fn()
    });

    await workspace.requestDeleteTag({ name: 'alfa' });

    expect(api.deleteTag).not.toHaveBeenCalled();
    expect(workspace.reloadWorkspace).not.toHaveBeenCalled();
  });
});
