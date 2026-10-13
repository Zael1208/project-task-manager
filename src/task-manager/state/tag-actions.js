import {
  createTag as requestTagCreate,
  deleteTag as requestTagDelete,
  updateTag as requestTagUpdate
} from '../api/tk-client.js';
import { confirmAction } from '../notifications/toast-anchor.js';

export const tagActions = {
  computed: {
    tagCatalog() {
      return [...this.tags].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    },
    visibleTags() {
      const query = this.normalizeSearchText(this.tagSearchQuery);
      return this.tagCatalog.filter((tag) => !query || this.normalizeSearchText(`${tag.name} ${tag.description}`).includes(query));
    },
  },
  methods: {
    tagColor(name) {
      const colorId = this.tags.find((tag) => tag.name === name)?.color || 'blue';
      return this.colors.find((color) => color.id === colorId)?.hex || this.colors[0].hex;
    },
    colorHex(color) {
      return this.colors.find((item) => item.id === color)?.hex || this.colors[0].hex;
    },
    openCreateTag() {
      this.tagFormMode = 'create';
      this.editingTagName = '';
      this.tagDraft = this.emptyTagDraft();
      this.tagFormError = '';
    },
    openEditTag(tag) {
      this.tagFormMode = 'edit';
      this.editingTagName = tag.name;
      this.tagDraft = { name: tag.name, description: tag.description || '', color: tag.color || 'blue' };
      this.tagFormError = '';
    },
    closeTagForm() {
      this.tagFormMode = '';
      this.editingTagName = '';
      this.tagFormError = '';
    },
    async saveTag() {
      const name = this.tagDraft.name.trim().replace(/\s+/g, ' ');
      if (!name) {
        this.tagFormError = 'El nombre es obligatorio.';
        return;
      }
      const original = this.editingTagName;
      const key = `tag-save:${original || name}`;
      const tag = {
        name,
        description: this.tagDraft.description.trim(),
        color: this.tagDraft.color
      };
      const result = await this.mutate(key, () => original ? requestTagUpdate(original, tag) : requestTagCreate(tag), original ? 'Etiqueta actualizada.' : 'Etiqueta creada.');
      if (result) {
        if (original && original !== name) {
          this.advancedTags = this.advancedTags.map((tag) => tag === original ? name : tag);
          if (this.quickTagFilter === original) this.quickTagFilter = name;
        }
        this.closeTagForm();
      }
    },
    async requestDeleteTag(tag) {
      if (!tag) return;
      const affectedCount = this.mappedTasks.filter((task) => task.chips.some((name) => this.sameTagName(name, tag.name))).length;
      const confirmed = await confirmAction(
        'Eliminar etiqueta',
        `Vas a eliminar “${tag.name}” de ${affectedCount} ${affectedCount === 1 ? 'tarea' : 'tareas'}.`
      );
      if (confirmed) await this.deleteTag(tag);
    },
    async deleteTag(tag) {
      if (!tag) return;
      const result = await this.mutate(`tag-delete:${tag.name}`, () => requestTagDelete(tag.name), 'Etiqueta eliminada.');
      if (result) {
        this.advancedTags = this.advancedTags.filter((name) => name !== tag.name);
        if (this.quickTagFilter === tag.name) this.quickTagFilter = '';
      }
    }
  }
};
