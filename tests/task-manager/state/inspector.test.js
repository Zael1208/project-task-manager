import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorkspace } from '../helpers/workspace-fixture.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('inspector action dispatch', () => {
  it('warns instead of staying silent when the action type is unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const workspace = createWorkspace();

    expect(() => workspace.handleInspectorAction({ type: 'edit.sve' })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('edit.sve'));
  });

  it('dispatches a known action to its method', () => {
    const workspace = createWorkspace();
    workspace.loadTaskDetail = vi.fn();

    workspace.handleInspectorAction({ type: 'task.select', payload: { id: 'tk-9' } });

    expect(workspace.loadTaskDetail).toHaveBeenCalledWith('tk-9');
  });
});
