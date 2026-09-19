"use strict";

// Utilidades HTTP compartidas. Sin framework: el alcance no lo justifica y
// node:http es suficiente (decision RNF-01 del PRD).

const path = require("node:path");

// Tipos servidos: solo los que public/ contiene de verdad (html, js, css), mas
// json por si se llega a servir un dato estatico. Cualquier otra extension sale
// como application/octet-stream.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

module.exports = { contentTypeFor, sendJson, readJson };
