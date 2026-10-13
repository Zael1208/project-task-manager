import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  connectSse,
  publishWorkspaceChanged,
  stopExternalTaskWatch,
  watchExternalTaskDatabase
} = require('../../server/events.js');

function createSsePair() {
  let closeRequest;
  const response = {
    destroyed: false,
    writableEnded: false,
    chunks: [],
    writeHead() {},
    write(chunk) {
      this.chunks.push(chunk);
    },
    on() {}
  };
  const request = {
    url: '/api/events?clientId=test-browser',
    on(event, handler) {
      if (event === 'close') closeRequest = handler;
    }
  };
  connectSse(request, response);
  return { request, response, close: () => closeRequest?.() };
}

function readWorkspaceEvent(chunks) {
  const block = chunks.find((chunk) => chunk.includes('event: workspace.changed'));
  if (!block) return null;
  return JSON.parse(block.split('\n').find((line) => line.startsWith('data: ')).slice(6));
}

async function waitForWorkspaceEvent(response) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const event = readWorkspaceEvent(response.chunks);
    if (event) return event;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('No llegó workspace.changed.');
}

afterEach(() => {
  stopExternalTaskWatch();
});

describe('canal SSE del workspace', () => {
  it('publica el origen, el navegador originador y los cambios descritos', async () => {
    const pair = createSsePair();

    await publishWorkspaceChanged(
      'tasks',
      'http',
      [{ id: 'tk-1', action: 'actualizada', title: 'Tarea' }],
      'origin-browser'
    );

    expect(readWorkspaceEvent(pair.response.chunks)).toEqual({
      resource: 'tasks',
      source: 'http',
      changes: [{ id: 'tk-1', action: 'actualizada', title: 'Tarea' }],
      originClientId: 'origin-browser'
    });
    pair.close();
  });

  it('detecta cambios externos en la base y sus sidecars SQLite', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-manager-events-'));
    const databasePath = path.join(tempDir, 'tacks.db');
    fs.writeFileSync(databasePath, 'base');
    fs.writeFileSync(`${databasePath}-wal`, 'inicial');
    fs.writeFileSync(`${databasePath}-shm`, 'inicial');
    const pair = createSsePair();
    let snapshot = [{ id: 'tk-1', title: 'Antes', status: 'open' }];

    try {
      await watchExternalTaskDatabase(databasePath, async () => snapshot);
      snapshot = [{ id: 'tk-1', title: 'Después', status: 'open' }];
      fs.writeFileSync(`${databasePath}-wal`, 'cambio');

      await expect(waitForWorkspaceEvent(pair.response)).resolves.toMatchObject({
        resource: 'tasks',
        source: 'external',
        changes: [{ id: 'tk-1', action: 'actualizada', title: 'Después' }]
      });
    } finally {
      pair.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
