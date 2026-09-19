"use strict";

// Utilidades HTTP compartidas. Sin framework: el alcance no lo justifica y
// node:http es suficiente (decision RNF-01 del PRD).

const path = require("node:path");

// Tipos servidos. Deliberadamente corto: solo lo que este proyecto usa.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
};

function contentTypeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

/**
 * Lee y parsea el cuerpo JSON de la peticion. Si el cuerpo no es JSON valido
 * ya responde 400 y devuelve null, para que el handler solo tenga que salir.
 *
 * @returns {Promise<object|null>}
 */
async function readJson(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    return JSON.parse(body);
  } catch {
    sendJson(res, 400, { error: "JSON invalido." });
    return null;
  }
}

module.exports = { MIME, contentTypeFor, sendJson, readJson };
