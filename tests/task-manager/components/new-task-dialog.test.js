// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { NewTaskDialog } from '../../../src/task-manager/components/new-task-dialog.js';
import { mount, flush, resetDom } from '../helpers/mount.js';

// Cableado real del dialogo de alta (TM-R4): que el watcher de `open` dispare la
// entrada de foco y que `ref="dialogRoot"` apunte al elemento correcto. Eso es
// justo lo que la prueba del mixin no podia alcanzar.

afterEach(resetDom);

function mountDialog(open = false) {
  const Host = {
    components: { NewTaskDialog },
    data() {
      return {
        open,
        draft: { title: '', description: '', priority: '2', parent: '', tags: [] },
        tasks: [],
        tags: [],
        colors: [{ id: 'blue', hex: '#0000ff' }],
        busy: false,
        submitted: 0
      };
    },
    template: `
      <new-task-dialog :open="open" :draft="draft" :tasks="tasks" :tags="tags" :colors="colors"
        :busy="busy" @close="open = false" @submit="submitted += 1" @update-draft="draft = $event" />`
  };
  return mount(Host);
}

describe('NewTaskDialog', () => {
  it('al abrirse mete el foco en el dialogo, no en su primer control', async () => {
    const origin = document.createElement('button');
    document.body.appendChild(origin);
    origin.focus();

    const { container, instance } = mountDialog(false);
    instance.open = true;
    await flush();

    const dialog = container.querySelector('.tk-modal');
    expect(dialog).not.toBeNull();
    // El foco entra en el contenedor, para que el lector de pantalla lo anuncie
    // por su nombre en vez de abrirse sobre la "x" de cerrar.
    expect(document.activeElement).toBe(dialog);
  });

  it('al cerrarse devuelve el foco al control que lo abrio', async () => {
    const origin = document.createElement('button');
    document.body.appendChild(origin);
    origin.focus();

    const { instance } = mountDialog(false);
    instance.open = true;
    await flush();

    instance.open = false;
    await flush();

    expect(document.activeElement).toBe(origin);
  });

  it('el tabulador no se escapa: del ultimo vuelve al primero', async () => {
    const { container, instance } = mountDialog(true);
    await flush();

    const dialog = container.querySelector('.tk-modal');
    const focusables = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    expect(focusables.length).toBeGreaterThan(1);

    last.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(first);
  });

  it('y del primero, hacia atras, vuelve al ultimo', async () => {
    const { container, instance } = mountDialog(true);
    await flush();

    const dialog = container.querySelector('.tk-modal');
    const focusables = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(last);
  });

  it('emite el borrador actualizado con una copia, sin mutar el original', async () => {
    const { container, instance } = mountDialog(true);
    await flush();
    const original = instance.draft;

    const title = container.querySelector('.tk-modal input.tk-input');
    title.value = 'Tarea nueva';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(instance.draft).not.toBe(original);
    expect(instance.draft.title).toBe('Tarea nueva');
    expect(original.title).toBe('');
  });

  it('emite el cierre desde el boton y desde el fondo', async () => {
    const { container, instance } = mountDialog(true);
    await flush();

    container.querySelector('.tk-modal__header button').click();
    await flush();
    expect(instance.open).toBe(false);

    instance.open = true;
    await flush();
    container.querySelector('.modal-layer').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(instance.open).toBe(false);
  });

  it('emite submit al enviar el formulario', async () => {
    const { container, instance } = mountDialog(true);
    await flush();

    container.querySelector('.tk-modal').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();

    expect(instance.submitted).toBe(1);
  });
});
