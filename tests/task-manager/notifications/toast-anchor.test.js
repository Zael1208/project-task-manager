import { describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  configure: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  modal: vi.fn()
}));

vi.mock('toast-anchor', () => ({ default: toast }));

import { confirmAction, notifyError, notifySuccess } from '../../../src/task-manager/notifications/toast-anchor.js';

describe('Toast Anchor Dark Studio', () => {
  it('configura una superficie oscura y centraliza las notificaciones', async () => {
    notifySuccess('Guardado.');
    notifyError('Falló.');
    toast.modal.mockResolvedValueOnce(true);

    await expect(confirmAction('Eliminar etiqueta', '¿Continuar?')).resolves.toBe(true);

    expect(toast.configure).toHaveBeenCalledWith(expect.objectContaining({
      position: 'top-right',
      toast: expect.objectContaining({ bg: '#121c27', color: '#f3f6f8' }),
      modal: expect.objectContaining({ bg: '#182431', titleColor: '#f3f6f8' })
    }));
    expect(toast.success).toHaveBeenCalledWith('Guardado.');
    expect(toast.error).toHaveBeenCalledWith('Falló.');
    expect(toast.modal).toHaveBeenCalledWith('Eliminar etiqueta', '¿Continuar?', expect.objectContaining({
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      confirmVariant: 'danger'
    }));
  });
});
