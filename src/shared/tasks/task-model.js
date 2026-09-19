export const STATUS_LABELS = {
  open: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecha',
  blocked: 'Bloqueada'
};

export const PRIORITY_LABELS = ['Crítica', 'Alta', 'Media', 'Baja'];

export const statusLabel = (status) => STATUS_LABELS[status] || status || 'Sin estado';
export const priorityLabel = (priority) => PRIORITY_LABELS[Number(priority)] || 'Sin prioridad';
export const statusBadgeClass = (status) => ({
  open: 'tk-badge--warning',
  in_progress: 'tk-badge--info',
  done: 'tk-badge--success',
  blocked: 'tk-badge--danger'
}[status] || 'tk-badge--neutral');

export function mapTask(task = {}) {
  const chips = Array.isArray(task.tags) ? task.tags : (Array.isArray(task.chips) ? task.chips : []);
  const parentId = task.parent_id || task.parentId || null;
  const epic = chips.some((tag) => tag.toLocaleLowerCase('es') === 'epic');
  const { parent_id: _parentId, tags: _tags, blockers = [], dependents = [], comments = [], ...rest } = task;

  return {
    ...rest,
    id: task.id || '',
    title: task.title || '',
    description: task.description || '',
    priority: String(task.priority ?? 2),
    status: task.status || 'open',
    parentId,
    chips,
    kind: epic ? 'epic' : (parentId ? 'subtask' : 'task'),
    type: epic ? 'Épica' : (parentId ? 'Subtarea' : 'Tarea'),
    icon: epic ? 'E' : (parentId ? 'S' : 'T'),
    blockers: blockers.map((blocker) => mapRelation(blocker, 'parent_id')),
    dependents: dependents.map((dependent) => mapRelation(dependent, 'child_id')),
    comments: comments.map(mapComment)
  };
}

function mapRelation(relation, fallbackId) {
  if (typeof relation === 'string') return { id: relation, title: '' };
  return { id: relation?.id || relation?.[fallbackId] || '', title: relation?.title || '' };
}

function mapComment(comment) {
  if (typeof comment === 'string') return { body: comment, author: '', createdAt: '' };
  return {
    body: comment?.body || comment?.text || '',
    author: comment?.author || '',
    createdAt: comment?.created_at || comment?.createdAt || ''
  };
}
