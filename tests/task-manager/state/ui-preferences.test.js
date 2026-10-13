import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI_PREFERENCES_STORAGE_KEY } from '../../../src/task-manager/state/workspace-data.js';
import { createWorkspace } from '../helpers/workspace-fixture.js';

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key, nextValue) => { value = nextValue; }),
    read() {
      return value;
    }
  };
}

function withStorage(workspace, storage) {
  workspace.getUiPreferencesStorage = () => storage;
  return workspace;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('persistencia de preferencias de interfaz', () => {
  it('guarda y restaura solo las preferencias permitidas', () => {
    const storage = createStorage();
    const source = withStorage(createWorkspace({
      activeTaskFilter: 'current',
      currentPeriod: 'month',
      activeInspectorTab: 'comments',
      selectedTaskId: 'tk-4',
      advancedStatuses: ['blocked'],
      advancedPriorities: ['0'],
      advancedTags: ['frontend'],
      quickTagFilter: 'frontend',
      taskSearchQuery: 'roadmap',
      expandedIds: ['tk-1'],
      collapsedIds: ['tk-2'],
      areTaskChipsVisible: false,
      errorMessage: 'no guardar',
      detail: { id: 'tk-4' }
    }), storage);

    source.persistUiPreferences();
    const saved = JSON.parse(storage.read());
    const restored = withStorage(createWorkspace(), storage);

    expect(storage.setItem).toHaveBeenCalledWith(UI_PREFERENCES_STORAGE_KEY, expect.any(String));
    expect(saved).toEqual({
      version: 1,
      activeTaskFilter: 'current',
      currentPeriod: 'month',
      activeInspectorTab: 'comments',
      selectedTaskId: 'tk-4',
      advancedStatuses: ['blocked'],
      advancedPriorities: ['0'],
      advancedTags: ['frontend'],
      quickTagFilter: 'frontend',
      taskSearchQuery: 'roadmap',
      expandedIds: ['tk-1'],
      collapsedIds: ['tk-2'],
      areTaskChipsVisible: false
    });

    expect(restored.restoreUiPreferences()).toBe(true);
    expect(restored).toMatchObject({
      activeTaskFilter: 'current',
      currentPeriod: 'month',
      activeInspectorTab: 'comments',
      selectedTaskId: 'tk-4',
      advancedStatuses: ['blocked'],
      advancedPriorities: ['0'],
      advancedTags: ['frontend'],
      quickTagFilter: 'frontend',
      taskSearchQuery: 'roadmap',
      expandedIds: ['tk-1'],
      collapsedIds: ['tk-2'],
      areTaskChipsVisible: false
    });
  });

  it('mantiene los valores iniciales sin almacenamiento disponible', () => {
    const workspace = createWorkspace({ currentPeriod: 'year' });
    workspace.getUiPreferencesStorage = () => null;

    expect(workspace.restoreUiPreferences()).toBe(false);
    expect(() => workspace.persistUiPreferences()).not.toThrow();
    expect(workspace.currentPeriod).toBe('year');
  });

  it('descarta JSON corrupto, versiones desconocidas y campos inválidos', () => {
    const invalidState = JSON.stringify({
      version: 1,
      activeTaskFilter: 'unknown',
      currentPeriod: 'tomorrow',
      activeInspectorTab: 3,
      selectedTaskId: 42,
      advancedStatuses: ['open', 'unknown', 2],
      advancedPriorities: ['1', 4],
      advancedTags: ['frontend', null],
      quickTagFilter: 7,
      taskSearchQuery: null,
      expandedIds: ['parent', 3],
      collapsedIds: ['parent', 'child'],
      areTaskChipsVisible: 'yes'
    });
    const storage = createStorage(invalidState);
    const workspace = withStorage(createWorkspace({ selectedTaskId: 'default' }), storage);

    expect(workspace.restoreUiPreferences()).toBe(true);
    expect(workspace).toMatchObject({
      activeTaskFilter: 'all',
      currentPeriod: 'today',
      activeInspectorTab: 'detail',
      selectedTaskId: '',
      advancedStatuses: ['open'],
      advancedPriorities: ['1'],
      advancedTags: ['frontend'],
      quickTagFilter: '',
      taskSearchQuery: '',
      expandedIds: ['parent'],
      collapsedIds: ['child'],
      areTaskChipsVisible: true
    });

    storage.getItem.mockReturnValue('{not-json');
    expect(workspace.restoreUiPreferences()).toBe(false);
    storage.getItem.mockReturnValue(JSON.stringify({ version: 99 }));
    expect(workspace.restoreUiPreferences()).toBe(false);
  });

  it('agrupa las escrituras rápidas mediante debounce y tolera fallos de escritura', () => {
    vi.useFakeTimers();
    const storage = createStorage();
    const workspace = withStorage(createWorkspace({ taskSearchQuery: 'uno' }), storage);

    workspace.scheduleUiPreferencesPersistence();
    workspace.taskSearchQuery = 'dos';
    workspace.scheduleUiPreferencesPersistence();
    vi.advanceTimersByTime(149);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(storage.setItem).toHaveBeenCalledOnce();

    storage.setItem.mockImplementation(() => { throw new Error('storage blocked'); });
    expect(() => workspace.persistUiPreferences()).not.toThrow();
  });

  it('retira filtros de etiquetas que ya no existen tras cargar el catálogo', () => {
    const workspace = createWorkspace({
      advancedTags: ['frontend', 'deleted'],
      quickTagFilter: 'deleted'
    });

    workspace.reconcileUiPreferences([{ name: 'frontend' }]);

    expect(workspace.advancedTags).toEqual(['frontend']);
    expect(workspace.quickTagFilter).toBe('');
  });
});
