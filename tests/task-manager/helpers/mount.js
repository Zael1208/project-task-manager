import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Ayudante para montar componentes Vue en las pruebas (TM-R4).
//
// Dos decisiones que conviene entender antes de tocar esto:
//
// 1. El runtime de Vue NO esta en npm: la aplicacion carga el archivo
//    vendorizado y espera `globalThis.Vue`. Las pruebas hacen lo mismo, en vez
//    de usar una copia distinta desde npm, porque lo que interesa probar es el
//    runtime que se distribuye.
//
// 2. jsdom no tiene motor de composicion: todo mide cero. El mixin de foco
//    descarta los elementos no visibles, asi que sin simular una medida no
//    encontraria ninguno. Se parchea la medida para que devuelva algo positivo
//    salvo cuando el elemento esta oculto, que es exactamente lo que hace
//    `v-show` (fija `display: none`). Es una simulacion fiel de lo unico que el
//    filtro necesita saber, no de la geometria real.

const here = path.dirname(fileURLToPath(import.meta.url));
const VUE_FILE = path.resolve(here, '../../../public/vendor/vue.global.prod.js');

let layoutShimInstalled = false;

function installLayoutShim() {
  if (layoutShimInstalled) return;
  layoutShimInstalled = true;
  for (const property of ['offsetWidth', 'offsetHeight']) {
    Object.defineProperty(globalThis.HTMLElement.prototype, property, {
      configurable: true,
      get() {
        return this.style?.display === 'none' ? 0 : 10;
      }
    });
  }
}

/** Carga el Vue vendorizado igual que lo hace la pagina. */
export function loadVue() {
  if (!globalThis.Vue) {
    const source = fs.readFileSync(VUE_FILE, 'utf8');
    // El build global asigna `var Vue = ...`. Al evaluarlo se recoge la
    // variable, que es como la obtiene la pagina al cargarlo con un script.
    globalThis.Vue = new Function(`${source}\nreturn Vue;`)();
  }
  return globalThis.Vue;
}

/**
 * Monta un componente en un contenedor nuevo.
 *
 * @returns {{ instance: object, container: HTMLElement, unmount: () => void }}
 */
export function mount(component, props = {}) {
  const Vue = loadVue();
  installLayoutShim();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = Vue.createApp(component, { ...props });
  const instance = app.mount(container);
  return {
    instance,
    container,
    unmount() {
      app.unmount();
      container.remove();
    }
  };
}

export function nextTick() {
  return loadVue().nextTick();
}

/**
 * Espera a que Vue aplique los cambios. Hacen falta dos vueltas: los cambios de
 * estado se aplican en la primera y los `$nextTick` encadenados desde un
 * `watch` —como la entrada de foco de los dialogos— corren en la siguiente.
 */
export async function flush(times = 2) {
  for (let index = 0; index < times; index += 1) await nextTick();
}

/** Deja el documento limpio entre pruebas. */
export function resetDom() {
  document.body.innerHTML = '';
  document.activeElement?.blur?.();
}

/**
 * Devuelve los elementos enfocables de un contenedor, con el mismo criterio de
 * visibilidad que usa el mixin.
 */
export function focusablesIn(container) {
  return [
    ...container.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )
  ].filter((element) => element.offsetWidth || element.offsetHeight);
}
