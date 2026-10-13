"use strict";

// Canal SSE del workspace. Las mutaciones HTTP se publican de forma explícita
// y los cambios externos de tk se detectan observando su fichero de base.

const fs = require("node:fs");

const clients = new Map();
let watchedTaskFiles = [];
let externalChangeTimer = null;
let lastTaskSignature = null;
let lastInternalTaskSignature = null;
let taskSnapshotLoader = null;
let lastTaskSnapshot = null;

function writeEvent(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function signatureFromStats(stats) {
  if (!stats) return null;
  return `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}`;
}

function fileSignature(filePath) {
  try {
    return signatureFromStats(fs.statSync(filePath));
  } catch {
    return null;
  }
}

function taskDatabaseSignature() {
  return watchedTaskFiles.map(({ path: filePath }) => `${filePath}:${fileSignature(filePath)}`).join("|");
}

function taskFingerprint(task) {
  return JSON.stringify([
    task.id,
    task.title,
    task.description,
    task.status,
    task.priority,
    task.assignee,
    task.parent_id ?? task.parentId,
    task.tags ?? task.chips,
    task.notes,
    task.close_reason,
    task.updated_at,
  ]);
}

function describeTaskChanges(previous, current) {
  if (!Array.isArray(previous) || !Array.isArray(current)) return [];

  const before = new Map(previous.map((task) => [task.id, task]));
  const after = new Map(current.map((task) => [task.id, task]));
  const changes = [];

  for (const task of current) {
    const previousTask = before.get(task.id);
    if (!previousTask) {
      changes.push({ id: task.id, action: "creada", title: task.title || "Sin título" });
    } else if (taskFingerprint(previousTask) !== taskFingerprint(task)) {
      const action = previousTask.status !== "done" && task.status === "done" ? "cerrada" : "actualizada";
      changes.push({ id: task.id, action, title: task.title || "Sin título" });
    }
  }

  for (const task of previous) {
    if (!after.has(task.id)) changes.push({ id: task.id, action: "eliminada", title: task.title || "Sin título" });
  }

  return changes;
}

function connectSse(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");
  const clientId = new URL(req.url || "/", "http://localhost").searchParams.get("clientId") || "";
  clients.set(res, clientId);

  const heartbeat = setInterval(() => {
    if (!res.destroyed) res.write(": heartbeat\n\n");
  }, 25_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(res);
  };
  req.on("close", cleanup);
  res.on("error", cleanup);
}

async function publishWorkspaceChanged(resource, source = "http", changes = [], originClientId = "") {
  let snapshotPromise = null;
  if (resource === "tasks" && source === "http" && watchedTaskFiles.length) {
    lastInternalTaskSignature = taskDatabaseSignature();
    lastTaskSignature = lastInternalTaskSignature;
    if (taskSnapshotLoader) {
      const expectedSignature = lastInternalTaskSignature;
      snapshotPromise = Promise.resolve(taskSnapshotLoader()).then((snapshot) => {
        if (taskDatabaseSignature() === expectedSignature && Array.isArray(snapshot)) lastTaskSnapshot = snapshot;
      }).catch(() => {});
    }
  }

  const data = { resource, source };
  if (Array.isArray(changes) && changes.length) data.changes = changes;
  if (originClientId) data.originClientId = originClientId;

  for (const [res] of clients) {
    if (res.destroyed || res.writableEnded) {
      clients.delete(res);
      continue;
    }
    try {
      writeEvent(res, "workspace.changed", data);
    } catch {
      clients.delete(res);
    }
  }

  if (snapshotPromise) await snapshotPromise;
}

function stopExternalTaskWatch() {
  for (const watched of watchedTaskFiles) {
    fs.unwatchFile(watched.path, watched.listener);
  }
  if (externalChangeTimer) clearTimeout(externalChangeTimer);
  watchedTaskFiles = [];
  externalChangeTimer = null;
  lastTaskSignature = null;
  lastInternalTaskSignature = null;
  taskSnapshotLoader = null;
  lastTaskSnapshot = null;
}

/**
 * Observa cambios del CLI tk, que no atraviesan la API HTTP de este proceso.
 * fs.watchFile usa polling y funciona igual en Windows y Linux/WSL. Se vigilan
 * la base principal y los sidecars de SQLite para cubrir journal_mode=WAL; el
 * debounce agrupa las escrituras que SQLite hace durante un commit.
 */
async function watchExternalTaskDatabase(filePath, getTaskSnapshot) {
  stopExternalTaskWatch();
  if (!filePath) return;

  taskSnapshotLoader = getTaskSnapshot || null;
  if (taskSnapshotLoader) {
    try {
      const snapshot = await taskSnapshotLoader();
      if (Array.isArray(snapshot)) lastTaskSnapshot = snapshot;
    } catch {
      lastTaskSnapshot = null;
    }
  }

  const files = [filePath, `${filePath}-wal`, `${filePath}-shm`];
  watchedTaskFiles = files.map((filePathToWatch) => {
    const watched = { path: filePathToWatch, listener: null };
    watched.listener = (current, previous) => {
      const currentSignature = signatureFromStats(current);
      const previousSignature = signatureFromStats(previous);
      if (currentSignature === previousSignature) return;

      if (externalChangeTimer) clearTimeout(externalChangeTimer);
      externalChangeTimer = setTimeout(async () => {
        externalChangeTimer = null;
        const latestSignature = taskDatabaseSignature();
        if (!latestSignature || latestSignature === lastInternalTaskSignature || latestSignature === lastTaskSignature) return;

        const previousSnapshot = lastTaskSnapshot;
        let currentSnapshot = null;
        if (taskSnapshotLoader) {
          try {
            currentSnapshot = await taskSnapshotLoader();
          } catch {
            currentSnapshot = null;
          }
        }
        if (Array.isArray(currentSnapshot)) lastTaskSnapshot = currentSnapshot;
        lastTaskSignature = latestSignature;
        await publishWorkspaceChanged("tasks", "external", describeTaskChanges(previousSnapshot, currentSnapshot));
      }, 150);
    };
    fs.watchFile(filePathToWatch, { interval: 100 }, watched.listener);
    return watched;
  });
  lastTaskSignature = taskDatabaseSignature();
}

module.exports = {
  connectSse,
  publishWorkspaceChanged,
  watchExternalTaskDatabase,
  stopExternalTaskWatch,
};
