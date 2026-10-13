import toast from '../../../public/vendor/toast-anchor.mjs';

const DARK_STUDIO = {
  position: 'bottom-right',
  toast: {
    bg: '#121c27',
    color: '#f3f6f8',
    descColor: '#bac4ce',
    borderColor: '#344657',
    borderWidth: '1px',
    borderRadius: '8px',
    shadow: '0 30px 90px rgba(0, 0, 0, 0.52)',
    width: 'min(400px, calc(100vw - 36px))'
  },
  modal: {
    overlayBg: 'rgba(10, 16, 23, 0.78)',
    overlayBlur: '5px',
    bg: '#182431',
    borderColor: '#344657',
    borderWidth: '1px',
    borderRadius: '8px',
    shadow: '0 30px 90px rgba(0, 0, 0, 0.62)',
    titleColor: '#f3f6f8',
    messageColor: '#bac4ce',
    footerBg: '#121c27',
    footerBorder: '#253342',
    cancelColor: '#bac4ce',
    cancelHoverBg: '#1b2937'
  },
  theme: {
    success: { bg: '#58d392', light: 'rgba(88, 211, 146, 0.16)' },
    error: { bg: '#ff7373', light: 'rgba(255, 115, 115, 0.16)' },
    warning: { bg: '#f2bf59', light: 'rgba(242, 191, 89, 0.16)' },
    info: { bg: '#62a7ff', light: 'rgba(98, 167, 255, 0.16)' }
  }
};

toast.configure(DARK_STUDIO);

export function notifySuccess(message) {
  return toast.success(message);
}

export function notifyError(message) {
  return toast.error(message);
}

export function notifyInfo(message) {
  return toast.info(message);
}

export function confirmAction(title, message, options = {}) {
  return toast.modal(title, message, {
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    confirmVariant: 'danger',
    ...options
  });
}
