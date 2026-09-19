export const OverflowMenu = {
  name: 'OverflowMenu',
  props: {
    open: { type: Boolean, required: true },
    items: { type: Array, required: true },
    label: { type: String, default: 'Más opciones' },
    menuClass: { type: String, default: 'tk-dropdown--anchored' },
    compact: { type: Boolean, default: true }
  },
  emits: ['toggle', 'select'],
  template: `
    <div class="menu-anchor">
  <button :class="['tk-icon-button', { 'tk-icon-button--compact': compact }]" type="button" :aria-label="label"
    aria-haspopup="menu" :aria-expanded="open" @click.stop="$emit('toggle')">⋮</button>
  <div v-show="open" :class="['tk-dropdown', menuClass, 'is-open']" role="menu" @click.stop>
    <template v-for="item in items" :key="item.id">
      <div v-if="item.separatorBefore" class="tk-dropdown__separator"></div>
      <button :class="['tk-dropdown__item', { 'tk-dropdown__item--danger': item.danger }]" type="button"
        :disabled="item.disabled" @click="$emit('select', item.id)">{{ item.label }}</button>
    </template>
  </div>
</div>`
};
