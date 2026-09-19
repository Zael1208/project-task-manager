"use strict";

// Envoltorio del CLI `tk` (tacks). Es la UNICA frontera del servidor con el
// binario externo: el resto del codigo no sabe como se invoca.
//
// tk es software de terceros y de solo lectura para nosotros: no se parchea ni
// se recompila. Su base de datos (.tacks/tacks.db) la posee el; nosotros solo
// la leemos y escribimos a traves de su CLI.
//
// Contrato aprendido de tk 0.2.4 (ver PRD, seccion 10):
//   - La mayoria de subcomandos aceptan --json y devuelven JSON real.
//   - `dep add` / `dep remove` NO devuelven JSON ni con --json: devuelven
//     texto. Por eso existe runTkText, que decide exito por codigo de salida.
//   - `blocked` no es un estado almacenado: se calcula cruzando list --all
//     con blocked. Ver listTasksMerged().

const fs = require("node:fs");
const path = require("node:path");
const { execFile, execFileSync } = require("node:child_process");

// Raiz del proyecto: la carpeta que contiene server/, tk/ y public/.
const PROJECT_ROOT = path.resolve(__dirname, "..");

// El binario. TK_ROOT permite moverlo sin tocar codigo; el nombre cambia por
// plataforma aunque hoy solo se distribuya el .exe de Windows.
const TK_ROOT = process.env.TK_ROOT || path.join(PROJECT_ROOT, "tk");
const TK_BIN = path.join(TK_ROOT, process.platform === "win32" ? "tk.exe" : "tk");

// Carpeta de trabajo y base de datos de tareas. TACKS_DB manda si esta
// definida: es la variable que el propio tk reconoce.
const TK_WORK_DIR = process.env.TK_WORK_DIR || TK_ROOT;
const TK_DB_PATH = process.env.TACKS_DB || path.join(TK_WORK_DIR, ".tacks", "tacks.db");

// Ninguna invocacion puede colgar el servidor (RNF-03).
const TK_TIMEOUT_MS = Number(process.env.TK_TIMEOUT_MS) || 5000;

// Margen para listados grandes; el valor por defecto de execFile (1 MB) se
// queda corto con backlogs de cientos de tareas.
const TK_MAX_BUFFER = 8 * 1024 * 1024;

const DISABLED = process.env.DISABLE_TK === "1";
let enabled = !DISABLED && fs.existsSync(TK_BIN);
let initError = null;

/** Mensaje exacto que el frontend reconoce como "capacidad no disponible". */
const UNAVAILABLE_MESSAGE = "La capacidad de tareas no esta disponible en este anfitrion.";

/**
 * Se invoca --db en cada llamada en vez de depender del directorio de trabajo.
 * Asi la ubicacion de la base es explicita y no cambia segun desde donde se
 * arranque el servidor.
 */
function buildArgs(args) {
  return ["--db", TK_DB_PATH, ...args];
}

function execOptions() {
  return {
    cwd: TK_WORK_DIR,
    timeout: TK_TIMEOUT_MS,
    maxBuffer: TK_MAX_BUFFER,
    windowsHide: true,
  };
}

if (enabled) {
  try {
    fs.mkdirSync(path.dirname(TK_DB_PATH), { recursive: true });
    if (!fs.existsSync(TK_DB_PATH)) {
      execFileSync(TK_BIN, buildArgs(["init"]), execOptions());
    }
  } catch (err) {
    // No se cae el servidor: queda deshabilitado y explica por que (RF-04).
    enabled = false;
    initError = err?.message || String(err);
  }
}

/**
 * Motivo por el que tk no esta disponible, o null si si lo esta. Distinguir
 * los tres casos importa: "deshabilitado a proposito" no es lo mismo que
 * "falta el binario", y confundirlos hace perder tiempo al diagnosticar.
 *
 * @returns {string|null}
 */
function unavailableReason() {
  if (enabled) return null;
  if (DISABLED) return "deshabilitado con DISABLE_TK=1";
  if (initError) return initError;
  return `no se encontro el binario en ${TK_BIN}`;
}

/** @returns {{ enabled: boolean, bin: string, workDir: string, dbPath: string, error: string|null, reason: string|null }} */
function status() {
  return {
    enabled,
    bin: TK_BIN,
    workDir: TK_WORK_DIR,
    dbPath: TK_DB_PATH,
    error: initError,
    reason: unavailableReason(),
  };
}

/**
 * Ejecuta tk esperando JSON en la salida.
 * @param {string[]} args
 * @returns {Promise<object|Array|{error: string}>} El JSON parseado, o { error }.
 */
function runTk(args) {
  if (!enabled) return Promise.resolve({ error: UNAVAILABLE_MESSAGE });
  return new Promise((resolve) => {
    execFile(TK_BIN, buildArgs(args), execOptions(), (err, stdout, stderr) => {
      if (err) return resolve({ error: stderr?.trim() || String(err) });
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ error: "tk devolvio una salida no valida", raw: stdout });
      }
    });
  });
}

/**
 * Ejecuta tk cuando NO devuelve JSON (dep add / dep remove) y el exito solo se
 * puede determinar por el codigo de salida real del proceso.
 * @param {string[]} args
 * @returns {Promise<{ok: true, message: string}|{error: string}>}
 */
function runTkText(args) {
  if (!enabled) return Promise.resolve({ error: UNAVAILABLE_MESSAGE });
  return new Promise((resolve) => {
    execFile(TK_BIN, buildArgs(args), execOptions(), (err, stdout, stderr) => {
      if (err) return resolve({ error: stderr?.trim() || String(err) });
      resolve({ ok: true, message: stdout.trim() });
    });
  });
}

// Colecciones de `show` que contienen tareas completas, no solo {id, title}.
const NESTED_TASK_KEYS = ["children", "blockers", "dependents"];

/**
 * tk no ofrece forma de limpiar `close_reason`: `close` lo escribe y `update`
 * no tiene ninguna bandera para borrarlo (comprobado en su ayuda). Al reabrir
 * con `-s open` la base conserva el motivo anterior, de modo que una tarea
 * abierta puede seguir diciendo "done".
 *
 * La base pertenece a tk y no se toca (D-5). Lo que se hace es no propagar la
 * incoherencia: el motivo solo se presenta cuando la tarea esta cerrada.
 *
 * Muta el objeto recibido, que siempre viene de un `JSON.parse` recien hecho en
 * runTk y por tanto no lo comparte nadie.
 */
function normalizeTask(task) {
  if (!task || typeof task !== "object" || task.error) return task;
  if (task.status !== "done") task.close_reason = null;
  for (const key of NESTED_TASK_KEYS) {
    if (Array.isArray(task[key])) task[key].forEach(normalizeTask);
  }
  return task;
}

/**
 * Listado completo con el estado "blocked" ya aplicado.
 *
 * tk no almacena "blocked": guarda el estado real de la tarea (normalmente
 * "open") y `tk blocked` devuelve las que tienen bloqueantes abiertos. El
 * cruce se hace aqui, en codigo determinista, para no depender de que la
 * interfaz compare dos listas por su cuenta.
 *
 * @returns {Promise<Array|{error: string}>}
 */
async function listTasksMerged() {
  const [all, blocked] = await Promise.all([
    runTk(["--json", "list", "--all"]),
    runTk(["--json", "blocked"]),
  ]);
  if (all?.error) return all;
  const blockedIds = new Set((Array.isArray(blocked) ? blocked : []).map((t) => t.id));
  return all.map((t) => normalizeTask(blockedIds.has(t.id) ? { ...t, status: "blocked" } : t));
}

module.exports = {
  PROJECT_ROOT,
  UNAVAILABLE_MESSAGE,
  status,
  unavailableReason,
  normalizeTask,
  runTk,
  runTkText,
  listTasksMerged,
  TK_DB_PATH,
};
