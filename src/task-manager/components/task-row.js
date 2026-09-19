import { OverflowMenu } from './overflow-menu.js';

export const TaskRow = {
  name: 'TaskRow',
  components: { OverflowMenu },
  props: {
    task: { type: Object, required: true },
    selected: { type: Boolean, required: true },
    expanded: { type: Boolean, required: true },
    chipsVisible: { type: Boolean, required: true },
    menuOpen: { type: Boolean, required: true },
    busy: { type: Function, required: true },
    tagColor: { type: Function, required: true }
  },
  emits: ['select', 'toggle-expanded', 'update-field', 'toggle-menu', 'menu-action'],
  computed: {
    menuItems() {
      return [
        { id: 'edit', label: 'Editar' },
        { id: 'copy', label: 'Copiar ID' },
        { id: 'close', label: 'Cerrar tarea', danger: true, disabled: this.task.status === 'done' || this.busy(`close:${this.task.id}`) }
      ];
    }
  },
  template: `
    <article :class="['task-row', 'task-row--level-' + Math.min(task.level, 3), { 'is-selected': selected }]"
  role="treeitem" tabindex="0" :aria-level="task.level" :aria-selected="selected" @click="$emit('select', task.id)"
  @keydown.enter.self.prevent="$emit('select', task.id)" @keydown.space.self.prevent="$emit('select', task.id)">
  <button v-show="task.children" class="tree-expander" type="button" :aria-expanded="expanded"
    :aria-label="expanded ? 'Contraer subtareas' : 'Expandir subtareas'"
    @click.stop="$emit('toggle-expanded', task.id)"><span class="tk-icon"><svg viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6"></path>
      </svg></span></button>
  <button v-show="!task.children" class="tree-expander tree-expander--placeholder" type="button" disabled tabindex="-1"
    aria-hidden="true"><span class="tk-icon"><svg viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6"></path>
      </svg></span></button>
  <div :class="['task-type-icon', 'task-type-icon--' + task.kind]">{{ task.icon }}</div>
  <div class="task-row__copy">
    <div class="task-row__title">{{ task.title }}</div>
    <div class="task-row__meta"><span>{{ task.id }}</span><span>{{ task.type }}</span></div>
    <div v-show="chipsVisible" class="tag-manager-task-chips"><span v-for="tag in task.chips" :key="tag"
        class="tag-manager-chip"><span class="tag-manager-chip-dot"
          :style="{ '--tag-color': tagColor(tag) }"></span>{{ tag }}</span></div>
  </div>
  <select class="tk-select tk-select--compact tk-priority-select task-row__priority" aria-label="Prioridad"
    :value="task.priority" :disabled="busy('priority:' + task.id)" @click.stop
    @change="$emit('update-field', task.id, 'priority', $event.target.value)">
    <option value="0">Crítica</option>
    <option value="1">Alta</option>
    <option value="2">Media</option>
    <option value="3">Baja</option>
  </select>
  <div class="task-row__meta-column"><select class="tk-select tk-select--compact" :aria-label="'Estado de ' + task.id"
      :title="task.status === 'blocked' ? 'Retira las dependencias para cambiar el estado' : ''" :value="task.status"
      :disabled="task.status === 'blocked' || busy('status:' + task.id) || busy('close:' + task.id)" @click.stop
      @change="$emit('update-field', task.id, 'status', $event.target.value)">
      <option value="open">Pendiente</option>
      <option value="in_progress">En curso</option>
      <option value="done">Hecha</option>
      <option v-show="task.status === 'blocked'" value="blocked" disabled>Bloqueada</option>
    </select></div>
  <overflow-menu class="task-row__menu" :open="menuOpen" :items="menuItems" @toggle="$emit('toggle-menu', task.id)"
    @select="$emit('menu-action', $event, task.id)"></overflow-menu>
</article>`
};
