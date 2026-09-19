export const TagPickerField = {
  name: 'TagPickerField',
  props: {
    modelValue: { type: Array, required: true },
    tags: { type: Array, required: true },
    colors: { type: Array, required: true },
    busy: { type: Boolean, default: false },
    wide: { type: Boolean, default: false },
    resetKey: { type: [String, Number, Boolean], default: '' }
  },
  emits: ['update:modelValue'],
  data() {
    return { open: false, search: '' };
  },
  computed: {
    availableTags() {
      const query = this.normalize(this.search);
      return this.tags.filter((tag) => !this.modelValue.includes(tag.name) && (!query || this.normalize(tag.name).includes(query)));
    }
  },
  watch: {
    resetKey() {
      this.open = false;
      this.search = '';
    }
  },
  methods: {
    normalize(value) {
      return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    },
    tagColor(name) {
      const colorId = this.tags.find((tag) => tag.name === name)?.color || 'blue';
      return this.colors.find((color) => color.id === colorId)?.hex || this.colors[0]?.hex;
    },
    add(name) {
      if (name && !this.modelValue.includes(name)) this.$emit('update:modelValue', [...this.modelValue, name]);
      this.search = '';
    },
    remove(name) {
      this.$emit('update:modelValue', this.modelValue.filter((tag) => tag !== name));
    },
    handleEscape(event) {
      if (event.key === 'Escape') this.open = false;
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleEscape);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleEscape);
  },
  template: `
    <label :class="['tk-field', { 'span-2': wide }]">
  <span class="tk-field__label">Etiquetas</span>
  <input class="tk-input tag-manager-source" data-tag-manager-bound="true" readonly>
  <div class="tag-manager-chip-input">
    <span v-for="tag in modelValue" :key="tag" class="tag-manager-chip"><span class="tag-manager-chip-dot"
        :style="{ '--tag-color': tagColor(tag) }"></span>{{ tag }}<button type="button" :aria-label="'Retirar ' + tag"
        :disabled="busy" @click="remove(tag)">×</button></span>
    <span v-show="!modelValue.length">Sin etiquetas</span>
    <button class="tk-icon-button tk-icon-button--compact tag-manager-add" type="button" aria-label="Añadir etiqueta"
      :disabled="busy" @click.stop="open = !open">+</button>
    <div v-show="open" class="tag-manager-picker" role="dialog" aria-label="Seleccionar etiqueta existente" @click.stop>
      <input v-model="search" class="tk-input tag-manager-picker-search" type="search" placeholder="Buscar etiquetas"
        aria-label="Buscar etiquetas existentes">
      <div class="tag-manager-picker-results">
        <button v-for="tag in availableTags" :key="tag.name" class="tag-manager-picker-option" type="button"
          :aria-label="'Añadir ' + tag.name" @click="add(tag.name)"><span class="tag-manager-chip-dot"
            :style="{ '--tag-color': tagColor(tag.name) }"></span>{{ tag.name }}</button>
        <div v-show="!availableTags.length" class="tag-manager-picker-empty">No hay etiquetas disponibles.</div>
      </div>
    </div>
  </div>
</label>`
};
