// Comportamiento comun de los dialogos modales.
//
// Un dialogo que declara `aria-modal="true"` promete al lector de pantalla que
// el resto de la pagina queda inerte. Eso no ocurre solo: hay que mover el foco
// dentro, impedir que el tabulador se escape y devolverlo al cerrar. Sin esta
// pieza la promesa es falsa: quien navega con teclado puede acabar con el foco
// detras del dialogo sin darse cuenta.
//
// El cierre con Escape NO vive aqui: lo centraliza `state/ui.js` mediante un
// unico listener global (ver workspace.js), para no repartir esa decision
// entre varios componentes.

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Visible de verdad: ancho, alto o cajas de cliente. Se evita `offsetParent`
 * porque devuelve null en elementos con `position: fixed`, que es justo como
 * se suelen posicionar las capas modales.
 */
function isVisible(element) {
  return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

export const dialogFocus = {
  data() {
    return { focusReturnTarget: null };
  },
  watch: {
    open(value) {
      if (value) this.enterDialog();
      else this.exitDialog();
    }
  },
  mounted() {
    if (this.open) this.enterDialog();
  },
  beforeUnmount() {
    this.exitDialog();
  },
  methods: {
    /**
     * Elemento que actua como raiz del dialogo. Los componentes marcan su
     * elemento modal con `ref="dialogRoot"`; si no lo hacen, se usa la raiz
     * del propio componente.
     */
    dialogElement() {
      return this.$refs.dialogRoot || this.$el;
    },
    focusableElements(scope = this.dialogElement()) {
      if (!scope?.querySelectorAll) return [];
      return [...scope.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible);
    },
    /** Entra en el dialogo guardando de donde venimos para poder volver. */
    enterDialog(scope) {
      const active = document.activeElement;
      this.focusReturnTarget = active && active !== document.body ? active : null;
      this.$nextTick(() => this.focusInside(scope));
    },
    /** Devuelve el foco al control que abrio el dialogo, si sigue en la pagina. */
    exitDialog() {
      const target = this.focusReturnTarget;
      this.focusReturnTarget = null;
      if (target?.isConnected && typeof target.focus === 'function') target.focus();
    },
    /**
     * El foco entra en el contenedor del dialogo, no en su primer control.
     * Asi el lector de pantalla anuncia el dialogo por su nombre y no se abre
     * directamente sobre la "x" de cerrar.
     */
    focusInside(scope = this.dialogElement()) {
      const root = scope || this.dialogElement();
      if (root?.focus) return root.focus();
      const [first] = this.focusableElements(root);
      if (first) first.focus();
    },
    /** Mantiene el tabulador dentro del dialogo: del ultimo vuelve al primero. */
    trapDialogTab(event) {
      const scope = this.dialogElement();
      const focusables = this.focusableElements(scope);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === scope)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
};
