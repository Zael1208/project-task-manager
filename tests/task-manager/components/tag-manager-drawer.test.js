// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { TagManagerDrawer } from '../../../src/task-manager/components/tag-manager-drawer.js';
import { mount, flush, resetDom } from '../helpers/mount.js';

// Contratos del gestor de etiquetas (TM-R4): los eventos de intencion, el foco
// del cajon y el de su confirmacion de borrado, que es un dialogo anidado dentro
// de otro.

afterEach(resetDom);

const TAGS = [
  { name: 'alfa', description: 'Primera', color: 'blue', uses: 2 },
  { name: 'beta', description: '', color: 'red', uses: 0 }
];

function mountDrawer(overrides = {}) {
  const Host = {
    components: { TagManagerDrawer },
    data() {
      return {
        emitted: [],
        props: {
          open: true,
          tags: TAGS,
          visibleTags: TAGS,
          colors: [{ id: 'blue', hex: '#0000ff' }, { id: 'red', hex: '#ff0000' }],
          searchQuery: '',
          formMode: '',
          draft: { name: '', description: '', color: 'blue' },
          editingName: '',
          formError: '',
          deletingTag: null,
          affectedTasks: [],
          busy: () => false,
          colorHex: (color) => (color === 'red' ? '#ff0000' : '#0000ff'),
          ...(overrides.props || {})
        }
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
      <tag-manager-drawer v-bind="props"
        @close="record('close', $event)"
        @update-search="record('search', $event)"
        @open-create="record('open-create', $event)"
        @open-edit="record('open-edit', $event)"
        @request-delete="record('request-delete', $event)"
        @update-draft="record('update-draft', $event)"
        @close-form="record('close-form', $event)"
        @save="record('save', $event)"
        @cancel-delete="record('cancel-delete', $event)"
        @delete="record('delete', $event)" />`
  };
  return mount(Host);
}

describe('TagManagerDrawer: eventos de intencion', () => {
  it('pide editar y eliminar con la etiqueta concreta', async () => {
    const { container, instance } = mountDrawer();
    await flush();

    container.querySelector('button[aria-label="Editar alfa"]').click();
    await flush();
    expect(instance.lastOf('open-edit').value).toMatchObject({ name: 'alfa' });

    container.querySelector('button[aria-label="Eliminar beta"]').click();
    await flush();
    expect(instance.lastOf('request-delete').value).toMatchObject({ name: 'beta' });
  });

  it('emite la busqueda y el alta', async () => {
    const { container, instance } = mountDrawer();
    await flush();

    const search = container.querySelector('.tag-manager-toolbar input');
    search.value = 'al';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(instance.lastOf('search').value).toBe('al');

    [...container.querySelectorAll('.tag-manager-toolbar button')].find((button) => button.textContent.trim() === 'Nueva').click();
    await flush();
    expect(instance.lastOf('open-create')).toBeDefined();
  });

  it('emite el borrador de la etiqueta con una copia', async () => {
    const { container, instance } = mountDrawer({ props: { formMode: 'create' } });
    await flush();
    const original = instance.props.draft;

    const name = container.querySelector('.tag-manager-form input.tk-input');
    name.value = 'nueva';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(instance.lastOf('update-draft').value).toEqual({ ...original, name: 'nueva' });
    expect(original.name).toBe('');
  });

  it('emite el cierre desde el boton del cajon', async () => {
    const { container, instance } = mountDrawer();
    await flush();

    container.querySelector('button[aria-label="Cerrar gestor"]').click();
    await flush();

    expect(instance.lastOf('close')).toBeDefined();
  });
});

describe('TagManagerDrawer: foco', () => {
  it('al abrirse entra en el cajon', async () => {
    const origin = document.createElement('button');
    document.body.appendChild(origin);
    origin.focus();

    const { container, instance } = mountDrawer({ props: { open: false } });
    await flush();

    instance.props.open = true;
    await flush();

    expect(document.activeElement).toBe(container.querySelector('aside.tag-manager-drawer'));
  });

  it('la confirmacion de borrado es un dialogo anidado que recibe el foco y lo devuelve', async () => {
    const { container, instance } = mountDrawer();
    await flush();

    const deleteButton = container.querySelector('button[aria-label="Eliminar alfa"]');
    deleteButton.focus();
    expect(document.activeElement).toBe(deleteButton);

    instance.props.deletingTag = { name: 'alfa' };
    instance.props.affectedTasks = [{ id: 'tk-1', title: 'Una tarea' }];
    await flush();

    // Sin esto, el foco se quedaria en la lista, detras del dialogo de confirmacion.
    expect(document.activeElement).toBe(container.querySelector('.tag-manager-confirm-card'));

    instance.props.deletingTag = null;
    await flush();

    expect(document.activeElement).toBe(deleteButton);
  });

  it('la confirmacion tiene nombre accesible', async () => {
    const { container } = mountDrawer({
      props: { deletingTag: { name: 'alfa' }, affectedTasks: [{ id: 'tk-1', title: 'Una tarea' }] }
    });
    await flush();

    const card = container.querySelector('.tag-manager-confirm-card');
    const labelledBy = card.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();

    const label = card.ownerDocument.getElementById(labelledBy);
    expect(label).not.toBeNull();
    expect(label.textContent.trim()).toBe('Eliminar etiqueta');
  });

  it('muestra las tareas afectadas antes de borrar', async () => {
    const { container } = mountDrawer({
      props: { deletingTag: { name: 'alfa' }, affectedTasks: [{ id: 'tk-1', title: 'Una tarea' }] }
    });
    await flush();

    // Solo lo visible: el marcador de "ninguna tarea afectada" sigue en el DOM,
    // oculto con v-show.
    const visible = [...container.querySelectorAll('.tag-manager-affected li')]
      .filter((item) => item.offsetWidth)
      .map((item) => item.textContent.trim());
    expect(visible).toEqual(['tk-1 · Una tarea']);
  });

  it('sin tareas afectadas muestra el marcador en lugar de una lista vacia', async () => {
    const { container } = mountDrawer({ props: { deletingTag: { name: 'beta' }, affectedTasks: [] } });
    await flush();

    const visible = [...container.querySelectorAll('.tag-manager-affected li')]
      .filter((item) => item.offsetWidth)
      .map((item) => item.textContent.trim());
    expect(visible).toEqual(['Ninguna tarea afectada.']);
  });
});
