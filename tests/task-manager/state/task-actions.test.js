import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  addTaskComment: vi.fn(),
  addTaskDependency: vi.fn(),
  closeTask: vi.fn(),
  createTag: vi.fn(),
  createTask: vi.fn(),
  deleteTag: vi.fn(),
  listTags: vi.fn(),
  listTasks: vi.fn(),
  removeTaskDependency: vi.fn(),
  showTask: vi.fn(),
  updateTag: vi.fn(),
  updateTask: vi.fn()
}));

vi.mock('../../../src/task-manager/api/tk-client.js', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, unavailable = false) {
      super(message);
      this.unavailable = unavailable;
    }
  },
  ...api
}));

import { createWorkspace, deferred } from '../helpers/workspace-fixture.js';

beforeEach(() => {
  vi.clearAllMocks();
  api.listTags.mockResolvedValue([]);
  api.showTask.mockImplementation(async (id) => ({ id, title: `Detalle ${id}` }));
});

describe('task actions', () => {
  it('preserves a selected task that still exists after reload', async () => {
    api.listTasks.mockResolvedValue([
      { id: 'tk-1', title: 'Primera' },
      { id: 'tk-2', title: 'Segunda' }
    ]);
    const workspace = createWorkspace({ selectedTaskId: 'tk-2' });

    await expect(workspace.reloadWorkspace()).resolves.toBe(true);

    expect(workspace.selectedTaskId).toBe('tk-2');
    expect(workspace.detail.id).toBe('tk-2');
    expect(api.showTask).toHaveBeenCalledWith('tk-2');
  });

  it('selects the first task when the previous selection disappears', async () => {
    api.listTasks.mockResolvedValue([
      { id: 'tk-1', title: 'Primera' },
      { id: 'tk-2', title: 'Segunda' }
    ]);
    const workspace = createWorkspace({ selectedTaskId: 'tk-missing' });

    await workspace.reloadWorkspace();

    expect(workspace.selectedTaskId).toBe('tk-1');
    expect(api.showTask).toHaveBeenCalledWith('tk-1');
  });

  it('preserves an explicitly collapsed parent after reload', async () => {
    api.listTasks.mockResolvedValue([
      { id: 'parent', title: 'Padre' },
      { id: 'child', title: 'Hija', parent_id: 'parent' }
    ]);
    const workspace = createWorkspace({ expandedIds: ['parent'], collapsedIds: [] });

    workspace.toggleExpanded('parent');
    await workspace.reloadWorkspace();

    expect(workspace.expandedIds).toEqual([]);
    expect(workspace.collapsedIds).toEqual(['parent']);
  });

  it('discards an obsolete workspace reload response', async () => {
    const firstResponse = deferred();
    api.listTasks
      .mockImplementationOnce(() => firstResponse.promise)
      .mockResolvedValueOnce([{ id: 'tk-new', title: 'Nueva' }]);
    const workspace = createWorkspace();

    const firstReload = workspace.reloadWorkspace();
    const secondReload = workspace.reloadWorkspace();
    await secondReload;
    firstResponse.resolve([{ id: 'tk-old', title: 'Antigua' }]);

    await expect(firstReload).resolves.toBeNull();
    expect(workspace.tasks.map((task) => task.id)).toEqual(['tk-new']);
    expect(workspace.selectedTaskId).toBe('tk-new');
  });

  it('discards an obsolete task detail response', async () => {
    const firstDetail = deferred();
    api.showTask
      .mockImplementationOnce(() => firstDetail.promise)
      .mockResolvedValueOnce({ id: 'tk-2', title: 'Detalle nuevo' });
    const workspace = createWorkspace();

    const firstLoad = workspace.loadTaskDetail('tk-1');
    await workspace.loadTaskDetail('tk-2');
    firstDetail.resolve({ id: 'tk-1', title: 'Detalle antiguo' });
    await firstLoad;

    expect(workspace.selectedTaskId).toBe('tk-2');
    expect(workspace.detail).toMatchObject({ id: 'tk-2', title: 'Detalle nuevo' });
  });

  it('does not publish an error from an obsolete task detail failure', async () => {
    const firstDetail = deferred();
    api.showTask
      .mockImplementationOnce(() => firstDetail.promise)
      .mockResolvedValueOnce({ id: 'tk-2', title: 'Detalle nuevo' });
    const workspace = createWorkspace();

    const firstLoad = workspace.loadTaskDetail('tk-1');
    await workspace.loadTaskDetail('tk-2');
    firstDetail.reject(new Error('Fallo tardio del detalle antiguo'));
    await firstLoad;

    expect(workspace.errorMessage).toBe('');
    expect(workspace.detail).toMatchObject({ id: 'tk-2', title: 'Detalle nuevo' });
  });

  it('keeps the mutation busy until reload and then shows confirmation', async () => {
    const request = deferred();
    const workspace = createWorkspace({
      reloadWorkspace: vi.fn().mockResolvedValue(true),
      showToast: vi.fn()
    });

    const mutation = workspace.mutate('edit:tk-1', () => request.promise, 'Cambios guardados.');
    expect(workspace.isBusy('edit:tk-1')).toBe(true);
    request.resolve({ id: 'tk-1' });
    await mutation;

    expect(workspace.isBusy('edit:tk-1')).toBe(false);
    expect(workspace.reloadWorkspace).toHaveBeenCalledWith('');
    expect(workspace.showToast).toHaveBeenCalledWith('Cambios guardados.');
  });

  it('reports a confirmed mutation whose subsequent reload fails', async () => {
    const workspace = createWorkspace();
    workspace.reloadWorkspace = vi.fn().mockImplementation(async () => {
      workspace.errorMessage = 'Servidor temporalmente inaccesible.';
      return false;
    });

    await workspace.mutate('edit:tk-1', async () => ({ id: 'tk-1' }), 'Cambios guardados.');

    expect(workspace.errorMessage).toContain('La operación fue confirmada');
    expect(workspace.errorMessage).toContain('Servidor temporalmente inaccesible.');
  });

  it('confirms a mutation whose reload was superseded by a later one', async () => {
    const workspace = createWorkspace({
      reloadWorkspace: vi.fn().mockResolvedValue(null),
      showToast: vi.fn()
    });

    const result = await workspace.mutate('edit:tk-1', async () => ({ id: 'tk-1' }), 'Cambios guardados.');

    expect(result).toEqual({ id: 'tk-1' });
    expect(workspace.showToast).toHaveBeenCalledWith('Cambios guardados.');
    expect(workspace.errorMessage).toBe('');
  });

  it('normalizes priority values before updating a task', async () => {
    api.updateTask.mockResolvedValue({ id: 'tk-1' });
    const workspace = createWorkspace({
      selectedTaskId: 'tk-1',
      reloadWorkspace: vi.fn().mockResolvedValue(true),
      showToast: vi.fn()
    });

    await workspace.updateTaskField('tk-1', 'priority', '0');

    expect(api.updateTask).toHaveBeenCalledWith('tk-1', { priority: 0 });
    expect(workspace.showToast).toHaveBeenCalledWith('Prioridad actualizada.');
  });
});
