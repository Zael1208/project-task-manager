import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Pruebas de integracion del servidor (TM-R8).
//
// Levantan el servidor de verdad, en un puerto libre, sobre una base de datos
// desechable que `tk` crea vacia. No tocan ni el backlog real ni el catalogo de
// etiquetas del proyecto: todo vive en una carpeta temporal que se borra al
// terminar.
//
// Se carga el servidor con createRequire, el cargador CommonJS real de Node, en
// vez de dejar que el empaquetador transforme el modulo: el servidor usa
// require y module.exports y no debe pasar por el transformador de ESM.

const require = createRequire(import.meta.url);

let server;
let baseUrl;
let tempDir;
let closeTagDatabase;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

function post(pathname, payload) {
  return request(pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

function put(pathname, payload) {
  return request(pathname, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function createTask(title, extra = {}) {
  const created = await post('/api/tk/create', { title, priority: 2, ...extra });
  expect(created.status).toBe(200);
  return created.body.id;
}

async function readSseEvent(reader, eventName) {
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) throw new Error(`El stream SSE terminó antes de ${eventName}.`);
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop();
    const block = blocks.find((candidate) => candidate.includes(`event: ${eventName}`));
    if (block) return block;
  }
}

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-manager-test-'));
  process.env.TACKS_DB = path.join(tempDir, 'tacks.db');
  process.env.DATA_DIR = tempDir;
  // Puerto 0: el sistema elige uno libre y no choca con una instancia en marcha.
  process.env.PORT = '0';

  const { server: httpServer, startServer } = require('../../server/index.js');
  ({ closeTagDatabase } = require('../../server/tags.js'));
  server = httpServer;
  baseUrl = `http://127.0.0.1:${await startServer()}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  // La base del catalogo hay que cerrarla antes de borrar la carpeta: en Windows
  // un archivo SQLite abierto impide eliminar su directorio.
  closeTagDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('servidor: arranque y estaticos', () => {
  it('crea la base vacia sola y responde con un listado vacio', async () => {
    const list = await request('/api/tk/list');
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
  });

  it('sirve la pagina y redirige la raiz', async () => {
    const root = await request('/');
    expect(root.status).toBe(200);
    expect(root.body).toContain('Gestor de tareas');

    const vendor = await request('/vendor/vue.global.prod.js');
    expect(vendor.status).toBe(200);

    const bundle = await request('/task-manager/app-vue.js');
    expect(bundle.status).toBe(200);
  });

  it('bloquea el acceso fuera de public/', async () => {
    for (const target of ['/../package.json', '/task-manager/../../package.json', '/%2e%2e/PRD.md']) {
      const response = await request(target);
      expect([403, 404]).toContain(response.status);
    }
  });

  it('devuelve 404 en una ruta de API desconocida', async () => {
    expect((await request('/api/tk/no-existe')).status).toBe(404);
  });
});

describe('servidor: eventos', () => {
  it('publica por SSE las mutaciones confirmadas de tareas', async () => {
    const stream = await fetch(`${baseUrl}/api/events`);
    expect(stream.status).toBe(200);
    expect(stream.headers.get('content-type')).toContain('text/event-stream');

    const reader = stream.body.getReader();
    await createTask('Tarea SSE');

    const block = await readSseEvent(reader, 'workspace.changed');
    const data = JSON.parse(block.split('\n').find((line) => line.startsWith('data: ')).slice(6));
    expect(data).toEqual({ resource: 'tasks' });
    await reader.cancel();
  });

  it('publica por SSE los cambios confirmados del catalogo de etiquetas', async () => {
    const stream = await fetch(`${baseUrl}/api/events`);
    expect(stream.status).toBe(200);
    const reader = stream.body.getReader();

    const created = await post('/api/tags', { name: 'SSE', description: '', color: 'blue' });
    expect(created.status).toBe(201);

    const block = await readSseEvent(reader, 'workspace.changed');
    const data = JSON.parse(block.split('\n').find((line) => line.startsWith('data: ')).slice(6));
    expect(data).toEqual({ resource: 'tags' });
    await reader.cancel();
  });
});

describe('servidor: tareas', () => {
  it('valida la prioridad en 0-3', async () => {
    for (const priority of [5, -1, 99, 'abc', 1.5]) {
      const rejected = await post('/api/tk/create', { title: 'Prioridad mala', priority });
      expect(rejected.status).toBe(400);
    }
    const accepted = await post('/api/tk/create', { title: 'Prioridad buena', priority: 3 });
    expect(accepted.status).toBe(200);
    expect(accepted.body.priority).toBe(3);
  });

  it('crea, muestra, edita y comenta', async () => {
    const id = await createTask('Tarea base', { description: 'Con descripcion', tags: ['uno'] });

    const shown = await request(`/api/tk/show/${id}`);
    expect(shown.status).toBe(200);
    expect(shown.body).toMatchObject({ id, title: 'Tarea base', description: 'Con descripcion' });

    const updated = await post('/api/tk/update', { id, changes: { title: 'Tarea editada', priority: 0 } });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ id, title: 'Tarea editada', priority: 0 });

    const commented = await post('/api/tk/comment', { id, body: 'Un comentario' });
    expect(commented.status).toBe(200);
    expect(commented.body.body).toBe('Un comentario');
  });

  it('rechaza campos obligatorios ausentes', async () => {
    expect((await post('/api/tk/create', { description: 'sin titulo' })).status).toBe(400);
    expect((await post('/api/tk/update', { changes: { title: 'x' } })).status).toBe(400);
    expect((await post('/api/tk/close', { comment: 'x' })).status).toBe(400);
    expect((await post('/api/tk/dep', { child_id: 'tk-1' })).status).toBe(400);
  });

  it('cruza el estado blocked al listar y lo retira al quitar la dependencia', async () => {
    const blocker = await createTask('Bloqueante');
    const blocked = await createTask('Bloqueada');

    const added = await post('/api/tk/dep', { child_id: blocked, parent_id: blocker });
    expect(added.status).toBe(200);
    expect(added.body.ok).toBe(true);

    // tk guarda la tarea como abierta: el estado blocked lo calcula el servidor.
    const listed = await request('/api/tk/list');
    expect(listed.body.find((task) => task.id === blocked).status).toBe('blocked');

    const removed = await post('/api/tk/dep-remove', { child_id: blocked, parent_id: blocker });
    expect(removed.status).toBe(200);

    const after = await request('/api/tk/list');
    expect(after.body.find((task) => task.id === blocked).status).toBe('open');
  });

  it('no cierra una tarea con subtareas abiertas', async () => {
    const parent = await createTask('Padre');
    const child = await createTask('Hija', { parent });

    const refused = await post('/api/tk/close', { id: parent });
    expect(refused.status).toBe(200);
    expect(String(refused.body.error)).toMatch(/open dependent/);
    expect((await request(`/api/tk/show/${parent}`)).body.status).not.toBe('done');

    await post('/api/tk/close', { id: child });
    const closed = await post('/api/tk/close', { id: parent });
    expect(closed.body.status).toBe('done');
  });

  it('deja de presentar el motivo de cierre al reabrir una tarea', async () => {
    const id = await createTask('Se cierra y se reabre');

    const closed = await post('/api/tk/close', { id, reason: 'done' });
    expect(closed.body).toMatchObject({ status: 'done', close_reason: 'done' });

    const reopened = await post('/api/tk/update', { id, changes: { status: 'open' } });
    expect(reopened.body.status).toBe('open');
    // tk conserva el motivo en su base; la API no lo propaga.
    expect(reopened.body.close_reason).toBeNull();

    const shown = await request(`/api/tk/show/${id}`);
    expect(shown.body.close_reason).toBeNull();

    const listed = await request('/api/tk/list');
    expect(listed.body.find((task) => task.id === id).close_reason).toBeNull();
  });
});

describe('servidor: etiquetas', () => {
  it('crea, propaga el renombrado y borra una etiqueta', async () => {
    const created = await post('/api/tags', { name: 'Catalogo', description: 'De prueba', color: 'purple' });
    expect(created.status).toBe(201);

    // Duplicada, aunque cambien mayusculas y espacios: 409.
    expect((await post('/api/tags', { name: '  catalogo ', description: 'x', color: 'blue' })).status).toBe(409);
    expect((await post('/api/tags', { name: 'Color malo', description: 'x', color: 'fucsia' })).status).toBe(400);

    const taskId = await createTask('Tarea con etiqueta', { tags: ['Catalogo'] });

    const affected = await request(`/api/tags/${encodeURIComponent('Catalogo')}/affected`);
    expect(affected.body.total).toBe(1);
    expect(affected.body.tasks[0].id).toBe(taskId);

    const renamed = await put(`/api/tags/${encodeURIComponent('Catalogo')}`, {
      name: 'Renombrada',
      description: 'De prueba',
      color: 'red'
    });
    expect(renamed.status).toBe(200);

    const afterRename = await request(`/api/tk/show/${taskId}`);
    expect(afterRename.body.tags).toEqual(['Renombrada']);

    const removed = await request(`/api/tags/${encodeURIComponent('Renombrada')}`, { method: 'DELETE' });
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ ok: true, affected: 1 });

    const afterDelete = await request(`/api/tk/show/${taskId}`);
    expect(afterDelete.body.tags).toEqual([]);

    expect((await request('/api/tags/NoExiste', { method: 'DELETE' })).status).toBe(404);
  });
});
