import { mapTask } from '../../shared/tasks/task-model.js';

export const taskTree = {
  computed: {
    mappedTasks() {
      const source = this.tasks.map((task) => ({ ...task }));
      const byId = new Map(source.map((task) => [task.id, task]));
      const childrenByParent = new Map();
      for (const task of source) {
        if (!task.parentId || !byId.has(task.parentId)) continue;
        const children = childrenByParent.get(task.parentId) || [];
        children.push(task);
        childrenByParent.set(task.parentId, children);
      }
      const levelFor = (task, seen = new Set()) => {
        if (!task.parentId || !byId.has(task.parentId) || seen.has(task.id)) return 1;
        seen.add(task.id);
        return levelFor(byId.get(task.parentId), seen) + 1;
      };
      return source.map((task) => ({
        ...task,
        level: levelFor(task),
        children: childrenByParent.has(task.id)
      }));
    },
    filteredTaskIds() {
      const query = this.normalizeSearchText(this.taskSearchQuery);
      return new Set(this.mappedTasks.filter((task) =>
        (this.activeTaskFilter === 'all' || task.status === this.activeTaskFilter) &&
        (!this.advancedStatuses.length || this.advancedStatuses.includes(task.status)) &&
        (!this.advancedPriorities.length || this.advancedPriorities.includes(task.priority)) &&
        (!this.advancedTags.length || task.chips.some((tag) => this.advancedTags.includes(tag))) &&
        (!this.quickTagFilter || task.chips.includes(this.quickTagFilter)) &&
        (!query || this.normalizeSearchText(`${task.id} ${task.title} ${task.chips.join(' ')}`).includes(query))
      ).map((task) => task.id));
    },
    visibleTasks() {
      const byId = new Map(this.mappedTasks.map((task) => [task.id, task]));
      const childrenByParent = new Map();
      const roots = [];
      for (const task of this.mappedTasks) {
        if (task.parentId && byId.has(task.parentId)) {
          const children = childrenByParent.get(task.parentId) || [];
          children.push(task);
          childrenByParent.set(task.parentId, children);
        } else {
          roots.push(task);
        }
      }
      const hasFilter = this.activeTaskFilter !== 'all' || this.advancedStatuses.length || this.advancedPriorities.length || this.advancedTags.length || this.quickTagFilter || this.taskSearchQuery.trim();
      const rows = [];
      const visit = (task) => {
        if (this.filteredTaskIds.has(task.id)) rows.push(task);
        if (hasFilter || this.expandedIds.includes(task.id)) {
          for (const child of childrenByParent.get(task.id) || []) visit(child);
        }
      };
      for (const root of roots) visit(root);
      return rows;
    },
    selectedTask() {
      const listed = this.mappedTasks.find((task) => task.id === this.selectedTaskId);
      const task = this.detail || listed || {};
      return { ...mapTask(task), status: listed?.status || task.status || 'open' };
    },
    hasSelection() {
      return Boolean(this.selectedTaskId && this.selectedTask.id);
    },
    activeTaskCount() {
      return this.tasks.filter((task) => task.status !== 'done').length;
    },
    selectedSubtasks() {
      return this.mappedTasks.filter((task) => task.parentId === this.selectedTaskId);
    },
    hasAdvancedFilters() {
      return Boolean(this.advancedStatuses.length || this.advancedPriorities.length || this.advancedTags.length);
    },
    taskFilterProps() {
      return {
        unavailable: this.unavailable,
        errorMessage: this.errorMessage,
        refreshing: this.refreshing,
        taskSearchQuery: this.taskSearchQuery,
        advancedFiltersOpen: this.isAdvancedFiltersOpen,
        hasAdvancedFilters: this.hasAdvancedFilters,
        advancedStatuses: this.advancedStatuses,
        advancedPriorities: this.advancedPriorities,
        advancedTags: this.advancedTags,
        tagCatalog: this.tagCatalog,
        activeTaskFilter: this.activeTaskFilter,
        quickTagFilter: this.quickTagFilter,
        taskChipsVisible: this.areTaskChipsVisible,
        visibleCount: this.visibleTasks.length,
        listMenuOpen: this.isListMenuOpen,
        tagColor: this.tagColor
      };
    }
  },
  methods: {
    toggleExpanded(id) {
      this.expandedIds = this.expandedIds.includes(id) ? this.expandedIds.filter((item) => item !== id) : [...this.expandedIds, id];
    },
    setAllExpanded(expanded) {
      this.expandedIds = expanded ? this.mappedTasks.filter((task) => task.children).map((task) => task.id) : [];
      this.isListMenuOpen = false;
    },
    clearAdvancedFilters() {
      this.advancedStatuses = [];
      this.advancedPriorities = [];
      this.advancedTags = [];
    }
  }
};
