import { TagPickerField } from './tag-picker-field.js';

export const NewTaskDialog = {
  name: 'NewTaskDialog',
  components: { TagPickerField },
  props: {
    open: { type: Boolean, required: true },
    draft: { type: Object, required: true },
    tasks: { type: Array, required: true },
    tags: { type: Array, required: true },
    colors: { type: Array, required: true },
    busy: { type: Boolean, required: true }
  },
  emits: ['close', 'update-draft', 'submit'],
  methods: {
    update(field, value) {
      this.$emit('update-draft', { ...this.draft, [field]: value });
    }
  },
  template: `
    <div v-show="open" class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="new-task-title"
  @click.self="$emit('close')">
  <form class="tk-modal tk-modal--wide" @submit.prevent="$emit('submit')">
    <header class="tk-modal__header">
      <h2 id="new-task-title">{{ draft.parent ? 'Nueva subtarea' : 'Nueva tarea' }}</h2><button class="tk-icon-button"
        type="button" aria-label="Cerrar" @click="$emit('close')">×</button>
    </header>
    <div class="tk-modal__body">
      <div class="form-grid"><label class="tk-field span-2"><span class="tk-field__label">Título</span><input
            :value="draft.title" class="tk-input" required
            @input="update('title', $event.target.value)" /></label><label class="tk-field"><span
            class="tk-field__label">Prioridad</span><select :value="draft.priority" class="tk-select"
            @change="update('priority', $event.target.value)">
            <option value="0">Crítica</option>
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Baja</option>
          </select></label><label class="tk-field"><span class="tk-field__label">Tarea padre</span><select
            :value="draft.parent" class="tk-select" @change="update('parent', $event.target.value)">
            <option value="">Sin padre</option>
            <option v-for="task in tasks" :key="task.id" :value="task.id">{{ task.id }} · {{ task.title }}</option>
          </select></label><label class="tk-field span-2"><span class="tk-field__label">Descripción</span><textarea
            :value="draft.description" class="tk-textarea"
            @input="update('description', $event.target.value)"></textarea></label>
        <tag-picker-field :model-value="draft.tags" :tags="tags" :colors="colors" :busy="busy" :reset-key="open" wide
          @update:model-value="update('tags', $event)"></tag-picker-field>
      </div>
    </div>
    <footer class="tk-modal__footer"><button class="tk-button tk-button--ghost" type="button" :disabled="busy"
        @click="$emit('close')">Cancelar</button><button class="tk-button tk-button--primary" type="submit"
        :disabled="busy">{{ busy ? 'Creando…' : 'Crear tarea' }}</button></footer>
  </form>
</div>`
};
