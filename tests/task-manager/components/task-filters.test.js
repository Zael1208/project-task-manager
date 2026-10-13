// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskFilters } from '../../../src/task-manager/components/task-filters.js';
import { mount, resetDom } from '../helpers/mount.js';

afterEach(resetDom);

function mountFilters(overrides = {}) {
  return mount(TaskFilters, {
    unavailable: false,
    errorMessage: '',
    refreshing: false,
    taskSearchQuery: '',
    advancedFiltersOpen: true,
    hasAdvancedFilters: true,
    advancedStatuses: [],
    advancedPriorities: [],
    advancedTags: [],
    tagCatalog: [{ name: 'frontend' }],
    activeTaskFilter: 'all',
    currentPeriod: 'today',
    quickTagFilter: '',
    taskChipsVisible: true,
    visibleCount: 1,
    listMenuOpen: true,
    tagColor: () => '#ffffff',
    ...overrides
  });
}

describe('TaskFilters', () => {
  it('expone tooltips en los botones del selector', () => {
    const { container } = mountFilters();

    expect(container.querySelector('button[aria-label="Filtros"]').title).toBe('Mostrar filtros avanzados');
    expect(container.querySelector('button[aria-label="Opciones del listado"]').title).toBe('Opciones del listado');
    expect(container.querySelector('.tk-dropdown__item:nth-child(1)').title).toBe('Expandir todas las tareas');
    expect(container.querySelector('.tk-dropdown__item:nth-child(2)').title).toBe('Plegar todas las tareas');
    expect(container.querySelector('button[aria-label="Cerrar filtros"]').title).toBe('Cerrar filtros');
    expect(container.querySelector('.task-filter-clear').title).toBe('Limpiar filtros');
    expect([...container.querySelectorAll('.task-filter-tabs button')].map((button) => button.title)).toEqual([
      'Todas', 'Actuales', 'Pendientes', 'En curso', 'Bloqueadas', 'Hechas'
    ]);
    expect([...container.querySelectorAll('.current-period-tabs button')].map((button) => button.title)).toEqual([
      'Hoy', 'Semana', 'Mes', 'Año'
    ]);
    expect(container.querySelector('.current-period-tabs button[aria-pressed="true"]').title).toBe('Hoy');
    expect(container.querySelector('button[aria-label="Mostrar u ocultar etiquetas"]').title).toBe('Mostrar u ocultar etiquetas');
  });

  it('emite la pestaña y el periodo elegidos con selección accesible', () => {
    const updateFilter = vi.fn();
    const updatePeriod = vi.fn();
    const { container } = mountFilters({
      activeTaskFilter: 'current',
      currentPeriod: 'week',
      onUpdateActiveFilter: updateFilter,
      onUpdateCurrentPeriod: updatePeriod
    });

    expect(container.querySelector('.task-filter-tabs button[aria-selected="true"]').title).toBe('Actuales');
    expect([...container.querySelectorAll('.current-period-tabs button[aria-pressed="true"]')]).toHaveLength(1);
    expect(container.querySelector('.current-period-tabs button[aria-pressed="true"]').title).toBe('Semana');

    container.querySelector('.task-filter-tabs button[title="Todas"]').click();
    container.querySelector('.current-period-tabs button[title="Mes"]').click();

    expect(updateFilter).toHaveBeenCalledWith('all');
    expect(updatePeriod).toHaveBeenCalledWith('month');
  });
});
