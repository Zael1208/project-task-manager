/** Error normalizado que permite distinguir una capacidad TK deshabilitada. */
export class ApiError extends Error {
  /**
   * @param {string} message Mensaje seguro para presentar al usuario.
   * @param {boolean} unavailable La capacidad TK no existe en este anfitrion.
   */
  constructor(message, unavailable = false) {
    super(message);
    this.name = 'ApiError';
    this.unavailable = unavailable;
  }
}

/**
 * Frontera comun de transporte. Tambien trata `{ error }` con HTTP 200 como
 * fallo porque varios endpoints TK comunican asi errores del proceso hijo.
 *
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<*>} JSON ya validado por transporte, no por dominio.
 * @throws {ApiError}
 */
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    throw new ApiError(error?.message || 'No se pudo conectar con el servidor.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('El servidor devolvió una respuesta no válida.', response.status === 404);
  }

  if (!response.ok || data?.error) {
    const unavailable = response.status === 404 && String(data?.error || '').includes('capacidad de tareas no esta disponible');
    throw new ApiError(data?.error || `La operación falló (${response.status}).`, unavailable);
  }
  return data;
}

function jsonRequest(path, method, body) {
  return apiRequest(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export const listTasks = () => apiRequest('/api/tk/list');
export const listTags = () => apiRequest('/api/tags');
export const showTask = (id) => apiRequest(`/api/tk/show/${encodeURIComponent(id)}`);
export const createTask = (task) => jsonRequest('/api/tk/create', 'POST', task);
export const updateTask = (id, changes) => jsonRequest('/api/tk/update', 'POST', { id, changes });
export const closeTask = (id) => jsonRequest('/api/tk/close', 'POST', { id, reason: 'done' });
export const addTaskDependency = (childId, parentId) => jsonRequest('/api/tk/dep', 'POST', { child_id: childId, parent_id: parentId });
export const removeTaskDependency = (childId, parentId) => jsonRequest('/api/tk/dep-remove', 'POST', { child_id: childId, parent_id: parentId });
export const addTaskComment = (id, body) => jsonRequest('/api/tk/comment', 'POST', { id, body });
export const createTag = (tag) => jsonRequest('/api/tags', 'POST', tag);
export const updateTag = (name, tag) => jsonRequest(`/api/tags/${encodeURIComponent(name)}`, 'PUT', tag);
export const deleteTag = (name) => jsonRequest(`/api/tags/${encodeURIComponent(name)}`, 'DELETE');
