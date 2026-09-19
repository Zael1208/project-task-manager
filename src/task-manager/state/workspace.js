import { inspectorState } from './inspector.js';
import { tagActions } from './tag-actions.js';
import { taskActions } from './task-actions.js';
import { taskTree } from './task-tree.js';
import { workspaceData } from './workspace-data.js';
import { workspaceUi } from './ui.js';

/**
 * Los mixins se fusionan en una unica instancia Options API. Sus dependencias
 * mediante `this` son deliberadas y se documentan en docs/architecture.md.
 */
export const workspaceOptions = {
  name: 'AppShell',
  mixins: [
    workspaceData,
    workspaceUi,
    taskTree,
    taskActions,
    tagActions,
    inspectorState
  ],
  mounted() {
    window.addEventListener('keydown', this.handleEscape);
    this.reloadWorkspace();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleEscape);
  }
};
