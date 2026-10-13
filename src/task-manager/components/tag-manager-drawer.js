import { dialogFocus } from './dialog-focus.js';

export const TagManagerDrawer = {
  name: 'TagManagerDrawer',
  mixins: [dialogFocus],
  props: {
    open: { type: Boolean, required: true },
    tags: { type: Array, required: true },
    visibleTags: { type: Array, required: true },
    colors: { type: Array, required: true },
    searchQuery: { type: String, required: true },
    formMode: { type: String, required: true },
    draft: { type: Object, required: true },
    editingName: { type: String, required: true },
    formError: { type: String, required: true },
    busy: { type: Function, required: true },
    colorHex: { type: Function, required: true }
  },
  emits: ['close', 'update-search', 'open-create', 'open-edit', 'request-delete', 'update-draft', 'close-form', 'save'],
  methods: {
    update(field, value) {
      this.$emit('update-draft', { ...this.draft, [field]: value });
    }
  },
  template: `
    <section v-show="open" class="tag-manager-layer is-open" @click.self="$emit('close')">
  <aside class="tag-manager-drawer" ref="dialogRoot" tabindex="-1" @keydown.tab="trapDialogTab" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title">
    <header class="tag-manager-header">
      <div>
        <h2 id="tag-manager-title">Gestor de etiquetas</h2>
        <p>Catálogo compartido de Tacks</p>
      </div><button class="tk-icon-button" type="button" aria-label="Cerrar gestor" title="Cerrar gestor" @click="$emit('close')">×</button>
    </header>
    <div class="tag-manager-body">
      <div class="tag-manager-toolbar"><input :value="searchQuery" class="tk-input" type="search"
          placeholder="Buscar etiquetas" @input="$emit('update-search', $event.target.value)" /><button
          class="tk-button tk-button--secondary" type="button" @click="$emit('open-create')">Nueva</button></div>
      <div class="tag-manager-summary"><span>{{ tags.length }}
          {{ tags.length === 1 ? 'etiqueta' : 'etiquetas' }}</span><span>A–Z</span></div>
      <div class="tag-manager-list">
        <article v-for="tag in visibleTags" :key="tag.name" class="tag-manager-row"><span class="tag-manager-dot"
            :style="{ '--tag-color': colorHex(tag.color) }"></span>
          <div class="tag-manager-copy">
            <div class="tag-manager-name">{{ tag.name }}</div>
            <div v-show="tag.description" class="tag-manager-description">{{ tag.description }}</div>
          </div><span class="tag-manager-uses">{{ tag.uses || 0 }} usos</span>
          <div class="tag-manager-actions"><button class="tk-icon-button tk-icon-button--compact" type="button"
              :aria-label="'Editar ' + tag.name" :title="'Editar ' + tag.name" @click="$emit('open-edit', tag)">✎</button><button
              class="tk-icon-button tk-icon-button--compact" type="button" :aria-label="'Eliminar ' + tag.name"
              :title="'Eliminar ' + tag.name"
              @click="$emit('request-delete', tag)">×</button></div>
        </article>
        <div v-show="!visibleTags.length" class="tag-manager-empty">No hay etiquetas que coincidan.</div>
      </div>
      <form v-show="formMode" class="tag-manager-form" @submit.prevent="$emit('save')">
        <div class="tag-manager-form-header">
          <strong>{{ formMode === 'edit' ? 'Editar etiqueta' : 'Nueva etiqueta' }}</strong><button
            class="tk-icon-button" type="button" aria-label="Cerrar formulario" title="Cerrar formulario" @click="$emit('close-form')">×</button>
        </div><label class="tag-manager-field"><span class="tag-manager-label">Nombre</span><input :value="draft.name"
            class="tk-input" maxlength="40" required @input="update('name', $event.target.value)" /></label><label
          class="tag-manager-field"><span class="tag-manager-label">Descripción</span><input :value="draft.description"
            class="tk-input" maxlength="90" @input="update('description', $event.target.value)" /></label>
        <fieldset class="tag-manager-field">
          <legend class="tag-manager-label">Color</legend>
          <div class="tag-manager-colors" role="radiogroup"><button v-for="color in colors" :key="color.id"
              class="tag-manager-color" type="button" role="radio" :aria-label="'Color ' + color.id"
              :title="'Seleccionar color ' + color.id"
              :aria-checked="draft.color === color.id" :style="{ '--tag-color': color.hex }"
              @click="update('color', color.id)"></button></div>
        </fieldset>
        <p v-show="formError" class="tag-manager-error">{{ formError }}</p>
        <div class="tag-manager-form-actions"><button class="tk-button tk-button--ghost" type="button"
            @click="$emit('close-form')">Cancelar</button><button class="tk-button tk-button--primary" type="submit"
            :disabled="busy('tag-save:' + (editingName || draft.name))">Guardar</button></div>
      </form>
    </div>
    <footer class="tag-manager-footer">Los usos proceden de las tareas reales.</footer>
  </aside>
</section>`
};
