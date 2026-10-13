import { TaskFilters } from './task-filters.js';
import { TaskRow } from './task-row.js';

export const TaskList = {
  name: 'TaskList',
  components: { TaskFilters, TaskRow },
  props: {
    loading: { type: Boolean, required: true },
    hasTasks: { type: Boolean, required: true },
    tasks: { type: Array, required: true },
    activeCount: { type: Number, required: true },
    selectedId: { type: String, required: true },
    expandedIds: { type: Array, required: true },
    chipsVisible: { type: Boolean, required: true },
    openMenuId: { type: String, required: true },
    busy: { type: Function, required: true },
    tagColor: { type: Function, required: true },
    filterProps: { type: Object, required: true }
  },
  emits: ['refresh', 'dismiss-error', 'update-search', 'toggle-filters', 'close-filters', 'clear-filters', 'update-statuses', 'update-priorities', 'update-tags', 'update-quick-filter', 'update-active-filter', 'update-current-period', 'toggle-chips', 'toggle-list-menu', 'set-expanded', 'select', 'toggle-expanded', 'update-field', 'toggle-menu', 'menu-action'],
  template: `
    <aside class="task-explorer" aria-label="Explorador de tareas">
  <task-filters v-bind="filterProps" @refresh="$emit('refresh')" @dismiss-error="$emit('dismiss-error')"
    @update-search="$emit('update-search', $event)" @toggle-filters="$emit('toggle-filters')"
    @close-filters="$emit('close-filters')" @clear-filters="$emit('clear-filters')"
    @update-statuses="$emit('update-statuses', $event)" @update-priorities="$emit('update-priorities', $event)"
    @update-tags="$emit('update-tags', $event)" @update-quick-filter="$emit('update-quick-filter', $event)"
    @update-active-filter="$emit('update-active-filter', $event)" @update-current-period="$emit('update-current-period', $event)"
    @toggle-chips="$emit('toggle-chips')"
    @toggle-list-menu="$emit('toggle-list-menu')" @set-expanded="$emit('set-expanded', $event)"></task-filters>
  <div class="task-tree-scroll">
    <div v-show="loading" class="skeleton-stack" aria-label="Cargando tareas">
      <div class="skeleton"></div>
      <div class="skeleton skeleton--short"></div>
      <div class="skeleton"></div>
    </div>
    <div v-show="!loading" class="task-tree" role="tree">
      <task-row v-for="task in tasks" :key="task.id" :task="task" :selected="selectedId === task.id"
        :expanded="expandedIds.includes(task.id)" :chips-visible="chipsVisible" :menu-open="openMenuId === task.id"
        :busy="busy" :tag-color="tagColor" @select="$emit('select', $event)"
        @toggle-expanded="$emit('toggle-expanded', $event)"
        @update-field="(id, field, value) => $emit('update-field', id, field, value)"
        @toggle-menu="$emit('toggle-menu', $event)" @menu-action="(action, id) => $emit('menu-action', action, id)">
      </task-row>
      <div v-show="!tasks.length && !loading" class="empty-state">
        <div>
          <div class="empty-state__icon">⌕</div>
          <h3>{{ hasTasks ? 'Sin resultados' : 'No hay tareas' }}</h3>
          <p>{{ hasTasks ? 'No hay tareas que coincidan con los filtros activos.' : 'Crea una tarea para comenzar.' }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <footer class="task-explorer__footer"><span>{{ tasks.length }} elementos visibles</span><span>{{ activeCount }}
      activas</span></footer>
</aside>`
};
