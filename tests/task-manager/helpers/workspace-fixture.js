import { inspectorState } from '../../../src/task-manager/state/inspector.js';
import { tagActions } from '../../../src/task-manager/state/tag-actions.js';
import { taskActions } from '../../../src/task-manager/state/task-actions.js';
import { taskTree } from '../../../src/task-manager/state/task-tree.js';
import { workspaceData } from '../../../src/task-manager/state/workspace-data.js';
import { workspaceUi } from '../../../src/task-manager/state/ui.js';

const modules = [workspaceData, workspaceUi, taskTree, taskActions, tagActions, inspectorState];

export function createWorkspace(overrides = {}) {
  const workspace = {};

  for (const module of modules) {
    if (module.data) Object.assign(workspace, module.data.call(workspace));
    for (const [name, method] of Object.entries(module.methods || {})) workspace[name] = method;
  }

  for (const module of modules) {
    for (const [name, computed] of Object.entries(module.computed || {})) {
      Object.defineProperty(workspace, name, {
        configurable: true,
        enumerable: true,
        get: () => computed.call(workspace)
      });
    }
  }

  Object.assign(workspace, overrides);
  return workspace;
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
