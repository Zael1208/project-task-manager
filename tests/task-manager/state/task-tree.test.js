import { describe, expect, it } from 'vitest';
import { mapTask } from '../../../src/shared/tasks/task-model.js';
import { createWorkspace } from '../helpers/workspace-fixture.js';

const tasks = [
  mapTask({ id: 'tk-1', title: 'Revisión principal', status: 'open', priority: 1, tags: ['frontend'] }),
  mapTask({ id: 'tk-1.1', title: 'Implementar API', parent_id: 'tk-1', status: 'in_progress', priority: 0, tags: ['backend'] }),
  mapTask({ id: 'tk-2', title: 'Documentación', status: 'done', priority: 3, tags: ['docs'] })
];

describe('task-tree state', () => {
  it('calculates hierarchy and only exposes expanded descendants', () => {
    const workspace = createWorkspace({ tasks });

    expect(workspace.mappedTasks.map(({ id, level, children }) => ({ id, level, children }))).toEqual([
      { id: 'tk-1', level: 1, children: true },
      { id: 'tk-1.1', level: 2, children: false },
      { id: 'tk-2', level: 1, children: false }
    ]);
    expect(workspace.visibleTasks.map((task) => task.id)).toEqual(['tk-1', 'tk-2']);

    workspace.toggleExpanded('tk-1');
    expect(workspace.visibleTasks.map((task) => task.id)).toEqual(['tk-1', 'tk-1.1', 'tk-2']);
  });

  it('normalizes search and combines status, priority and tag filters', () => {
    const workspace = createWorkspace({
      tasks,
      taskSearchQuery: 'revision',
      advancedStatuses: ['open'],
      advancedPriorities: ['1'],
      advancedTags: ['frontend']
    });

    expect([...workspace.filteredTaskIds]).toEqual(['tk-1']);
    expect(workspace.visibleTasks.map((task) => task.id)).toEqual(['tk-1']);
  });

  it('shows tasks that form a parent cycle instead of hiding them', () => {
    const cyclic = [
      mapTask({ id: 'tk-a', title: 'A', parent_id: 'tk-b' }),
      mapTask({ id: 'tk-b', title: 'B', parent_id: 'tk-a' })
    ];
    const workspace = createWorkspace({ tasks: cyclic });

    // Ninguna de las dos es raiz, asi que antes del arreglo el recorrido no
    // empezaba y las dos desaparecian del listado sin ningun error.
    expect(workspace.visibleTasks.map((task) => task.id)).toEqual(['tk-a', 'tk-b']);
  });

  it('expands and collapses every parent task', () => {
    const workspace = createWorkspace({ tasks });

    workspace.setAllExpanded(true);
    expect(workspace.expandedIds).toEqual(['tk-1']);
    workspace.setAllExpanded(false);
    expect(workspace.expandedIds).toEqual([]);
  });
});
