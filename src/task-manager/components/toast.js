export const Toast = {
  name: 'Toast',
  props: {
    message: { type: String, default: '' }
  },
  template: `
    <div class="toast-region" aria-live="polite" aria-atomic="true">
  <div v-show="message" :class="['tk-toast', 'tk-toast--success', { 'is-visible': message }]">
    <span class="tk-toast__icon">✓</span>
    <div><strong>Operación completada</strong><span>{{ message }}</span></div>
  </div>
</div>`
};
