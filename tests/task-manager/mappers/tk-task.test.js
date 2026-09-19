import { describe, expect, it } from 'vitest';
import { mapTask } from '../../../src/shared/tasks/task-model.js';

describe('mapTask', () => {
  it('supplies stable defaults for incomplete tasks', () => {
    expect(mapTask()).toMatchObject({
      id: '',
      title: '',
      description: '',
      priority: '2',
      status: 'open',
      parentId: null,
      chips: [],
      kind: 'task',
      type: 'Tarea',
      icon: 'T',
      blockers: [],
      dependents: [],
      comments: []
    });
  });

  it('maps parent tasks, subtasks and epics', () => {
    expect(mapTask({ id: 'tk-1', priority: 0 })).toMatchObject({ priority: '0', kind: 'task' });
    expect(mapTask({ id: 'tk-2', parent_id: 'tk-1' })).toMatchObject({ parentId: 'tk-1', kind: 'subtask', type: 'Subtarea', icon: 'S' });
    expect(mapTask({ id: 'tk-3', tags: ['EPIC'] })).toMatchObject({ chips: ['EPIC'], kind: 'epic', type: 'Épica', icon: 'E' });
  });

  it('normalizes relations and comments without leaking raw fields', () => {
    const task = mapTask({
      id: 'tk-1',
      parent_id: 'tk-root',
      tags: ['frontend'],
      blockers: ['tk-2', { parent_id: 'tk-3', title: 'Bloqueante' }],
      dependents: [{ child_id: 'tk-4' }],
      comments: ['Texto', { text: 'Otro', author: 'Ana', created_at: '2026-08-08' }]
    });

    expect(task.blockers).toEqual([
      { id: 'tk-2', title: '' },
      { id: 'tk-3', title: 'Bloqueante' }
    ]);
    expect(task.dependents).toEqual([{ id: 'tk-4', title: '' }]);
    expect(task.comments).toEqual([
      { body: 'Texto', author: '', createdAt: '' },
      { body: 'Otro', author: 'Ana', createdAt: '2026-08-08' }
    ]);
    expect(task).not.toHaveProperty('parent_id');
    expect(task).not.toHaveProperty('tags');
  });
});
