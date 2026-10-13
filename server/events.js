"use strict";

// Canal SSE del workspace. El alcance deliberado es el proceso HTTP actual:
// las mutaciones externas hechas con el CLI tk no se observan en esta unidad.

const clients = new Set();

function writeEvent(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function connectSse(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");
  clients.add(res);

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

function publishWorkspaceChanged(resource) {
  for (const res of clients) {
    if (res.destroyed || res.writableEnded) {
      clients.delete(res);
      continue;
    }
    try {
      writeEvent(res, "workspace.changed", { resource });
    } catch {
      clients.delete(res);
    }
  }
}

module.exports = { connectSse, publishWorkspaceChanged };
