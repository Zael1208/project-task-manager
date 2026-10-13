import { setClientId } from '../api/tk-client.js';
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
  watch: {
    activeInspectorTab() { this.scheduleUiPreferencesPersistence(); },
    activeTaskFilter() { this.scheduleUiPreferencesPersistence(); },
    currentPeriod() { this.scheduleUiPreferencesPersistence(); },
    selectedTaskId() { this.scheduleUiPreferencesPersistence(); },
    advancedStatuses() { this.scheduleUiPreferencesPersistence(); },
    advancedPriorities() { this.scheduleUiPreferencesPersistence(); },
    advancedTags() { this.scheduleUiPreferencesPersistence(); },
    quickTagFilter() { this.scheduleUiPreferencesPersistence(); },
    taskSearchQuery() { this.scheduleUiPreferencesPersistence(); },
    expandedIds() { this.scheduleUiPreferencesPersistence(); },
    collapsedIds() { this.scheduleUiPreferencesPersistence(); },
    areTaskChipsVisible() { this.scheduleUiPreferencesPersistence(); }
  },
  mounted() {
    window.addEventListener('keydown', this.handleEscape);
    this.restoreUiPreferences();
    setClientId(this.clientId);
    this.connectWorkspaceEvents();
    this.reloadWorkspace();
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleEscape);
    this.cancelUiPreferencesPersistence();
    this.disconnectWorkspaceEvents();
  },
  methods: {
    connectWorkspaceEvents() {
      if (typeof EventSource === 'undefined') return;
      this.disconnectWorkspaceEvents();
      const source = new EventSource(`/api/events?clientId=${encodeURIComponent(this.clientId)}`);
      source.addEventListener('workspace.changed', (event) => {
        let change;
        try {
          change = JSON.parse(event.data);
        } catch {
          return;
        }
        this.reloadWorkspace();
        const isExternal = change.resource === 'tasks' && change.source === 'external';
        const isRemoteHttp = change.resource === 'tasks'
          && change.source === 'http'
          && change.originClientId
          && change.originClientId !== this.clientId;
        if (isExternal || isRemoteHttp) {
          this.showWorkspaceChangeToast?.(change.changes || []);
        }
      });
      this.workspaceEventSource = source;
    },
    disconnectWorkspaceEvents() {
      this.workspaceEventSource?.close();
      this.workspaceEventSource = null;
    }
  }
};
