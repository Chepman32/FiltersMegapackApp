import { createNeutralFilterStack } from '../src/filters/recipe';
import { useStudioStore } from '../src/store/useStudioStore';

function resetStore() {
  useStudioStore.setState({
    currentAsset: null,
    previewUri: null,
    filterStack: createNeutralFilterStack(),
    selectedCategoryId: 'cinematic',
    filterHistoryPast: [],
    filterHistoryFuture: [],
    canUndo: false,
    canRedo: false,
    favorites: [],
    recents: [],
    mixes: [],
    onboardingSeen: false,
    language: 'en',
    performanceMode: true,
    projects: [],
    folders: [],
    homeProjects: {
      allProjects: [],
      foldersWithProjects: [],
      trashProjects: [],
    },
    activeProjectId: null,
  });
}

describe('studio store editor behavior', () => {
  beforeEach(() => {
    resetStore();
  });

  it('restores the previous filter category on undo after cross-category selection', () => {
    const store = useStudioStore.getState();

    store.setCategory('cinematic');
    store.setFilter('cinematic-1');
    store.setCategory('neon');
    store.setFilter('neon-1');

    expect(useStudioStore.getState().selectedCategoryId).toBe('neon');

    store.undoFilterChange();

    expect(useStudioStore.getState().filterStack.filterId).toBe('cinematic-1');
    expect(useStudioStore.getState().selectedCategoryId).toBe('cinematic');
  });

  it('saves and reapplies mixes built from up to four filters', () => {
    const store = useStudioStore.getState();

    store.toggleMixMode();
    store.setFilter('cinematic-1');
    store.setFilter('neon-1');
    store.setFilter('film-1');

    const savedMix = useStudioStore.getState().saveCurrentMix();

    expect(savedMix).not.toBeNull();
    expect(useStudioStore.getState().mixes).toHaveLength(1);
    expect(savedMix?.filterStack.mixFilterIds).toEqual([
      'cinematic-1',
      'neon-1',
      'film-1',
    ]);

    useStudioStore.getState().resetFilterStack();
    useStudioStore.getState().applyMix(savedMix?.id ?? '');

    expect(useStudioStore.getState().filterStack.mixEnabled).toBe(true);
    expect(useStudioStore.getState().filterStack.mixFilterIds).toEqual([
      'cinematic-1',
      'neon-1',
      'film-1',
    ]);
    expect(useStudioStore.getState().selectedCategoryId).toBe('film');
  });
});
