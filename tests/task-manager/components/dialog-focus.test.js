import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dialogFocus } from '../../../src/task-manager/components/dialog-focus.js';

// Comportamiento de foco de los dialogos modales (TM-R11).
//
// Se prueban los metodos del mixin con un contexto minimo, sin montar Vue: lo
// que se valida aqui es el algoritmo (entrar, devolver el foco y envolver el
// tabulador), que es la parte facil de equivocar. El cableado de Vue -que el
// watcher de `open` dispare esto y que `ref="dialogRoot"` apunte al elemento
// correcto- se comprueba en el navegador.

function fakeElement({ visible = true, connected = true } = {}) {
  return {
    offsetWidth: visible ? 10 : 0,
    offsetHeight: visible ? 10 : 0,
    getClientRects: () => (visible ? [{}] : []),
    isConnected: connected,
    focus: vi.fn()
  };
}

/** Contexto minimo equivalente a la instancia Vue que usaria el mixin. */
function createHost(focusables = []) {
  const root = fakeElement();
  root.querySelectorAll = () => focusables;
  return {
    $refs: { dialogRoot: root },
    $el: root,
    $nextTick: (callback) => callback(),
    focusReturnTarget: null,
    ...dialogFocus.methods
  };
}

function keyEvent(shiftKey = false) {
  return { shiftKey, preventDefault: vi.fn() };
}

describe('dialogFocus', () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    globalThis.document = { activeElement: null, body: fakeElement() };
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it('al entrar guarda el foco de origen y enfoca la raiz del dialogo', () => {
    const origin = fakeElement();
    globalThis.document.activeElement = origin;
    const host = createHost([fakeElement()]);

    host.enterDialog();

    expect(host.focusReturnTarget).toBe(origin);
    expect(host.$refs.dialogRoot.focus).toHaveBeenCalledTimes(1);
  });

  it('no toma como origen el body, para no devolver el foco a la nada', () => {
    globalThis.document.activeElement = globalThis.document.body;
    const host = createHost([]);

    host.enterDialog();

    expect(host.focusReturnTarget).toBeNull();
  });

  it('al salir devuelve el foco al control que lo abrio', () => {
    const origin = fakeElement();
    globalThis.document.activeElement = origin;
    const host = createHost([]);
    host.enterDialog();

    host.exitDialog();

    expect(origin.focus).toHaveBeenCalledTimes(1);
    expect(host.focusReturnTarget).toBeNull();
  });

  it('no intenta enfocar un origen que ya no esta en la pagina', () => {
    const origin = fakeElement({ connected: false });
    globalThis.document.activeElement = origin;
    const host = createHost([]);
    host.enterDialog();

    expect(() => host.exitDialog()).not.toThrow();
    expect(origin.focus).not.toHaveBeenCalled();
  });

  it('ignora los elementos no visibles al calcular el recorrido del foco', () => {
    const visible = fakeElement();
    const hidden = fakeElement({ visible: false });
    const host = createHost([visible, hidden]);

    expect(host.focusableElements()).toEqual([visible]);
  });

  it('con Tab en el ultimo elemento vuelve al primero', () => {
    const first = fakeElement();
    const last = fakeElement();
    const host = createHost([first, last]);
    globalThis.document.activeElement = last;
    const event = keyEvent(false);

    host.trapDialogTab(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(first.focus).toHaveBeenCalledTimes(1);
  });

  it('con Shift+Tab en el primero salta al ultimo', () => {
    const first = fakeElement();
    const last = fakeElement();
    const host = createHost([first, last]);
    globalThis.document.activeElement = first;
    const event = keyEvent(true);

    host.trapDialogTab(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(last.focus).toHaveBeenCalledTimes(1);
  });

  it('con Shift+Tab sobre la raiz salta al ultimo, sin salir del dialogo', () => {
    const first = fakeElement();
    const last = fakeElement();
    const host = createHost([first, last]);
    globalThis.document.activeElement = host.$refs.dialogRoot;
    const event = keyEvent(true);

    host.trapDialogTab(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(last.focus).toHaveBeenCalledTimes(1);
  });

  it('en un elemento intermedio deja actuar al navegador', () => {
    const first = fakeElement();
    const middle = fakeElement();
    const last = fakeElement();
    const host = createHost([first, middle, last]);
    globalThis.document.activeElement = middle;
    const event = keyEvent(false);

    host.trapDialogTab(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(first.focus).not.toHaveBeenCalled();
    expect(last.focus).not.toHaveBeenCalled();
  });

  it('sin elementos enfocables no intercepta el tabulador', () => {
    const host = createHost([]);
    const event = keyEvent(false);

    expect(() => host.trapDialogTab(event)).not.toThrow();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
