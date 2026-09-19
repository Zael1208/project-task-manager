import { priorityLabel, statusBadgeClass, statusLabel } from '../../shared/tasks/task-model.js';

export const workspaceUi = {
  methods: {
    handleError(error) {
      if (error?.unavailable) {
        this.unavailable = true;
        this.errorMessage = '';
      } else {
        this.errorMessage = error?.message || 'No se pudo completar la operación.';
      }
    },
    setBusy(key, value) {
      // Al terminar se elimina la clave en vez de dejarla en false: los
      // identificadores cambian en cada operacion, asi que el diccionario
      // crecia durante una sesion larga sin necesidad.
      const next = { ...this.busy };
      if (value) next[key] = true;
      else delete next[key];
      this.busy = next;
    },
    isBusy(key) {
      return Boolean(this.busy[key]);
    },
    showToast(message) {
      this.toastMessage = message;
      window.setTimeout(() => {
        if (this.toastMessage === message) this.toastMessage = '';
      }, 3600);
    },
    normalizeSearchText(value) {
      return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    },
    sameTagName(left, right) {
      return String(left || '').normalize('NFC').trim().localeCompare(String(right || '').normalize('NFC').trim(), 'es', { sensitivity: 'accent' }) === 0;
    },
    statusLabel(status) {
      return statusLabel(status);
    },
    priorityLabel(priority) {
      return priorityLabel(priority);
    },
    statusBadgeClass(status) {
      return statusBadgeClass(status);
    },
    toggleTaskMenu(id) {
      this.openTaskMenuId = this.openTaskMenuId === id ? '' : id;
      this.isListMenuOpen = false;
      this.isInspectorMenuOpen = false;
    },
    handleWorkspaceClick() {
      this.isListMenuOpen = false;
      this.openTaskMenuId = '';
      this.isInspectorMenuOpen = false;
    },
    handleEscape(event) {
      if (event.key !== 'Escape') return;
      this.isListMenuOpen = false;
      this.openTaskMenuId = '';
      this.isInspectorMenuOpen = false;
      this.isAdvancedFiltersOpen = false;
      this.isNewTaskOpen = false;
      this.isTagManagerOpen = false;
      this.deletingTag = null;
    }
  }
};
