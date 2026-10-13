import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, listTasks, setClientId, updateTask } from '../../../src/task-manager/api/tk-client.js';

afterEach(() => {
  setClientId('');
  vi.unstubAllGlobals();
});

describe('tk-client', () => {
  it('returns valid JSON responses', async () => {
    const tasks = [{ id: 'tk-1' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue(tasks) }));

    await expect(listTasks()).resolves.toEqual(tasks);
    expect(fetch).toHaveBeenCalledWith('/api/tk/list', {});
  });

  it('sends the browser client id with API mutations', async () => {
    const response = { ok: true, status: 200, json: vi.fn().mockResolvedValue({ id: 'tk-1' }) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    setClientId('browser-a');

    await expect(updateTask('tk-1', { status: 'in_progress' })).resolves.toEqual({ id: 'tk-1' });

    expect(fetch).toHaveBeenCalledWith('/api/tk/update', expect.objectContaining({
      headers: { 'content-type': 'application/json', 'x-client-id': 'browser-a' }
    }));
  });

  it('normalizes network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket closed')));

    await expect(listTasks()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'socket closed',
      unavailable: false
    });
  });

  it('rejects invalid JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError('invalid JSON'))
    }));

    await expect(listTasks()).rejects.toEqual(expect.objectContaining({
      message: 'El servidor devolvió una respuesta no válida.'
    }));
  });

  it('preserves HTTP error messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Fallo TK' })
    }));

    await expect(listTasks()).rejects.toEqual(expect.objectContaining({
      message: 'Fallo TK',
      unavailable: false
    }));
  });

  it('marks the disabled TK capability as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: 'La capacidad de tareas no esta disponible en este anfitrion.' })
    }));

    try {
      await listTasks();
      throw new Error('Expected listTasks to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.unavailable).toBe(true);
    }
  });

  it('does not treat a 404 without a JSON body as a disabled capability', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockRejectedValue(new SyntaxError('invalid JSON'))
    }));

    await expect(listTasks()).rejects.toMatchObject({
      message: 'El servidor devolvió una respuesta no válida.',
      unavailable: false
    });
  });
});
