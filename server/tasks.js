"use strict";

// Handlers de /api/tk/*. Extraidos del servidor de ChatVoiceAgent, donde
// vivian mezclados con chat, voz y memoria.
//
// Contrato que NO se puede romper: los errores de tk se comunican con estado
// HTTP 200 y cuerpo { error }. El cliente considera error tanto !response.ok
// como la presencia de data.error.

const { sendJson, readJson } = require("./http");
const { runTk, runTkText, listTasksMerged } = require("./tk");
const { normalizeTagName, sameTagName } = require("./tags");

/** tk no devuelve JSON si falla: se traduce a 200 + { error }, como el original. */
function sendTkResult(res, result) {
  if (result?.error) return sendJson(res, 200, { error: result.error });
  return sendJson(res, 200, result);
}

// --- Lectura -----------------------------------------------------------------

async function handleTkShow(req, res, id) {
  if (!id) return sendJson(res, 400, { error: "Falta el id." });
  sendTkResult(res, await runTk(["--json", "show", id]));
}

async function handleTkActiveCount(req, res) {
  const all = await runTk(["--json", "list", "--all"]);
  if (all?.error) return sendJson(res, 200, { count: 0, error: all.error });
  sendJson(res, 200, { count: all.filter((t) => t.status !== "done").length });
}

async function handleTkList(req, res) {
  sendJson(res, 200, await listTasksMerged());
}

async function handleTkStats(req, res) {
  sendJson(res, 200, await runTk(["--json", "stats"]));
}

async function handleTkReady(req, res) {
  sendJson(res, 200, await runTk(["--json", "ready"]));
}

async function handleTkEpic(req, res) {
  sendJson(res, 200, await runTk(["--json", "epic"]));
}

async function handleTkBlocked(req, res) {
  sendJson(res, 200, await runTk(["--json", "blocked"]));
}

async function handleTkChildren(req, res, id) {
  if (!id) return sendJson(res, 400, { error: "Falta el id." });
  sendJson(res, 200, await runTk(["--json", "children", id]));
}

// --- Escritura ---------------------------------------------------------------

async function handleTkCreate(req, res) {
  const input = await readJson(req, res);
  if (!input) return;
  if (!input.title) return sendJson(res, 400, { error: "Falta el titulo." });

  const args = ["--json", "create", input.title];
  if (input.priority != null) args.push("-p", String(input.priority));
  if (input.description) args.push("-d", input.description);
  if (Array.isArray(input.tags) && input.tags.length) args.push("-t", input.tags.join(","));
  if (input.parent) args.push("--parent", input.parent);

  sendTkResult(res, await runTk(args));
}

async function handleTkClose(req, res) {
  const input = await readJson(req, res);
  if (!input) return;
  if (!input.id) return sendJson(res, 400, { error: "Falta el id." });

  const args = ["--json", "close", input.id];
  if (input.reason) args.push("-r", input.reason);
  if (input.comment) args.push("-c", input.comment);

  // Si tk rechaza el cierre (por ejemplo, subtareas abiertas), el error se
  // devuelve tal cual. Nunca se reintenta con --force por cuenta propia.
  sendTkResult(res, await runTk(args));
}

async function handleTkUpdate(req, res) {
  const input = await readJson(req, res);
  if (!input) return;
  if (!input.id) return sendJson(res, 400, { error: "Falta el id." });

  const changes = input.changes || {};

  // Las etiquetas se envian de forma diferencial: tk solo sabe anadir y
  // quitar, no reemplazar. Se compara con el estado real para calcular que
  // sobra y que falta.
  let tagsToAdd = [];
  let tagsToRemove = [];
  if (Array.isArray(changes.tags)) {
    const current = await runTk(["--json", "show", input.id]);
    if (current?.error) return sendTkResult(res, current);

    const requestedTags = changes.tags
      .map(normalizeTagName)
      .filter(Boolean)
      .filter((tag, index, values) => !values.slice(0, index).some((other) => sameTagName(other, tag)));
    const currentTags = Array.isArray(current.tags) ? current.tags : [];
    tagsToAdd = requestedTags.filter((tag) => !currentTags.some((currentTag) => sameTagName(currentTag, tag)));
    tagsToRemove = currentTags.filter((currentTag) => !requestedTags.some((requestedTag) => sameTagName(requestedTag, currentTag)));
  }

  const args = ["--json", "update", input.id];
  if (changes.title) args.push("--title", changes.title);
  if (changes.priority != null) args.push("-p", String(changes.priority));
  if (changes.status) args.push("-s", changes.status);
  if (changes.description != null) args.push("-d", changes.description);
  if (changes.notes != null) args.push("--notes", changes.notes);
  if (changes.parent != null) args.push("--parent", changes.parent || "none");
  if (changes.claim) args.push("--claim");
  else if (changes.assignee != null) args.push("--assignee", changes.assignee || "");
  if (tagsToAdd.length) args.push("--add-tags", tagsToAdd.join(","));
  if (tagsToRemove.length) args.push("--remove-tags", tagsToRemove.join(","));

  sendTkResult(res, await runTk(args));
}

/**
 * @param {"add"|"remove"} action
 */
async function handleTkDep(req, res, action) {
  const input = await readJson(req, res);
  if (!input) return;
  if (!input.child_id || !input.parent_id) {
    return sendJson(res, 400, { error: "Falta child_id o parent_id." });
  }

  // runTkText, no runTk: "dep add/remove" no devuelven JSON ni con --json.
  const result = await runTkText(["dep", action, input.child_id, input.parent_id]);
  if (result?.error) return sendJson(res, 200, { error: result.error });

  sendJson(res, 200, {
    ok: true,
    message: result.message,
    child_id: input.child_id,
    parent_id: input.parent_id,
  });
}

async function handleTkComment(req, res) {
  const input = await readJson(req, res);
  if (!input) return;
  if (!input.id || !input.body) return sendJson(res, 400, { error: "Falta id o body." });
  sendTkResult(res, await runTk(["--json", "comment", input.id, input.body]));
}

module.exports = {
  handleTkShow,
  handleTkActiveCount,
  handleTkList,
  handleTkStats,
  handleTkReady,
  handleTkEpic,
  handleTkBlocked,
  handleTkChildren,
  handleTkCreate,
  handleTkClose,
  handleTkUpdate,
  handleTkDep,
  handleTkComment,
};
