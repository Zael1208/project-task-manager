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
      reloadWorkspace: vi.fn(),
      workspaceEventSource: null,
      disconnectWorkspaceEvents: workspaceOptions.methods.disconnectWorkspaceEvents
    };

    workspaceOptions.methods.connectWorkspaceEvents.call(workspace);
    const source = FakeEventSource.instances[0];
    source.emit('workspace.changed', { resource: 'tasks' });

    expect(source.url).toBe('/api/events');
    expect(workspace.reloadWorkspace).toHaveBeenCalledOnce();

    workspaceOptions.methods.disconnectWorkspaceEvents.call(workspace);
    expect(source.closed).toBe(true);
    expect(workspace.workspaceEventSource).toBeNull();
  });
});
