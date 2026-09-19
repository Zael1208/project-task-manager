/**
 * @typedef {Object} InspectorAction
 * @property {string} type Tipo documentado en docs/contracts.md.
 * @property {Record<string, *>} [payload]
 */

export const inspectorState = {
  computed: {
    selectedBlockers() {
      return Array.isArray(this.detail?.blockers) ? this.detail.blockers : [];
    },
    selectedComments() {
      return Array.isArray(this.detail?.comments) ? this.detail.comments : [];
    },
    selectedDependents() {
      return Array.isArray(this.detail?.dependents) ? this.detail.dependents : [];
    },
    taskInspectorProps() {
      return {
        hasSelection: this.hasSelection,
        task: this.selectedTask,
        menuOpen: this.isInspectorMenuOpen,
        busy: this.isBusy,
        statusBadgeClass: this.statusBadgeClass,
        statusLabel: this.statusLabel,
        priorityLabel: this.priorityLabel,
        subtasks: this.selectedSubtasks,
        blockers: this.selectedBlockers,
        dependents: this.selectedDependents,
        comments: this.selectedComments,
        tagCatalog: this.tagCatalog,
        colors: this.colors
      };
    }
  },
  methods: {
    /**
     * Traduce el unico canal de eventos de dominio del inspector a metodos del
     * workspace. Los `v-model` del componente no pasan por este despachador.
     *
     * @param {InspectorAction} [action]
     * @returns {*}
     */
    handleInspectorAction(action = {}) {
      const payload = action.payload || {};
      switch (action.type) {
        case 'menu.toggle':
          this.isInspectorMenuOpen = !this.isInspectorMenuOpen;
          return;
        case 'edit.open':
          return this.openEditTask();
        case 'edit.cancel':
          return this.cancelTaskEdit();
        case 'edit.save':
          return this.saveSelectedTask();
        case 'task.copy':
          return this.copyTaskId();
        case 'task.close':
          return this.closeTask();
        case 'task.select':
          return this.loadTaskDetail(payload.id);
        case 'task.update-field':
          return this.updateTaskField(payload.id, payload.field, payload.value);
        case 'subtask.open':
          return this.openSubtaskDialog();
        case 'dependency.add':
          return this.addDependency();
        case 'dependency.remove-blocker':
          return this.removeDependency(payload.id);
        case 'dependency.remove-dependent':
          return this.removeDependent(payload.id);
        case 'comment.add':
          return this.addComment();
      }
    }
  }
};
