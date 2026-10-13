function createClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const COLORS = [
  { id: 'blue', hex: '#62a7ff' },
  { id: 'purple', hex: '#b58bff' },
  { id: 'green', hex: '#58d392' },
  { id: 'yellow', hex: '#f2bf59' },
  { id: 'orange', hex: '#ff9a55' },
  { id: 'red', hex: '#ff7373' }
];

export const UI_PREFERENCES_STORAGE_KEY = 'project-task-manager.ui-preferences.v1';
const UI_PREFERENCES_VERSION = 1;
const ACTIVE_TASK_FILTERS = ['all', 'current', 'open', 'in_progress', 'blocked', 'done'];
const CURRENT_PERIODS = ['today', 'week', 'month', 'year'];
const INSPECTOR_TABS = ['detail', 'edit', 'subtasks', 'dependencies', 'comments'];
const TASK_STATUSES = ['open', 'in_progress', 'done', 'blocked'];
const TASK_PRIORITIES = ['0', '1', '2', '3'];
const PERSISTED_FIELDS = [
  'activeTaskFilter',
  'currentPeriod',
  'activeInspectorTab',
  'selectedTaskId',
  'advancedStatuses',
  'advancedPriorities',
  'advancedTags',
  'quickTagFilter',
  'taskSearchQuery',
  'expandedIds',
  'collapsedIds',
  'areTaskChipsVisible'
];

function getStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function validString(value, maxLength = 200) {
  return typeof value === 'string' && value.length <= maxLength;
}

function validStringArray(value, allowedValues = null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => validString(item) && (!allowedValues || allowedValues.includes(item))))];
}

function normalizePreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const expandedIds = validStringArray(source.expandedIds);
  const collapsedIds = validStringArray(source.collapsedIds).filter((id) => !expandedIds.includes(id));
  return {
    activeTaskFilter: ACTIVE_TASK_FILTERS.includes(source.activeTaskFilter) ? source.activeTaskFilter : 'all',
    currentPeriod: CURRENT_PERIODS.includes(source.currentPeriod) ? source.currentPeriod : 'today',
    activeInspectorTab: INSPECTOR_TABS.includes(source.activeInspectorTab) ? source.activeInspectorTab : 'detail',
    selectedTaskId: validString(source.selectedTaskId) ? source.selectedTaskId : '',
    advancedStatuses: validStringArray(source.advancedStatuses, TASK_STATUSES),
    advancedPriorities: validStringArray(source.advancedPriorities, TASK_PRIORITIES),
    advancedTags: validStringArray(source.advancedTags),
    quickTagFilter: validString(source.quickTagFilter, 40) ? source.quickTagFilter : '',
    taskSearchQuery: validString(source.taskSearchQuery, 500) ? source.taskSearchQuery : '',
    expandedIds,
    collapsedIds,
    areTaskChipsVisible: typeof source.areTaskChipsVisible === 'boolean' ? source.areTaskChipsVisible : true
  };
}

export const workspaceData = {
  data() {
    return {
      clientId: createClientId(),
      tasks: [],
      tags: [],
      detail: null,
      selectedTaskId: '',
      colors: COLORS,
      loading: true,
      refreshing: false,
      unavailable: false,
      errorMessage: '',
      busy: {},
      activeInspectorTab: 'detail',
      activeTaskFilter: 'all',
      currentPeriod: 'today',
      currentPeriodNow: null,
      taskSearchQuery: '',
      quickTagFilter: '',
      advancedStatuses: [],
      advancedPriorities: [],
      advancedTags: [],
      isAdvancedFiltersOpen: false,
      areTaskChipsVisible: true,
      expandedIds: [],
      collapsedIds: [],
      isListMenuOpen: false,
      openTaskMenuId: '',
      isInspectorMenuOpen: false,
      isMobileInspectorOpen: false,
      isNewTaskOpen: false,
      isTagManagerOpen: false,
      newTaskDraft: { title: '', description: '', priority: '2', parent: '', tags: [] },
      editDraft: { title: '', description: '', notes: '', assignee: '', tags: [] },
      dependencyDraft: '',
      commentDraft: '',
      tagSearchQuery: '',
      tagFormMode: '',
      editingTagName: '',
      tagDraft: { name: '', description: '', color: 'blue' },
      tagFormError: '',
      detailRequestSequence: 0,
      reloadRequestSequence: 0,
      uiPreferencesPersistTimer: null,
      workspaceEventSource: null
    };
  },
  methods: {
    emptyTaskDraft(parent = '') {
      return { title: '', description: '', priority: '2', parent, tags: [] };
    },
    emptyEditDraft() {
      return { title: '', description: '', notes: '', assignee: '', tags: [] };
    },
    emptyTagDraft() {
      return { name: '', description: '', color: 'blue' };
    },
    getUiPreferencesStorage() {
      return getStorage();
    },
    readUiPreferences() {
      const storage = this.getUiPreferencesStorage();
      if (!storage) return null;
      try {
        const parsed = JSON.parse(storage.getItem(UI_PREFERENCES_STORAGE_KEY));
        if (parsed?.version !== UI_PREFERENCES_VERSION) return null;
        return normalizePreferences(parsed);
      } catch {
        return null;
      }
    },
    restoreUiPreferences() {
      const preferences = this.readUiPreferences();
      if (!preferences) return false;
      for (const field of PERSISTED_FIELDS) this[field] = preferences[field];
      return true;
    },
    reconcileUiPreferences(tags = []) {
      const availableTags = new Set(tags.map((tag) => tag?.name).filter((name) => validString(name, 40)));
      this.advancedTags = this.advancedTags.filter((tag) => availableTags.has(tag));
      if (this.quickTagFilter && !availableTags.has(this.quickTagFilter)) this.quickTagFilter = '';
    },
    persistUiPreferences() {
      const storage = this.getUiPreferencesStorage();
      if (!storage) return;
      const preferences = { version: UI_PREFERENCES_VERSION };
      for (const field of PERSISTED_FIELDS) preferences[field] = this[field];
      try {
        storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
      } catch {
        // La interfaz funciona aunque el navegador bloquee el almacenamiento.
      }
    },
    scheduleUiPreferencesPersistence() {
      if (this.uiPreferencesPersistTimer) clearTimeout(this.uiPreferencesPersistTimer);
      this.uiPreferencesPersistTimer = setTimeout(() => {
        this.uiPreferencesPersistTimer = null;
        this.persistUiPreferences();
      }, 150);
    },
    cancelUiPreferencesPersistence() {
      if (!this.uiPreferencesPersistTimer) return;
      clearTimeout(this.uiPreferencesPersistTimer);
      this.uiPreferencesPersistTimer = null;
    }
  }
};
