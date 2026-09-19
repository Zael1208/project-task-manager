import { OverflowMenu } from './overflow-menu.js';
import { TagPickerField } from './tag-picker-field.js';
import { TaskBadge } from '../../shared/tasks/task-badge.js';

export const TaskInspector = {
  name: 'TaskInspector',
  components: { OverflowMenu, TagPickerField, TaskBadge },
  props: {
    mobileOpen: { type: Boolean, required: true },
    hasSelection: { type: Boolean, required: true },
    task: { type: Object, required: true },
    activeTab: { type: String, required: true },
    menuOpen: { type: Boolean, required: true },
    busy: { type: Function, required: true },
    statusBadgeClass: { type: Function, required: true },
    statusLabel: { type: Function, required: true },
    priorityLabel: { type: Function, required: true },
    subtasks: { type: Array, required: true },
    blockers: { type: Array, required: true },
    dependents: { type: Array, required: true },
    comments: { type: Array, required: true },
    editDraft: { type: Object, required: true },
    tagCatalog: { type: Array, required: true },
    colors: { type: Array, required: true },
    dependencyDraft: { type: String, required: true },
    commentDraft: { type: String, required: true }
  },
  emits: ['update:mobileOpen', 'update:activeTab', 'update:editDraft', 'update:dependencyDraft', 'update:commentDraft', 'action'],
  computed: {
    menuItems() {
      return [
        { id: 'copy', label: 'Copiar ID' },
        { id: 'subtask', label: 'Crear subtarea' },
        { id: 'close', label: 'Cerrar tarea', separatorBefore: true, danger: true, disabled: this.task.status === 'done' || this.busy(`close:${this.task.id}`) }
      ];
    }
  },
  methods: {
    updateDraft(field, value) {
      this.$emit('update:editDraft', { ...this.editDraft, [field]: value });
    },
    emitAction(type, payload = {}) {
      this.$emit('action', { type, payload });
    },
    selectMenuAction(action) {
      if (action === 'copy') this.emitAction('task.copy');
      if (action === 'subtask') this.emitAction('subtask.open');
      if (action === 'close') this.emitAction('task.close');
    },
    selectTab(tab) {
      if (tab === 'edit') this.emitAction('edit.open');
      else this.$emit('update:activeTab', tab);
    },
    commentMeta(comment) {
      return [comment.author, comment.createdAt].filter(Boolean).join(' · ');
    }
  },
  template: `
    <section :class="['task-inspector', { 'is-mobile-open': mobileOpen }]">
  <div v-show="!hasSelection" class="empty-state inspector-empty">
    <div>
      <div class="empty-state__icon">T</div>
      <h3>Selecciona una tarea</h3>
      <p>El detalle confirmado por TK aparecerá aquí.</p>
    </div>
  </div>
  <div v-show="hasSelection" class="task-inspector-content">
    <header class="task-inspector__header">
      <div class="task-inspector__heading-row">
        <div class="task-inspector__heading"><button class="task-mobile-back tk-button tk-button--ghost" type="button"
            @click="$emit('update:mobileOpen', false)">Volver a tareas</button>
          <div class="task-inspector__kicker">{{ task.id }} · {{ task.type }}</div>
          <h1 class="task-inspector__title">{{ task.title }}</h1>
          <p class="task-inspector__description">{{ task.description || 'Sin descripción.' }}</p>
        </div>
        <div class="task-inspector__actions"><button class="tk-icon-button" type="button" title="Editar"
            aria-label="Editar tarea" @click="emitAction('edit.open')">✎</button>
          <overflow-menu :open="menuOpen" :items="menuItems" label="Más opciones de la tarea"
            menu-class="tk-dropdown--inspector" :compact="false" @toggle="emitAction('menu.toggle')"
            @select="selectMenuAction"></overflow-menu><task-badge kind="status" :value="task.status"></task-badge>
        </div>
      </div>
      <div class="task-property-bar"><label class="task-property-control"><span
            class="task-property-control__label">Prioridad</span><select class="tk-select" :value="task.priority"
            :disabled="busy('priority:' + task.id)"
            @change="emitAction('task.update-field', { id: task.id, field: 'priority', value: $event.target.value })">
            <option value="0">Crítica</option>
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Baja</option>
          </select></label><label class="task-property-control"><span
            class="task-property-control__label">Estado</span><select class="tk-select"
            :title="task.status === 'blocked' ? 'Retira las dependencias para cambiar el estado' : ''"
            :value="task.status"
            :disabled="task.status === 'blocked' || busy('status:' + task.id) || busy('close:' + task.id)"
            @change="emitAction('task.update-field', { id: task.id, field: 'status', value: $event.target.value })">
            <option value="open">Pendiente</option>
            <option value="in_progress">En curso</option>
            <option value="done">Hecha</option>
            <option v-show="task.status === 'blocked'" value="blocked" disabled>Bloqueada</option>
          </select></label>
        <div class="task-property-control"><span class="task-property-control__label">Responsable</span><span
            class="task-property-control__value">{{ task.assignee || 'Sin asignar' }}</span></div>
      </div>
    </header>
    <nav class="tk-tabs task-inspector__tabs" aria-label="Detalles de la tarea"><button
        v-for="item in [['detail', 'Detalle'], ['edit', 'Editar'], ['subtasks', 'Subtareas'], ['dependencies', 'Dependencias'], ['comments', 'Comentarios']]"
        :key="item[0]" class="tk-tab" type="button" :aria-selected="activeTab === item[0]"
        @click="selectTab(item[0])">{{ item[1] }}</button></nav>
    <div class="task-inspector__scroll">
      <div v-show="activeTab === 'detail'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Propiedades</h3>
          </header>
          <div class="tk-panel__content">
            <div class="property-grid">
              <div class="property-card">
                <div class="property-card__label">Tipo</div>
                <div class="property-card__value">{{ task.type }}</div>
              </div>
              <div class="property-card">
                <div class="property-card__label">Etiquetas</div>
                <div class="property-card__value">{{ task.chips.join(', ') || 'Sin etiquetas' }}</div>
              </div>
              <div class="property-card">
                <div class="property-card__label">Bloqueos</div>
                <div class="property-card__value">{{ blockers.length }}</div>
              </div>
              <div class="property-card">
                <div class="property-card__label">Subtareas</div>
                <div class="property-card__value">{{ subtasks.length }}</div>
              </div>
            </div>
          </div>
        </section>
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Notas</h3>
          </header>
          <div class="tk-panel__content pre-wrap">{{ task.notes || 'Sin notas.' }}</div>
        </section>
      </div>
      <div v-show="activeTab === 'edit'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Editar tarea</h3>
          </header>
          <form class="tk-panel__content form-grid" @submit.prevent="emitAction('edit.save')"><label
              class="tk-field span-2"><span class="tk-field__label">Título</span><input :value="editDraft.title"
                class="tk-input" required @input="updateDraft('title', $event.target.value)" /></label><label
              class="tk-field span-2"><span class="tk-field__label">Descripción</span><textarea
                :value="editDraft.description" class="tk-textarea"
                @input="updateDraft('description', $event.target.value)"></textarea></label><label
              class="tk-field span-2"><span class="tk-field__label">Notas</span><textarea :value="editDraft.notes"
                class="tk-textarea" @input="updateDraft('notes', $event.target.value)"></textarea></label><label
              class="tk-field"><span class="tk-field__label">Responsable</span><input :value="editDraft.assignee"
                class="tk-input" placeholder="Sin asignar"
                @input="updateDraft('assignee', $event.target.value)" /></label>
            <tag-picker-field :model-value="editDraft.tags" :tags="tagCatalog" :colors="colors"
              :busy="busy('edit:' + task.id)" :reset-key="task.id + ':' + activeTab"
              @update:model-value="updateDraft('tags', $event)"></tag-picker-field>
            <div class="span-2 task-form-actions"><button class="tk-button tk-button--ghost" type="button"
                :disabled="busy('edit:' + task.id)" @click="emitAction('edit.cancel')">Cancelar</button><button
                class="tk-button tk-button--primary" type="submit"
                :disabled="busy('edit:' + task.id)">{{ busy('edit:' + task.id) ? 'Guardando…' : 'Guardar cambios' }}</button>
            </div>
          </form>
        </section>
      </div>
      <div v-show="activeTab === 'subtasks'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Subtareas</h3><span></span><button class="tk-button tk-button--small tk-button--secondary" type="button"
              @click="emitAction('subtask.open')">Nueva subtarea</button>
          </header>
          <div class="tk-panel__content">
            <div class="subtask-list"><button v-for="subtask in subtasks" :key="subtask.id" class="subtask-list__item"
                type="button" @click="emitAction('task.select', { id: subtask.id })"><span
                  class="subtask-list__type">{{ subtask.icon }}</span><span class="subtask-list__copy"><span
                    class="subtask-list__title">{{ subtask.title }}</span><span
                    class="subtask-list__meta">{{ subtask.id }}</span></span><span
                  class="subtask-list__priority">{{ priorityLabel(subtask.priority) }}</span><span
                  class="subtask-list__status">{{ statusLabel(subtask.status) }}</span></button>
              <p v-show="!subtasks.length">Esta tarea no tiene subtareas.</p>
            </div>
          </div>
        </section>
      </div>
      <div v-show="activeTab === 'dependencies'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Dependencias</h3>
          </header>
          <div class="tk-panel__content">
            <form class="task-search-row" @submit.prevent="emitAction('dependency.add')"><input :value="dependencyDraft"
                class="tk-input" placeholder="ID de tarea bloqueante" required
                @input="$emit('update:dependencyDraft', $event.target.value)" /><button
                class="tk-button tk-button--secondary" type="submit"
                :disabled="busy('dep-add:' + task.id)">{{ busy('dep-add:' + task.id) ? 'Añadiendo…' : 'Añadir' }}</button>
            </form>
            <div class="task-panel-stack">
              <h4>Bloqueada por</h4>
              <article v-for="blocker in blockers" :key="blocker.id" class="relation-row">
                <div><strong>{{ blocker.id }}</strong><span>{{ blocker.title }}</span></div><button
                  class="tk-button tk-button--small tk-button--danger" type="button"
                  :disabled="busy('dep-remove:' + blocker.id)"
                  @click="emitAction('dependency.remove-blocker', { id: blocker.id })">Retirar</button>
              </article>
              <p v-show="!blockers.length">Sin tareas bloqueantes.</p>
              <h4>Bloquea a</h4>
              <article v-for="dependent in dependents" :key="dependent.id" class="relation-row">
                <div><strong>{{ dependent.id }}</strong><span>{{ dependent.title }}</span></div><button
                  class="tk-button tk-button--small tk-button--danger" type="button"
                  :disabled="busy('dep-remove:' + dependent.id)"
                  @click="emitAction('dependency.remove-dependent', { id: dependent.id })">Retirar</button>
              </article>
              <p v-show="!dependents.length">No bloquea otras tareas.</p>
            </div>
          </div>
        </section>
      </div>
      <div v-show="activeTab === 'comments'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Comentarios</h3>
          </header>
          <div class="tk-panel__content">
            <div class="comment-list">
              <article v-for="(comment, index) in comments" :key="index" class="comment-card">
                <p>{{ comment.body }}</p><span v-show="commentMeta(comment)">{{ commentMeta(comment) }}</span>
              </article>
              <p v-show="!comments.length">Sin comentarios.</p>
            </div>
            <form class="comment-form" @submit.prevent="emitAction('comment.add')"><textarea :value="commentDraft"
                class="tk-textarea" placeholder="Añadir comentario" required
                @input="$emit('update:commentDraft', $event.target.value)"></textarea><button
                class="tk-button tk-button--primary" type="submit"
                :disabled="busy('comment:' + task.id)">{{ busy('comment:' + task.id) ? 'Añadiendo…' : 'Añadir comentario' }}</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  </div>
</section>`
};
