import { priorityLabel, statusBadgeClass, statusLabel } from './task-model.js';

export const TaskBadge = {
  name: 'TaskBadge',
  props: {
    kind: { type: String, required: true },
    value: { type: [String, Number], required: true }
  },
  computed: {
    label() { return this.kind === 'status' ? statusLabel(this.value) : priorityLabel(this.value); },
    badgeClass() { return this.kind === 'status' ? statusBadgeClass(this.value) : `tk-priority--${this.value}`; }
  },
  template: `<span :class="['tk-badge', badgeClass]">{{ label }}</span>`
};
