import {
  ApiError,
  addTaskComment,
  addTaskDependency,
  closeTask as requestTaskClose,
  createTask as requestTaskCreate,
  listTags,
  listTasks,
  removeTaskDependency,
  showTask,
  updateTask
} from '../api/tk-client.js';
import { mapTask } from '../../shared/tasks/task-model.js';

export const taskActions = {
  methods: {
    /**
     * Sustituye el workspace solo si esta sigue siendo la recarga mas reciente.
     *
     * @param {string} [preferredId] Seleccion que se intenta conservar.
     * @returns {Promise<boolean|null>} `true` si confirma, `false` si falla y
     * `null` si una recarga posterior vuelve obsoleta esta respuesta.
     */
    async reloadWorkspace(preferredId = this.selectedTaskId) {
      const requestSequence = ++this.reloadRequestSequence;
      const initial = this.loading;
      if (!initial) this.refreshing = true;
      this.errorMessage = '';
      try {
        const [rawTasks, tags] = await Promise.all([
          listTasks(),
          listTags()
        ]);
        if (!Array.isArray(rawTasks) || !Array.isArray(tags)) throw new ApiError('El servidor devolvió datos de tareas no válidos.');
        if (requestSequence !== this.reloadRequestSequence) return null;
        const tasks = rawTasks.map(mapTask);
        const selectedId = preferredId && tasks.some((task) => task.id === preferredId) ? preferredId : (tasks[0]?.id || '');
        this.tasks = tasks;
        this.tags = tags;
        this.selectedTaskId = selectedId;
        if (this.detail?.id !== selectedId) this.detail = null;
        this.unavailable = false;
        this.expandedIds = [...new Set(tasks.map((task) => task.parentId).filter(Boolean))];
        if (selectedId) await this.loadTaskDetail(selectedId, false);
        else this.syncEditDraft();
        return true;
      } catch (error) {
        if (requestSequence !== this.reloadRequestSequence) return null;
        this.handleError(error);
        return false;
      } finally {
        if (requestSequence === this.reloadRequestSequence) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    },
    async loadTaskDetail(id, openOnMobile = true) {
      if (!id || this.isBusy(`detail:${id}`)) return;
      const requestSequence = ++this.detailRequestSequence;
      this.selectedTaskId = id;
      if (this.detail?.id !== id) this.detail = null;
      this.setBusy(`detail:${id}`, true);
      this.errorMessage = '';
      try {
        const detail = await showTask(id);
        if (requestSequence !== this.detailRequestSequence || this.selectedTaskId !== id) return;
        this.detail = mapTask(detail);
        this.syncEditDraft();
        this.isMobileInspectorOpen = openOnMobile;
      } catch (error) {
        this.handleError(error);
      } finally {
        this.setBusy(`detail:${id}`, false);
      }
    },
    /**
     * Ejecuta una escritura sin optimismo y recarga el estado confirmado. Una
     * escritura puede estar confirmada aunque la recarga posterior falle; ese
     * caso se conserva como error explicito para evitar reintentos a ciegas.
     *
     * @param {string} key Clave compartida con los controles que consultan busy.
     * @param {() => Promise<*>} request Escritura HTTP diferida.
     * @param {string} message Confirmacion que se muestra tras recargar.
     * @param {string} [preferredId] Seleccion deseada despues de la escritura.
     * @param {{ useResultId?: boolean }} [options]
     * @returns {Promise<*|null>} Respuesta de escritura o `null` si no se ejecuto.
     */
    async mutate(key, request, message, preferredId = this.selectedTaskId, options = {}) {
      if (this.isBusy(key)) return null;
      this.setBusy(key, true);
      this.errorMessage = '';
      try {
        const result = await request();
        const nextId = options.useResultId && result?.id ? result.id : preferredId;
        const reloaded = await this.reloadWorkspace(nextId);
        if (reloaded === true && !this.errorMessage && !this.unavailable) this.showToast(message);
        if (reloaded === false) {
          const reason = this.errorMessage || 'No se pudo recuperar el estado actualizado.';
          this.errorMessage = `${message} La operación fue confirmada, pero no se pudieron actualizar los datos. ${reason}`;
        }
        return result;
      } catch (error) {
        this.handleError(error);
        return null;
      } finally {
        this.setBusy(key, false);
      }
    },
    async createTask() {
      const title = this.newTaskDraft.title.trim();
      if (!title) return;
      const result = await this.mutate('create', () => requestTaskCreate({
        title,
        priority: Number(this.newTaskDraft.priority),
        description: this.newTaskDraft.description.trim(),
        tags: [...this.newTaskDraft.tags],
        parent: this.newTaskDraft.parent || undefined
      }), 'Tarea creada.', '', { useResultId: true });
      if (result) {
        this.isNewTaskOpen = false;
        this.newTaskDraft = this.emptyTaskDraft();
        this.activeInspectorTab = 'detail';
      }
    },
    openSubtaskDialog(parentId = this.selectedTaskId) {
      this.newTaskDraft = this.emptyTaskDraft(parentId);
      this.isNewTaskOpen = true;
      this.isInspectorMenuOpen = false;
    },
    syncEditDraft() {
      const task = this.detail;
      if (!task) {
        this.editDraft = this.emptyEditDraft();
        return;
      }
      this.editDraft = {
        title: task.title || '',
        description: task.description || '',
        notes: task.notes || '',
        assignee: task.assignee || '',
        tags: Array.isArray(task.chips) ? [...task.chips] : []
      };
    },
    openEditTask() {
      if (!this.hasSelection) return;
      this.syncEditDraft();
      this.activeInspectorTab = 'edit';
      this.isInspectorMenuOpen = false;
    },
    cancelTaskEdit() {
      this.syncEditDraft();
      this.activeInspectorTab = 'detail';
    },
    async saveSelectedTask() {
      const title = this.editDraft.title.trim();
      if (!title || !this.hasSelection) return;
      const result = await this.mutate(`edit:${this.selectedTaskId}`, () => updateTask(this.selectedTaskId, {
        title,
        description: this.editDraft.description.trim(),
        notes: this.editDraft.notes.trim(),
        assignee: this.editDraft.assignee.trim(),
        tags: [...this.editDraft.tags]
      }), 'Cambios guardados.');
      if (result) this.activeInspectorTab = 'detail';
    },
    async updateTaskField(id, field, value) {
      if (!id) return;
      if (field === 'status' && value === 'done') {
        await this.closeTask(id);
        return;
      }
      await this.mutate(`${field}:${id}`, () => updateTask(id, {
        [field]: field === 'priority' ? Number(value) : value
      }), field === 'priority' ? 'Prioridad actualizada.' : 'Estado actualizado.', this.selectedTaskId);
    },
    async closeTask(id = this.selectedTaskId) {
      if (!id) return;
      await this.mutate(`close:${id}`, () => requestTaskClose(id), 'Tarea cerrada.', id);
      this.isInspectorMenuOpen = false;
    },
    async addDependency() {
      const parentId = this.dependencyDraft.trim();
      if (!parentId || !this.hasSelection) return;
      const result = await this.mutate(`dep-add:${this.selectedTaskId}`, () => addTaskDependency(this.selectedTaskId, parentId), 'Dependencia añadida.');
      if (result) this.dependencyDraft = '';
    },
    async removeDependency(parentId) {
      if (!parentId || !this.hasSelection) return;
      await this.mutate(`dep-remove:${parentId}`, () => removeTaskDependency(this.selectedTaskId, parentId), 'Dependencia retirada.');
    },
    async removeDependent(childId) {
      if (!childId || !this.hasSelection) return;
      await this.mutate(`dep-remove:${childId}`, () => removeTaskDependency(childId, this.selectedTaskId), 'Dependencia retirada.');
    },
    async addComment() {
      const body = this.commentDraft.trim();
      if (!body || !this.hasSelection) return;
      const result = await this.mutate(`comment:${this.selectedTaskId}`, () => addTaskComment(this.selectedTaskId, body), 'Comentario añadido.');
      if (result) this.commentDraft = '';
    },
    async copyTaskId(id = this.selectedTaskId) {
      this.isInspectorMenuOpen = false;
      try {
        await navigator.clipboard.writeText(id);
        this.showToast(`ID ${id} copiado.`);
      } catch {
        this.errorMessage = 'No se pudo copiar el identificador al portapapeles.';
      }
    },
    async runTaskMenuAction(action, id) {
      this.openTaskMenuId = '';
      if (action === 'copy') await this.copyTaskId(id);
      if (action === 'close') await this.closeTask(id);
      if (action === 'edit') {
        if (this.selectedTaskId !== id || this.detail?.id !== id) await this.loadTaskDetail(id);
        if (this.selectedTaskId === id && this.detail?.id === id) this.openEditTask();
      }
    }
  }
};
