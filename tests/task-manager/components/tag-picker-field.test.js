// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { TagPickerField } from '../../../src/task-manager/components/tag-picker-field.js';
import { mount, flush, resetDom } from '../helpers/mount.js';

// Contrato del selector de etiquetas (TM-R4) y la correccion de Escape por capas
// (TM-R11): el selector solo debe consumir el evento cuando esta abierto, para
// que Escape cierre la capa mas interna y no las dos a la vez.

afterEach(resetDom);

const CATALOG = [
  { name: 'alfa', color: 'blue' },
  { name: 'beta', color: 'red' },
  { name: 'gamma', color: 'green' }
];

function mountPicker(modelValue = []) {
  const Host = {
    components: { TagPickerField },
    data() {
      return {
        selected: [...modelValue],
        props: {
          tags: CATALOG,
          colors: [{ id: 'blue', hex: '#0000ff' }, { id: 'red', hex: '#ff0000' }, { id: 'green', hex: '#00ff00' }],
          busy: false,
          wide: false,
          resetKey: ''
        }
      };
    },
    template: `
      <tag-picker-field :model-value="selected" v-bind="props" @update:model-value="selected = $event" />`
  };
  return mount(Host);
}

function options(container) {
  return [...container.querySelectorAll('.tag-manager-picker-option')];
}

describe('TagPickerField', () => {
  it('anadir emite un array nuevo sin mutar el que recibio', async () => {
    const { container, instance } = mountPicker([]);
    await flush();
    const original = instance.selected;

    container.querySelector('.tag-manager-add').click();
    await flush();
    options(container)[0].click();
    await flush();

    expect(instance.selected).toEqual(['alfa']);
    expect(instance.selected).not.toBe(original);
    // El prop que llego al componente nunca se toca.
    expect(original).toEqual([]);
  });

  it('retirar emite un array nuevo sin la etiqueta', async () => {
    const { container, instance } = mountPicker(['alfa', 'beta']);
    await flush();
    const original = instance.selected;

    const remove = container.querySelector('.tag-manager-chip button[aria-label="Retirar alfa"]');
    expect(remove).not.toBeNull();
    remove.click();
    await flush();

    expect(instance.selected).toEqual(['beta']);
    expect(instance.selected).not.toBe(original);
    expect(original).toEqual(['alfa', 'beta']);
  });

  it('no ofrece las etiquetas ya elegidas y filtra por la busqueda', async () => {
    const { container } = mountPicker(['alfa']);
    await flush();

    container.querySelector('.tag-manager-add').click();
    await flush();
    expect(options(container).map((button) => button.textContent.trim())).toEqual(['beta', 'gamma']);

    const search = container.querySelector('.tag-manager-picker-search');
    search.value = 'gam';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(options(container).map((button) => button.textContent.trim())).toEqual(['gamma']);
  });
});

describe('TagPickerField: Escape por capas', () => {
  function trackBubbleListener() {
    const seen = [];
    const listener = () => seen.push('bubble');
    window.addEventListener('keydown', listener);
    return { seen, stop: () => window.removeEventListener('keydown', listener) };
  }

  it('con el selector abierto lo cierra y no deja que el evento siga subiendo', async () => {
    const { container } = mountPicker([]);
    await flush();
    container.querySelector('.tag-manager-add').click();
    await flush();
    expect(container.querySelector('.tag-manager-picker').style.display).not.toBe('none');

    const tracker = trackBubbleListener();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    tracker.stop();
    await flush();

    expect(container.querySelector('.tag-manager-picker').style.display).toBe('none');
    // Sin la correccion, el dialogo que contiene al selector se cerraba tambien.
    expect(tracker.seen).toEqual([]);
  });

  it('con el selector cerrado deja pasar el evento, para que el dialogo pueda cerrarse', async () => {
    const { container } = mountPicker([]);
    await flush();
    expect(container.querySelector('.tag-manager-picker').style.display).toBe('none');

    const tracker = trackBubbleListener();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    tracker.stop();

    expect(tracker.seen).toEqual(['bubble']);
  });

  it('no reacciona a otras teclas', async () => {
    const { container } = mountPicker([]);
    await flush();
    container.querySelector('.tag-manager-add').click();
    await flush();

    const tracker = trackBubbleListener();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    tracker.stop();
    await flush();

    expect(container.querySelector('.tag-manager-picker').style.display).not.toBe('none');
    expect(tracker.seen).toEqual(['bubble']);
  });
});
