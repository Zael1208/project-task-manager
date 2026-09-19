"use strict";

// Catalogo de etiquetas. Es lo UNICO que este servidor posee por su cuenta:
// tk no tiene concepto de color ni de descripcion de etiqueta, solo cadenas
// de texto dentro de cada tarea.
//
// La base es un archivo SQLite propio (data/task-manager.db) y NO vive dentro
// de tacks.db: esa base pertenece a un binario de terceros y no conviene que
// nuestros datos dependan de su ciclo de vida (decision D-5 del PRD).

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const { sendJson, readJson } = require("./http");
const { runTk, listTasksMerged, PROJECT_ROOT } = require("./tk");

const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, "data");
const TAGS_DB_PATH = process.env.TAGS_DB || path.join(DATA_DIR, "task-manager.db");

const TAG_COLORS = new Set(["blue", "purple", "green", "yellow", "orange", "red"]);

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(TAGS_DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tag_metadata (
    name TEXT PRIMARY KEY COLLATE NOCASE,
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// --- Semantica de nombres ----------------------------------------------------

/**
 * Normaliza NFC, recorta extremos y colapsa espacios internos. Conserva los
 * acentos a proposito: "Revision" y "Revisión" son etiquetas distintas.
 */
function normalizeTagName(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Comparacion administrativa de nombres. Insensible a mayusculas pero
 * SENSIBLE a acentos ("sensitivity: accent").
 */
function sameTagName(left, right) {
  return normalizeTagName(left).localeCompare(normalizeTagName(right), "es", { sensitivity: "accent" }) === 0;
}

function tagInput(input) {
  const name = normalizeTagName(input?.name);
  const description = String(input?.description || "").trim();
  const color = String(input?.color || "");
  if (!name) return { error: "El nombre de la etiqueta es obligatorio." };
  if (name.length > 40) return { error: "El nombre no puede superar 40 caracteres." };
  if (description.length > 90) return { error: "La descripcion no puede superar 90 caracteres." };
  if (!TAG_COLORS.has(color)) return { error: "El color de etiqueta no es valido." };
  return { name, description, color };
}

// --- Acceso a datos ----------------------------------------------------------

// ponytail: recorre el catalogo entero y filtra en JS porque COLLATE NOCASE no
// distingue acentos y sameTagName si. Sobra con un catalogo pequeno; si pasa de
// unos cientos de etiquetas, guardar el nombre plegado en una columna indexada.
function metadataForTag(name) {
  return db
    .prepare("SELECT name, description, color FROM tag_metadata")
    .all()
    .find((row) => sameTagName(row.name, name));
}

/** Tareas que usan una etiqueta, leidas del estado real de tk. */
async function tagTasks(name) {
  const tasks = await listTasksMerged();
  if (tasks?.error) return tasks;
  return tasks.filter((task) => Array.isArray(task.tags) && task.tags.some((tag) => sameTagName(tag, name)));
}

function updateTaskTag(task, from, to) {
  const args = ["--json", "update", task.id];
  if (from) args.push("--remove-tags", from);
  if (to) args.push("--add-tags", to);
  return runTk(args);
}

/**
 * Deshace en orden inverso los cambios ya aplicados a tareas.
 *
 * Renombrar o borrar una etiqueta es una secuencia de invocaciones del CLI,
 * sin transaccion: si una falla a mitad hay que revertir las anteriores para
 * no dejar el catalogo y las tareas en desacuerdo (RF-37).
 *
 * @returns {Promise<string>} Nota para anadir al error (vacia si todo se restauro).
 */
async function restoreTagUpdates(updated, from, to) {
  const failures = [];
  for (const task of [...updated].reverse()) {
    const restored = await updateTaskTag(task, to, from);
    if (restored?.error) failures.push(task.id);
  }
  return failures.length ? ` No se pudo restaurar: ${failures.join(", ")}.` : "";
}

// --- Handlers ----------------------------------------------------------------

async function handleTagList(req, res) {
  // ponytail: cada peticion lanza el listado completo de tk y carga todo el
  // catalogo para cruzarlos en JS. Sobra para el tamano actual; si el backlog
  // crece, cachear los metadatos o resolver el cruce en SQL.
  const tasks = await listTasksMerged();
  if (tasks?.error) return sendJson(res, 503, { error: tasks.error });

  const metadata = db.prepare("SELECT name, description, color FROM tag_metadata").all();

  // Las etiquetas reales salen de las tareas (con su numero de usos); los
  // metadatos aportan color y descripcion. Una etiqueta puede existir solo en
  // un lado: en las tareas (uses > 0, sin metadatos) o solo en el catalogo
  // (uses: 0, creada pero aun sin usar).
  const tags = new Map();
  for (const task of tasks) {
    for (const rawName of task.tags || []) {
      const name = normalizeTagName(rawName);
      if (!name) continue;
      const key = name.toLocaleLowerCase("es");
      const entry = tags.get(key) || { name, uses: 0 };
      entry.uses += 1;
      tags.set(key, entry);
    }
  }
  for (const row of metadata) {
    const key = row.name.toLocaleLowerCase("es");
    const entry = tags.get(key) || { name: row.name, uses: 0 };
    entry.name = row.name;
    entry.description = row.description;
    entry.color = row.color;
    tags.set(key, entry);
  }

  sendJson(
    res,
    200,
    [...tags.values()]
      .map((tag) => ({ ...tag, description: tag.description || "", color: tag.color || "blue" }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
  );
}

async function handleTagCreate(req, res) {
  const input = await readJson(req, res);
  if (!input) return;

  const tag = tagInput(input);
  if (tag.error) return sendJson(res, 400, tag);
  if (metadataForTag(tag.name)) return sendJson(res, 409, { error: "Ya existe una etiqueta con ese nombre." });

  const now = Date.now();
  try {
    db.prepare("INSERT INTO tag_metadata (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
      tag.name,
      tag.description,
      tag.color,
      now,
      now
    );
    sendJson(res, 201, tag);
  } catch (err) {
    sendJson(res, 409, { error: `No se pudo crear la etiqueta: ${err.message}` });
  }
}

async function handleTagAffected(req, res, name) {
  const tasks = await tagTasks(name);
  if (tasks?.error) return sendJson(res, 503, { error: tasks.error });
  sendJson(res, 200, { total: tasks.length, tasks: tasks.map((task) => ({ id: task.id, title: task.title })) });
}

async function handleTagUpdate(req, res, oldName) {
  const input = await readJson(req, res);
  if (!input) return;

  const existing = metadataForTag(oldName);
  const tag = tagInput(input);
  if (tag.error) return sendJson(res, 400, tag);

  const duplicate = metadataForTag(tag.name);
  if (duplicate && !sameTagName(duplicate.name, oldName)) {
    return sendJson(res, 409, { error: "Ya existe una etiqueta con ese nombre." });
  }

  const tasks = await tagTasks(oldName);
  if (tasks?.error) return sendJson(res, 503, { error: tasks.error });
  if (!existing && tasks.length === 0) return sendJson(res, 404, { error: "Etiqueta no encontrada." });

  // Primero las tareas, despues los metadatos: si falla a mitad, se revierte
  // lo ya aplicado.
  const updated = [];
  for (const task of tasks) {
    const actualName = task.tags.find((taskTag) => sameTagName(taskTag, oldName));
    const result = await updateTaskTag(task, actualName, tag.name);
    if (result?.error) {
      const note = await restoreTagUpdates(updated, tag.name, oldName);
      return sendJson(res, 409, { error: `No se pudo renombrar la etiqueta en ${task.id}.${note}` });
    }
    updated.push(task);
  }

  try {
    const now = Date.now();
    if (existing) {
      db.prepare("UPDATE tag_metadata SET name = ?, description = ?, color = ?, updated_at = ? WHERE name = ?").run(
        tag.name,
        tag.description,
        tag.color,
        now,
        existing.name
      );
    } else {
      db.prepare("INSERT INTO tag_metadata (name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
        tag.name,
        tag.description,
        tag.color,
        now,
        now
      );
    }
    sendJson(res, 200, { ...tag, uses: tasks.length });
  } catch {
    const note = await restoreTagUpdates(updated, tag.name, oldName);
    sendJson(res, 500, { error: `No se pudieron guardar los metadatos.${note}` });
  }
}

async function handleTagDelete(req, res, name) {
  const existing = metadataForTag(name);
  const tasks = await tagTasks(name);
  if (tasks?.error) return sendJson(res, 503, { error: tasks.error });
  if (!existing && tasks.length === 0) return sendJson(res, 404, { error: "Etiqueta no encontrada." });

  const updated = [];
  for (const task of tasks) {
    const actualName = task.tags.find((taskTag) => sameTagName(taskTag, name));
    const result = await updateTaskTag(task, actualName, "");
    if (result?.error) {
      const note = await restoreTagUpdates(updated, "", existing?.name || name);
      return sendJson(res, 409, { error: `No se pudo retirar la etiqueta de ${task.id}.${note}` });
    }
    updated.push(task);
  }

  try {
    if (existing) db.prepare("DELETE FROM tag_metadata WHERE name = ?").run(existing.name);
    sendJson(res, 200, { ok: true, affected: tasks.length });
  } catch {
    const note = await restoreTagUpdates(updated, "", existing?.name || name);
    sendJson(res, 500, { error: `No se pudieron eliminar los metadatos.${note}` });
  }
}

/**
 * Cierra la base del catalogo. La usan las pruebas de integracion: en Windows un
 * archivo SQLite abierto impide eliminar el directorio que lo contiene, asi que
 * sin esto no pueden limpiar su carpeta temporal.
 */
function closeTagDatabase() {
  db.close();
}

module.exports = {
  TAGS_DB_PATH,
  TAG_COLORS,
  normalizeTagName,
  sameTagName,
  closeTagDatabase,
  handleTagList,
  handleTagCreate,
  handleTagAffected,
  handleTagUpdate,
  handleTagDelete,
};
