#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_DB = path.join(PROJECT_ROOT, "tk", ".tacks", "tacks.db");
const TK_BIN = process.platform === "win32" ? path.join(PROJECT_ROOT, "tk", "tk.exe") : path.join(PROJECT_ROOT, "tk", "tk");
const MUTATING_COMMANDS = new Set(["create", "update", "close", "comment"]);

const FORBIDDEN_METADATA = [
  // Estado de Git: vive en Git.
  /\bsha256:[0-9a-f]{16,64}\b/i,
  /\b(?:commit|branch|head)\b/i,
  /\bgit\s+(?:status|diff|log|show|switch|checkout)\b/i,
  /\b(?:push|merge)\b/i,
  /(?:árbol|tree)\s+(?:limpio|sucio|clean|dirty)/i,
  /\bsin\s+(?:push|merge)\b/i,
  // Estado del proceso de revisión: vive en el almacén del revisor.
  /\brdd\b/i,
  /\blineage\b|review-[0-9a-f]{4,}/i,
  /lens_context_budget\w*/i,
  /correction_required|captured_lens|verdict|veredicto/i,
  /presupuesto\s+(?:de\s+contexto|nativo)/i,
  /\bcandidat\w+/i,
  // Residuos de la limpieza anterior de estado de Git.
  /unidad de trabajo|completad[ao] en\./i,
  // Métricas: el tablero no es un documento, y ya lleva su propia marca de
  // tiempo, así que un recuento, un ratio o una fecha no aportan nada.
  /(?<![\d.,])\d+\s*(?:pruebas|ficheros|archivos|tareas|comentarios|campos|filas|l[ií]neas|lineas|endpoints|rutas)\b/i,
  /\b\d{1,3}\/\d{1,3}\b(?![\/\d])/,
  // Rutas ajenas al proyecto o efímeras.
  /\/tmp\/|[A-Za-z]:\\|app\.asar/
];

function findForbiddenMetadata(values) {
  const findings = [];
  for (const value of values) {
    for (const pattern of FORBIDDEN_METADATA) {
      const match = String(value).match(pattern);
      if (match) findings.push(match[0]);
    }
  }
  return [...new Set(findings)];
}

// El título de una tarea y el cuerpo de un comentario son posicionales, no
// opciones: si no se miran, el estado prohibido entra por ellos.
const OPTIONS_WITH_VALUE = [
  "--notes", "-c", "--comment", "-d", "--description", "--title",
  "-p", "--priority", "-t", "--tags", "--parent", "--assignee",
  "--add-tags", "--remove-tags", "--status"
];
const TEXT_OPTIONS = ["--notes", "-c", "--comment", "-d", "--description", "--title"];

function textValuesForCommand(command, args) {
  if (!MUTATING_COMMANDS.has(command)) return [];
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (OPTIONS_WITH_VALUE.includes(argument)) {
      if (TEXT_OPTIONS.includes(argument) && args[index + 1]) values.push(args[index + 1]);
      index += 1;
      continue;
    }
    if (!argument.startsWith("-")) values.push(argument);
  }
  return values;
}

function validateCommand(command, args) {
  const findings = findForbiddenMetadata(textValuesForCommand(command, args));
  if (findings.length) {
    return {
      ok: false,
      message: `tk write rejected: repository or review state is not allowed in tk text (${findings.join(", ")}).`
    };
  }
  return { ok: true, message: "" };
}

function run(argv = process.argv.slice(2), env = process.env) {
  const [command, ...args] = argv;
  if (!command) {
    console.error("Usage: node scripts/odd-tk.cjs <tk-command> [args]");
    return 64;
  }

  const validation = validateCommand(command, args);
  if (!validation.ok) {
    console.error(validation.message);
    return 64;
  }

  const dbPath = env.TACKS_DB || DEFAULT_DB;
  const result = spawnSync(TK_BIN, ["--db", dbPath, "--json", command, ...args], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    windowsHide: true
  });
  if (result.error) {
    console.error(`tk unavailable: ${result.error.message}`);
    return 127;
  }
  return result.status ?? 1;
}

if (require.main === module) process.exit(run());

module.exports = { findForbiddenMetadata, textValuesForCommand, validateCommand, run };
