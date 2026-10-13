// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { TaskFilters } from '../../../src/task-manager/components/task-filters.js';
import { mount, resetDom } from '../helpers/mount.js';

afterEach(resetDom);

function mountFilters() {
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
    quickTagFilter: '',
    taskChipsVisible: true,
    visibleCount: 1,
    listMenuOpen: true,
    tagColor: () => '#ffffff'
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
      'Todas', 'Pendientes', 'En curso', 'Bloqueadas', 'Hechas'
    ]);
    expect(container.querySelector('button[aria-label="Mostrar u ocultar etiquetas"]').title).toBe('Mostrar u ocultar etiquetas');
  });
});
