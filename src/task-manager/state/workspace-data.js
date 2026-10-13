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
    }
  }
};
