// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { TaskInspector } from '../../../src/task-manager/components/task-inspector.js';
import { mount, flush, resetDom } from '../helpers/mount.js';

// Contratos del inspector (TM-R4): el sobre `action` llegando a su destino y los
// cinco `v-model` emitiendo. Son justo los dos puntos que el registro de riesgos
// marcaba como prioritarios y que ninguna prueba alcanzaba.

afterEach(resetDom);

function mountInspector(overrides = {}) {
  const Host = {
    components: { TaskInspector },
    data() {
      return {
        componentProps: {
          mobileOpen: false,
          hasSelection: true,
          task: {
            id: 'tk-1',
            title: 'Tarea de prueba',
            type: 'Tarea',
            description: 'Una descripción',
            priority: '2',
            status: 'open',
            assignee: '',
            chips: [],
            notes: ''
          },
          activeTab: 'detail',
          menuOpen: false,
          busy: () => false,
          statusBadgeClass: () => 'tk-badge--neutral',
          statusLabel: (status) => status,
          priorityLabel: (priority) => priority,
          subtasks: [],
          blockers: [],
          dependents: [],
          comments: [],
          editDraft: { title: 'Tarea de prueba', description: '', notes: '', assignee: '', tags: [] },
          tagCatalog: [],
          colors: [{ id: 'blue', hex: '#0000ff' }],
          dependencyDraft: '',
          commentDraft: '',
          ...(overrides.componentProps || {})
        },
        emitted: []
      };
    },
    methods: {
      record(name, value) {
        this.emitted.push({ name, value });
      },
      lastOf(name) {
        return [...this.emitted].reverse().find((entry) => entry.name === name);
      }
    },
    template: `
      <task-inspector v-bind="componentProps"
        @action="record('action', $event)"
        @update:mobileOpen="record('mobileOpen', $event)"
        @update:activeTab="record('activeTab', $event)"
        @update:editDraft="record('editDraft', $event)"
        @update:dependencyDraft="record('dependencyDraft', $event)"
        @update:commentDraft="record('commentDraft', $event)" />`
  };
  return mount(Host);
}

describe('TaskInspector: sobre action', () => {
  it('el boton de editar emite edit.open con payload vacio', async () => {
    const { container, instance } = mountInspector();
    await flush();

    container.querySelector('button[aria-label="Editar tarea"]').click();
    await flush();

    expect(instance.lastOf('action').value).toEqual({ type: 'edit.open', payload: {} });
  });

  it('la pestana de edicion emite edit.open y las demas cambian de pestana', async () => {
    const { container, instance } = mountInspector();
    await flush();

    const tabs = [...container.querySelectorAll('.tk-tab')];
    expect(tabs.map((tab) => tab.textContent.trim())).toEqual([
      'Detalle',
      'Editar',
      'Subtareas',
      'Dependencias',
      'Comentarios'
    ]);

    tabs[2].click();
    await flush();
    expect(instance.lastOf('activeTab').value).toBe('subtasks');
    expect(instance.lastOf('action')).toBeUndefined();

    tabs[1].click();
    await flush();
    expect(instance.lastOf('action').value).toEqual({ type: 'edit.open', payload: {} });
  });

  it('cambiar la prioridad emite task.update-field con el identificador y el campo', async () => {
    const { container, instance } = mountInspector();
    await flush();

    const priority = container.querySelector('.task-property-bar select');
    priority.value = '0';
    priority.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(instance.lastOf('action').value).toEqual({
      type: 'task.update-field',
      payload: { id: 'tk-1', field: 'priority', value: '0' }
    });
  });

  it('enviar el formulario de edicion emite edit.save y cancelar emite edit.cancel', async () => {
    const { container, instance } = mountInspector({ componentProps: { activeTab: 'edit' } });
    await flush();

    const form = container.querySelector('form.form-grid');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    expect(instance.lastOf('action').value.type).toBe('edit.save');

    const cancelar = [...form.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Cancelar');
    cancelar.click();
    await flush();
    expect(instance.lastOf('action').value.type).toBe('edit.cancel');
  });

  it('el boton de volver emite update:mobileOpen', async () => {
    const { container, instance } = mountInspector({ componentProps: { mobileOpen: true } });
    await flush();

    container.querySelector('.task-mobile-back').click();
    await flush();

    expect(instance.lastOf('mobileOpen').value).toBe(false);
  });
});

describe('TaskInspector: los cinco v-model', () => {
  it('editar el titulo emite un borrador nuevo, sin mutar el original', async () => {
    const { container, instance } = mountInspector({ componentProps: { activeTab: 'edit' } });
    await flush();
    const original = instance.componentProps.editDraft;

    const input = container.querySelector('form.form-grid input.tk-input');
    input.value = 'Titulo cambiado';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(instance.lastOf('editDraft').value).toEqual({ ...original, title: 'Titulo cambiado' });
    expect(instance.lastOf('editDraft').value).not.toBe(original);
    expect(original.title).toBe('Tarea de prueba');
  });

  it('el campo de dependencia emite su modelo', async () => {
    const { container, instance } = mountInspector({ componentProps: { activeTab: 'dependencies' } });
    await flush();

    const input = container.querySelector('.task-search-row input');
    input.value = 'tk-9';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(instance.lastOf('dependencyDraft').value).toBe('tk-9');
  });

  it('el campo de comentario emite su modelo', async () => {
    const { container, instance } = mountInspector({ componentProps: { activeTab: 'comments' } });
    await flush();

    const textarea = container.querySelector('.comment-form textarea');
    textarea.value = 'Un comentario';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(instance.lastOf('commentDraft').value).toBe('Un comentario');
  });
});
