import { mapTask } from '../../shared/tasks/task-model.js';

const CURRENT_PERIODS = ['today', 'week', 'month', 'year'];

function startOfPeriod(now, period) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'year') {
    start.setMonth(0, 1);
  }
  return start;
}

function endOfPeriod(start, period) {
  const end = new Date(start);
  if (period === 'today') end.setDate(end.getDate() + 1);
  if (period === 'week') end.setDate(end.getDate() + 7);
  if (period === 'month') end.setMonth(end.getMonth() + 1, 1);
  if (period === 'year') end.setFullYear(end.getFullYear() + 1, 0, 1);
  return end;
}

/**
 * Una tarea es actual si cualquiera de las fechas que TK realmente expone
 * cae dentro del periodo. No se consultan campos de vencimiento inventados.
 */
export function taskInCurrentPeriod(task, period, now = new Date()) {
  if (!CURRENT_PERIODS.includes(period)) return false;
  const start = startOfPeriod(now, period).getTime();
  const end = endOfPeriod(new Date(start), period).getTime();
  return ['created_at', 'updated_at'].some((field) => {
    const timestamp = Date.parse(task[field]);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
  });
}

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
        (this.activeTaskFilter === 'all' ||
          (this.activeTaskFilter === 'current' && taskInCurrentPeriod(task, this.currentPeriod, this.currentPeriodNow || new Date())) ||
          (this.activeTaskFilter !== 'current' && task.status === this.activeTaskFilter)) &&
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

      // Un ciclo de padres no produce ninguna raiz, asi que sus nodos no
      // entrarian en el recorrido y las tareas desapareceran del listado sin un
      // error. Se calcula primero que es alcanzable desde las raices reales y lo
      // que quede fuera se trata como raiz adicional.
      const reachable = new Set();
      const markReachable = (task) => {
        if (reachable.has(task.id)) return;
        reachable.add(task.id);
        for (const child of childrenByParent.get(task.id) || []) markReachable(child);
      };
      for (const root of roots) markReachable(root);
      for (const task of this.mappedTasks) {
        if (!reachable.has(task.id)) roots.push(task);
      }

      const rows = [];
      const visited = new Set();
      const visit = (task) => {
        // La proteccion de ciclos es lo que permite recorrer los nodos que no
        // cuelgan de ninguna raiz sin caer en una recursion infinita.
        if (visited.has(task.id)) return;
        visited.add(task.id);
        if (this.filteredTaskIds.has(task.id)) rows.push(task);
        const canTraverse = this.expandedIds.includes(task.id) ||
          (hasFilter && !this.collapsedIds.includes(task.id));
        if (canTraverse) {
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
        currentPeriod: this.currentPeriod,
        visibleCount: this.visibleTasks.length,
        listMenuOpen: this.isListMenuOpen,
        tagColor: this.tagColor
      };
    }
  },
  methods: {
    toggleExpanded(id) {
      if (this.expandedIds.includes(id)) {
        this.expandedIds = this.expandedIds.filter((item) => item !== id);
        if (!this.collapsedIds.includes(id)) this.collapsedIds = [...this.collapsedIds, id];
        return;
      }
      this.expandedIds = [...this.expandedIds, id];
      this.collapsedIds = this.collapsedIds.filter((item) => item !== id);
    },
    setAllExpanded(expanded) {
      const parentIds = this.mappedTasks.filter((task) => task.children).map((task) => task.id);
      this.expandedIds = expanded ? parentIds : [];
      this.collapsedIds = expanded ? [] : parentIds;
      this.isListMenuOpen = false;
    },
    clearAdvancedFilters() {
      this.advancedStatuses = [];
      this.advancedPriorities = [];
      this.advancedTags = [];
    }
  }
};
