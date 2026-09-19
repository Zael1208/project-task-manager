#!/usr/bin/env node
"use strict";

// Servidor local del gestor de tareas. Sin framework y sin dependencias de
// runtime: node:http, node:sqlite y node:child_process son suficientes
// (RNF-01 del PRD).
//
// Responsabilidades, en este orden:
//   1. Servir public/ (la interfaz y el Vue vendorizado).
//   2. Exponer /api/tk/*   -> tareas, delegando en el CLI tk.
//   3. Exponer /api/tags*  -> catalogo de etiquetas, sobre base propia.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { contentTypeFor, sendJson } = require("./http");
const tk = require("./tk");
const tasks = require("./tasks");
const tags = require("./tags");

const PROJECT_ROOT = tk.PROJECT_ROOT;
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

// D-8: 8890 por defecto. ChatVoiceAgent usa 8792 y `tk serve` usa 3000, asi
// que un valor distinto permite tener ambos levantados a la vez.
// Con PORT=0 el sistema elige un puerto libre: es lo que usan las pruebas de
// integracion para no chocar con una instancia ya en marcha.
const PORT = process.env.PORT === undefined || process.env.PORT === "" ? 8890 : Number(process.env.PORT);

const APP_PAGE = "/task-manager/app-vue.html";

// --- Ficheros estaticos ------------------------------------------------------

/**
 * Traduce una ruta de URL a una ruta real dentro de public/, o null si se
 * sale. Comprueba el resultado resuelto y, si el archivo existe, tambien su
 * ruta real, para que un enlace simbolico no permita escapar (RF-03).
 *
 * @returns {string|null}
 */
function resolvePublicPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;

  const resolved = path.resolve(PUBLIC_DIR, `.${decoded}`);
  const relative = path.relative(PUBLIC_DIR, resolved);
  // relative vacio significa que es la propia carpeta public/, que no se sirve.
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (!fs.existsSync(resolved)) return resolved;

  const real = fs.realpathSync(resolved);
  const realRelative = path.relative(PUBLIC_DIR, real);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) return null;
  return real;
}

function serveStatic(req, res) {
  const urlPath = req.url.split("?")[0];
  const filePath = resolvePublicPath(urlPath);
  if (!filePath) return sendJson(res, 403, { error: "Ruta no permitida." });

  fs.readFile(filePath, (err, data) => {
    if (err) return sendJson(res, 404, { error: "No encontrado." });
    res.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      // En desarrollo: nunca servir un bundle viejo desde la cache.
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

// --- Enrutado ----------------------------------------------------------------

// Rutas exactas: metodo + ruta completa.
const EXACT_ROUTES = new Map([
  // Catalogo de etiquetas
  ["GET /api/tags", (req, res) => tags.handleTagList(req, res)],
  ["POST /api/tags", (req, res) => tags.handleTagCreate(req, res)],

  // Tareas -- lectura
  ["GET /api/tk/active-count", (req, res) => tasks.handleTkActiveCount(req, res)],
  ["GET /api/tk/list", (req, res) => tasks.handleTkList(req, res)],
  ["GET /api/tk/stats", (req, res) => tasks.handleTkStats(req, res)],
  ["GET /api/tk/ready", (req, res) => tasks.handleTkReady(req, res)],
  ["GET /api/tk/epic", (req, res) => tasks.handleTkEpic(req, res)],
  ["GET /api/tk/blocked", (req, res) => tasks.handleTkBlocked(req, res)],

  // Tareas -- escritura
  ["POST /api/tk/create", (req, res) => tasks.handleTkCreate(req, res)],
  ["POST /api/tk/close", (req, res) => tasks.handleTkClose(req, res)],
  ["POST /api/tk/update", (req, res) => tasks.handleTkUpdate(req, res)],
  ["POST /api/tk/dep", (req, res) => tasks.handleTkDep(req, res, "add")],
  ["POST /api/tk/dep-remove", (req, res) => tasks.handleTkDep(req, res, "remove")],
  ["POST /api/tk/comment", (req, res) => tasks.handleTkComment(req, res)],
]);

// Rutas con parametro al final. El prefijo incluye la barra, asi que
// "/api/tk/show/" no casa con "/api/tk/showcase".
const PREFIX_ROUTES = [
  ["GET", "/api/tk/children/", (req, res, rest) => tasks.handleTkChildren(req, res, rest)],
  ["GET", "/api/tk/show/", (req, res, rest) => tasks.handleTkShow(req, res, rest)],
  ["PUT", "/api/tags/", (req, res, rest) => tags.handleTagUpdate(req, res, rest)],
  ["DELETE", "/api/tags/", (req, res, rest) => tags.handleTagDelete(req, res, rest)],
];

function decodeParam(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function handleRequest(req, res) {
  const urlPath = (req.url || "/").split("?")[0];

  // Con tk no disponible se responde 404 y el mensaje exacto que el cliente
  // reconoce como "capacidad no disponible" -- no una lista vacia (RF-06).
  if (!tk.status().enabled && (urlPath.startsWith("/api/tk/") || urlPath.startsWith("/api/tags"))) {
    return sendJson(res, 404, { error: tk.UNAVAILABLE_MESSAGE });
  }

  // Atajos de entrada: la pagina vive en /task-manager/app-vue.html.
  if (req.method === "GET" && (urlPath === "/" || urlPath === "/task-manager" || urlPath === "/task-manager/")) {
    res.writeHead(302, { Location: APP_PAGE });
    return res.end();
  }

  // /api/tags/<nombre>/affected tiene que comprobarse antes que el prefijo
  // generico /api/tags/<nombre>, que si no se lo tragaria como un nombre.
  if (req.method === "GET" && urlPath.startsWith("/api/tags/") && urlPath.endsWith("/affected")) {
    const name = decodeParam(urlPath.slice("/api/tags/".length, -"/affected".length));
    return tags.handleTagAffected(req, res, name);
  }

  const exact = EXACT_ROUTES.get(`${req.method} ${urlPath}`);
  if (exact) return exact(req, res);

  for (const [method, prefix, handler] of PREFIX_ROUTES) {
    if (req.method === method && urlPath.startsWith(prefix)) {
      return handler(req, res, decodeParam(urlPath.slice(prefix.length)));
    }
  }

  if (req.method === "GET") return serveStatic(req, res);

  sendJson(res, 404, { error: "Ruta no encontrada." });
}

// --- Arranque ----------------------------------------------------------------

const server = http.createServer((req, res) => {
  Promise.resolve(handleRequest(req, res)).catch((err) => {
    if (res.headersSent) return;
    sendJson(res, 500, { error: String(err?.message || err) });
  });
});

function startServer() {
  return new Promise((resolve, reject) => {
    // Sin este manejador, un puerto ocupado deja la promesa colgada para
    // siempre en vez de fallar.
    server.once("error", reject);
    server.listen(PORT, () => {
      const state = tk.status();
      // El puerto real, que no es PORT cuando se pidio el 0.
      const { port } = server.address();
      console.log(`Gestor de tareas en http://localhost:${port}${APP_PAGE}`);
      console.log(`  tareas: ${state.enabled ? state.dbPath : `DESHABILITADO (${state.reason})`}`);
      console.log(`  etiquetas: ${tags.TAGS_DB_PATH}`);
      resolve(port);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(
      err?.code === "EADDRINUSE"
        ? `El puerto ${PORT} ya esta en uso. Prueba con otra: $env:PORT=8891; npm run server`
        : String(err)
    );
    process.exitCode = 1;
  });
}

module.exports = { startServer, server, PORT, PUBLIC_DIR, APP_PAGE };
