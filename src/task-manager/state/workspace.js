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
    this.connectWorkspaceEvents();
    this.reloadWorkspace();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleEscape);
    this.disconnectWorkspaceEvents();
  },
  methods: {
    connectWorkspaceEvents() {
      if (typeof EventSource === 'undefined') return;
      this.disconnectWorkspaceEvents();
      const source = new EventSource('/api/events');
      source.addEventListener('workspace.changed', () => {
        if (!this.loading) this.reloadWorkspace();
      });
      this.workspaceEventSource = source;
    },
    disconnectWorkspaceEvents() {
      this.workspaceEventSource?.close();
      this.workspaceEventSource = null;
    }
  }
};
