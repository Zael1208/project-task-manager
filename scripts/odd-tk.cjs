#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_DB = path.join(PROJECT_ROOT, "tk", ".tacks", "tacks.db");
const TK_BIN = process.platform === "win32" ? path.join(PROJECT_ROOT, "tk", "tk.exe") : path.join(PROJECT_ROOT, "tk", "tk");
const MUTATING_COMMANDS = new Set(["create", "update", "close", "comment"]);

const FORBIDDEN_METADATA = [
  /\bsha256:[0-9a-f]{16,64}\b/i,
  /\b(?:commit|branch|head)\b/i,
  /\bgit\s+(?:status|diff|log|show|switch|checkout)\b/i,
  /\b(?:push|merge)\b/i,
  /(?:árbol|tree)\s+(?:limpio|sucio|clean|dirty)/i,
  /\bsin\s+(?:push|merge)\b/i
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

function textValuesForCommand(command, args) {
  if (!MUTATING_COMMANDS.has(command)) return [];
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (["--notes", "-c", "--comment", "-d", "--description"].includes(argument)) {
      if (args[index + 1]) values.push(args[index + 1]);
      index += 1;
    }
  }
  if (["create", "comment"].includes(command) && args.at(-1) && !args.at(-1).startsWith("-")) values.push(args.at(-1));
  return values;
}

function validateCommand(command, args) {
  const findings = findForbiddenMetadata(textValuesForCommand(command, args));
  if (findings.length) {
    return {
      ok: false,
      message: `tk write rejected: Git state is not allowed in tk text (${findings.join(", ")}).`
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
