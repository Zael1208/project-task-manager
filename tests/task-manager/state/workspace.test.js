import { afterEach, describe, expect, it, vi } from 'vitest';
import { workspaceOptions } from '../../../src/task-manager/state/workspace.js';

const OriginalEventSource = globalThis.EventSource;

class FakeEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  emit(name, data = {}) {
    this.listeners.get(name)?.({ data: JSON.stringify(data) });
  }

  close() {
    this.closed = true;
  }
}

afterEach(() => {
  FakeEventSource.instances = [];
  if (OriginalEventSource) globalThis.EventSource = OriginalEventSource;
  else delete globalThis.EventSource;
});

describe('workspace SSE', () => {
  it('recarga el workspace cuando recibe un cambio confirmado', () => {
    globalThis.EventSource = FakeEventSource;
    const workspace = {
      loading: false,
      clientId: 'origin',
      reloadWorkspace: vi.fn(),
      showWorkspaceChangeToast: vi.fn(),
      workspaceEventSource: null,
      disconnectWorkspaceEvents: workspaceOptions.methods.disconnectWorkspaceEvents
    };

    workspaceOptions.methods.connectWorkspaceEvents.call(workspace);
    const source = FakeEventSource.instances[0];
    const changes = [{ id: 'tk-1', action: 'actualizada', title: 'Primera' }];
    source.emit('workspace.changed', { resource: 'tasks', source: 'external', changes });

    expect(source.url).toBe('/api/events?clientId=origin');
    expect(workspace.reloadWorkspace).toHaveBeenCalledOnce();
    expect(workspace.showWorkspaceChangeToast).toHaveBeenCalledWith(changes);

    source.emit('workspace.changed', {
      resource: 'tasks',
      source: 'http',
      originClientId: 'other-browser',
      changes
    });
    expect(workspace.reloadWorkspace).toHaveBeenCalledTimes(2);
    expect(workspace.showWorkspaceChangeToast).toHaveBeenCalledTimes(2);

    source.emit('workspace.changed', {
      resource: 'tasks',
      source: 'http',
      originClientId: 'origin',
      changes
    });
    expect(workspace.reloadWorkspace).toHaveBeenCalledTimes(3);
    expect(workspace.showWorkspaceChangeToast).toHaveBeenCalledTimes(2);

    workspaceOptions.methods.disconnectWorkspaceEvents.call(workspace);
    expect(source.closed).toBe(true);
    expect(workspace.workspaceEventSource).toBeNull();
  });

  it('no descarta un cambio externo que llega durante la carga inicial', () => {
    globalThis.EventSource = FakeEventSource;
    const workspace = {
      loading: true,
      clientId: 'origin',
      reloadWorkspace: vi.fn(),
      showWorkspaceChangeToast: vi.fn(),
      workspaceEventSource: null,
      disconnectWorkspaceEvents: workspaceOptions.methods.disconnectWorkspaceEvents
    };

    workspaceOptions.methods.connectWorkspaceEvents.call(workspace);
    const changes = [{ id: 'tk-1', action: 'creada', title: 'Nueva' }];
    FakeEventSource.instances[0].emit('workspace.changed', { resource: 'tasks', source: 'external', changes });

    expect(workspace.reloadWorkspace).toHaveBeenCalledOnce();
    expect(workspace.showWorkspaceChangeToast).toHaveBeenCalledWith(changes);
  });
});
