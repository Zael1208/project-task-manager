export const TaskFilters = {
  name: 'TaskFilters',
  props: {
    unavailable: { type: Boolean, required: true },
    errorMessage: { type: String, required: true },
    refreshing: { type: Boolean, required: true },
    taskSearchQuery: { type: String, required: true },
    advancedFiltersOpen: { type: Boolean, required: true },
    hasAdvancedFilters: { type: Boolean, required: true },
    advancedStatuses: { type: Array, required: true },
    advancedPriorities: { type: Array, required: true },
    advancedTags: { type: Array, required: true },
    tagCatalog: { type: Array, required: true },
    activeTaskFilter: { type: String, required: true },
    currentPeriod: { type: String, required: true },
    quickTagFilter: { type: String, required: true },
    taskChipsVisible: { type: Boolean, required: true },
    visibleCount: { type: Number, required: true },
    listMenuOpen: { type: Boolean, required: true },
    tagColor: { type: Function, required: true }
  },
  emits: ['refresh', 'dismiss-error', 'update-search', 'toggle-filters', 'close-filters', 'clear-filters', 'update-statuses', 'update-priorities', 'update-tags', 'update-quick-filter', 'update-active-filter', 'update-current-period', 'toggle-chips', 'toggle-list-menu', 'set-expanded'],
  methods: {
    toggleValue(values, value, checked, eventName) {
      this.$emit(eventName, checked ? [...values, value] : values.filter((item) => item !== value));
    }
  },
  template: `
    <div class="task-explorer__toolbar">
  <div v-show="unavailable" class="workspace-notice workspace-notice--unavailable" role="status"><strong>TK no está
      disponible</strong><span>La capacidad de tareas no está habilitada en este anfitrión.</span><button
      class="tk-button tk-button--small tk-button--secondary" type="button"
      @click="$emit('refresh')">Reintentar</button></div>
  <div v-show="errorMessage" class="workspace-notice workspace-notice--error" role="alert"><strong>No se pudo completar
      la operación</strong><span>{{ errorMessage }}</span><button class="tk-icon-button tk-icon-button--compact"
      type="button" aria-label="Cerrar error" title="Cerrar error" @click="$emit('dismiss-error')">×</button></div>
  <div v-show="refreshing" class="workspace-notice workspace-notice--loading" role="status"><strong>Actualizando
      datos</strong><span>Se mantiene visible el último estado confirmado.</span></div>
  <div class="task-search-row">
    <label><span class="sr-only">Buscar tareas</span><input :value="taskSearchQuery" class="tk-input" type="search"
        placeholder="Buscar por título, ID o etiqueta" @input="$emit('update-search', $event.target.value)" /></label>
    <button class="tk-icon-button task-filter-button" type="button" aria-label="Filtros" title="Mostrar filtros avanzados" :aria-expanded="advancedFiltersOpen"
      @click.stop="$emit('toggle-filters')"><span class="tk-icon">☷</span><span v-if="hasAdvancedFilters" class="advanced-filter-indicator" aria-hidden="true"></span></button>
    <div class="menu-anchor"><button class="tk-icon-button" type="button" aria-label="Opciones del listado"
        title="Opciones del listado" aria-haspopup="menu" :aria-expanded="listMenuOpen" @click.stop="$emit('toggle-list-menu')"><span
          class="tk-icon">⋮</span></button>
      <div v-show="listMenuOpen" class="tk-dropdown tk-dropdown--anchored is-open" role="menu" @click.stop><button
          class="tk-dropdown__item" type="button" title="Expandir todas las tareas" @click="$emit('set-expanded', true)">Expandir todo</button><button
          class="tk-dropdown__item" type="button" title="Plegar todas las tareas" @click="$emit('set-expanded', false)">Plegar todo</button></div>
    </div>
  </div>
  <section v-show="advancedFiltersOpen" class="task-filter-popover" aria-label="Filtros avanzados" @click.stop>
    <div class="task-filter-popover__header"><strong>Filtros</strong>
      <div class="task-filter-popover__actions"><button v-show="hasAdvancedFilters" class="task-filter-clear"
          type="button" title="Limpiar filtros" @click="$emit('clear-filters')"><span class="tk-icon">↻</span><span>Limpiar
            filtros</span></button><button class="tk-icon-button tk-icon-button--compact" type="button"
          aria-label="Cerrar filtros" title="Cerrar filtros" @click="$emit('close-filters')">×</button></div>
    </div>
    <fieldset>
      <legend>Estado</legend><label
        v-for="item in [['open', 'Pendiente'], ['in_progress', 'En curso'], ['done', 'Hecha'], ['blocked', 'Bloqueada']]"
        :key="item[0]"><input type="checkbox" :value="item[0]" :checked="advancedStatuses.includes(item[0])"
          @change="toggleValue(advancedStatuses, item[0], $event.target.checked, 'update-statuses')" />
        {{ item[1] }}</label>
    </fieldset>
    <fieldset>
      <legend>Prioridad</legend><label v-for="item in [['0', 'Crítica'], ['1', 'Alta'], ['2', 'Media'], ['3', 'Baja']]"
        :key="item[0]"><input type="checkbox" :value="item[0]" :checked="advancedPriorities.includes(item[0])"
          @change="toggleValue(advancedPriorities, item[0], $event.target.checked, 'update-priorities')" />
        {{ item[1] }}</label>
    </fieldset>
    <fieldset>
      <legend>Etiquetas</legend><label v-for="tag in tagCatalog" :key="tag.name"
        :style="{ '--filter-option-color': tagColor(tag.name) }"><input type="checkbox" :value="tag.name"
          :checked="advancedTags.includes(tag.name)"
          @change="toggleValue(advancedTags, tag.name, $event.target.checked, 'update-tags')" /> {{ tag.name }}</label>
    </fieldset>
    <p class="task-filter-popover__summary">{{ visibleCount }} {{ visibleCount === 1 ? 'resultado' : 'resultados' }}</p>
  </section>
  <nav class="tk-tabs task-filter-tabs" aria-label="Filtros rápidos"><button
      v-for="item in [['all', 'Todas'], ['current', 'Actuales'], ['open', 'Pendientes'], ['in_progress', 'En curso'], ['blocked', 'Bloqueadas'], ['done', 'Hechas']]"
      :key="item[0]" class="tk-tab" type="button" :title="item[1]" :aria-selected="activeTaskFilter === item[0]"
      @click="$emit('update-active-filter', item[0])">{{ item[1] }}</button></nav>
  <nav v-show="activeTaskFilter === 'current'" class="tk-tabs current-period-tabs" aria-label="Periodo de tareas actuales"><button
      v-for="item in [['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año']]"
      :key="item[0]" class="tk-tab" type="button" :title="item[1]" :aria-pressed="currentPeriod === item[0]"
      @click="$emit('update-current-period', item[0])">{{ item[1] }}</button></nav>
  <div class="tag-manager-filter-controls"><select :value="quickTagFilter" class="tk-select tag-manager-filter"
      aria-label="Filtrar por etiqueta" @change="$emit('update-quick-filter', $event.target.value)">
      <option value="">Todas las etiquetas</option>
      <option v-for="tag in tagCatalog" :key="tag.name" :value="tag.name">{{ tag.name }}</option>
    </select><button class="tk-icon-button tk-icon-button--compact tag-manager-visibility" type="button"
      aria-label="Mostrar u ocultar etiquetas" title="Mostrar u ocultar etiquetas" :aria-pressed="taskChipsVisible"
      @click="$emit('toggle-chips')">◉</button></div>
</div>`
};
