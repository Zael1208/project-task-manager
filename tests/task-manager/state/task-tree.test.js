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
    expect(workspace.hasAdvancedFilters).toBe(true);

    workspace.clearAdvancedFilters();
    expect(workspace.hasAdvancedFilters).toBe(false);
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

  it('expands and collapses parent tasks in every status tab', () => {
    const statuses = ['open', 'in_progress', 'blocked', 'done'];
    const statusTasks = statuses.flatMap((status) => [
      mapTask({ id: `parent-${status}`, title: `Padre ${status}`, status }),
      mapTask({ id: `child-${status}`, title: `Hija ${status}`, parent_id: `parent-${status}`, status })
    ]);

    for (const status of statuses) {
      const workspace = createWorkspace({ tasks: statusTasks, activeTaskFilter: status });

      workspace.setAllExpanded(true);
      expect(workspace.visibleTasks.map((task) => task.id)).toContain(`child-${status}`);
      workspace.toggleExpanded(`parent-${status}`);
      expect(workspace.visibleTasks.map((task) => task.id)).toEqual([`parent-${status}`]);
    }
  });

  it('filtra Actuales por creación o actualización y respeta los límites locales del periodo', () => {
    const reference = new Date(2026, 9, 14, 12, 0, 0);
    const iso = (year, month, day, hour = 12) => new Date(year, month - 1, day, hour, 0, 0).toISOString();
    const periodTasks = [
      mapTask({ id: 'created-today', created_at: iso(2026, 10, 14, 9), updated_at: iso(2026, 10, 14, 9) }),
      mapTask({ id: 'updated-today', created_at: iso(2026, 10, 1), updated_at: iso(2026, 10, 14, 10) }),
      mapTask({ id: 'week-only', created_at: iso(2026, 10, 12), updated_at: iso(2026, 10, 12) }),
      mapTask({ id: 'month-only', created_at: iso(2026, 10, 2), updated_at: iso(2026, 10, 2) }),
      mapTask({ id: 'year-only', created_at: iso(2026, 2, 1), updated_at: iso(2026, 2, 1) }),
      mapTask({ id: 'outside', created_at: iso(2025, 12, 31), updated_at: iso(2025, 12, 31) })
    ];
    const workspace = createWorkspace({
      tasks: periodTasks,
      activeTaskFilter: 'current',
      currentPeriod: 'today',
      currentPeriodNow: reference
    });

    expect([...workspace.filteredTaskIds]).toEqual(['created-today', 'updated-today']);
    workspace.currentPeriod = 'week';
    expect([...workspace.filteredTaskIds]).toEqual(['created-today', 'updated-today', 'week-only']);
    workspace.currentPeriod = 'month';
    expect([...workspace.filteredTaskIds]).toEqual(['created-today', 'updated-today', 'week-only', 'month-only']);
    workspace.currentPeriod = 'year';
    expect([...workspace.filteredTaskIds]).toEqual([
      'created-today', 'updated-today', 'week-only', 'month-only', 'year-only'
    ]);
  });

  it('conserva expansión y selección del inspector al cambiar el periodo actual', () => {
    const parent = mapTask({
      id: 'parent',
      title: 'Padre',
      created_at: '2026-10-14T09:00:00.000000000Z',
      updated_at: '2026-10-14T09:00:00.000000000Z'
    });
    const child = mapTask({
      id: 'child',
      title: 'Hija',
      parent_id: 'parent',
      created_at: '2026-10-14T10:00:00.000000000Z',
      updated_at: '2026-10-14T10:00:00.000000000Z'
    });
    const workspace = createWorkspace({
      tasks: [parent, child],
      activeTaskFilter: 'current',
      currentPeriod: 'today',
      currentPeriodNow: new Date('2026-10-14T12:00:00Z'),
      selectedTaskId: 'parent',
      detail: parent,
      expandedIds: ['parent']
    });

    workspace.currentPeriod = 'month';

    expect(workspace.expandedIds).toEqual(['parent']);
    expect(workspace.selectedTaskId).toBe('parent');
    expect(workspace.selectedTask.title).toBe('Padre');
    expect(workspace.visibleTasks.map((task) => task.id)).toEqual(['parent', 'child']);
  });
});
