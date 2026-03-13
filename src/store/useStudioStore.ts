import { create } from 'zustand';
import type { FolderDocument, FolderWithProjects } from '../types/folder';
import type {
  FilterCategoryId,
  FilterMixDocument,
  FilterStack,
} from '../types/filter';
import type { MediaAssetRef } from '../types/media';
import type { ProjectDocument } from '../types/project';
import {
  NONE_FILTER_ID,
  createDefaultFilterStack,
  createNeutralFilterStack,
  getActiveFilterIds,
  normalizeFilterStack,
} from '../filters/recipe';
import { getFilterById } from '../filters/filterCatalog';
import { readJSON, writeJSON } from './storage';
import {
  createFolder as insertFolder,
  getFolder,
  getProject,
  listFolders,
  listProjects,
  removeFolder as deleteFolder,
  removeProject as deleteProject,
  renameFolder as renameFolderRecord,
  upsertProject,
} from '../db/projectRepository';
import { createId } from '../utils/id';

const FAVORITES_KEY = 'favorites';
const RECENTS_KEY = 'recents';
const ONBOARDING_KEY = 'onboardingSeen';
const LANGUAGE_KEY = 'language';
const MIXES_KEY = 'mixes';
const PERFORMANCE_KEY = 'performanceMode';
const AUTOSAVE_DEBOUNCE_MS = 420;
const UNTITLED_PROJECT_TITLE = 'Untitled Project';

interface FilterChangeOptions {
  trackHistory?: boolean;
}

interface CurrentAssetOptions {
  resetProject?: boolean;
}

interface HomeProjectsState {
  allProjects: ProjectDocument[];
  foldersWithProjects: Array<FolderWithProjects<ProjectDocument>>;
  trashProjects: ProjectDocument[];
}

interface HistorySnapshot {
  filterStack: FilterStack;
  selectedCategoryId: FilterCategoryId;
}

interface StudioState {
  currentAsset: MediaAssetRef | null;
  previewUri: string | null;
  filterStack: FilterStack;
  selectedCategoryId: FilterCategoryId;
  filterHistoryPast: HistorySnapshot[];
  filterHistoryFuture: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  favorites: string[];
  recents: string[];
  mixes: FilterMixDocument[];
  onboardingSeen: boolean;
  language: 'en' | 'ru';
  performanceMode: boolean;
  projects: ProjectDocument[];
  folders: FolderDocument[];
  homeProjects: HomeProjectsState;
  activeProjectId: string | null;
  setCurrentAsset: (asset: MediaAssetRef | null, options?: CurrentAssetOptions) => void;
  setPreviewUri: (uri: string | null) => void;
  setCategory: (categoryId: FilterCategoryId) => void;
  setFilter: (filterId: string, options?: FilterChangeOptions) => void;
  toggleMixMode: () => void;
  setIntensity: (intensity: number, options?: FilterChangeOptions) => void;
  setParameter: (id: string, value: number, options?: FilterChangeOptions) => void;
  resetFilterStack: (options?: FilterChangeOptions) => void;
  commitFilterHistory: (previousStack: FilterStack) => void;
  undoFilterChange: () => void;
  redoFilterChange: () => void;
  toggleFavorite: (filterId: string) => void;
  clearRecents: () => void;
  setOnboardingSeen: (value: boolean) => void;
  setLanguage: (value: 'en' | 'ru') => void;
  setPerformanceMode: (value: boolean) => void;
  refreshProjects: () => void;
  createOrUpdateProject: (title?: string) => ProjectDocument | null;
  openProject: (projectId: string) => ProjectDocument | null;
  createFolder: (name: string) => FolderDocument | null;
  renameFolder: (folderId: string, name: string) => FolderDocument | null;
  removeFolder: (folderId: string) => void;
  renameProject: (projectId: string, title: string) => ProjectDocument | null;
  duplicateProject: (projectId: string) => ProjectDocument | null;
  moveProjectToFolder: (
    projectId: string,
    folderId: string | null,
  ) => ProjectDocument | null;
  trashProject: (projectId: string) => ProjectDocument | null;
  recoverProject: (projectId: string) => ProjectDocument | null;
  removeProjectPermanently: (projectId: string) => void;
  cleanTrash: () => void;
  saveCurrentMix: () => FilterMixDocument | null;
  applyMix: (mixId: string) => FilterMixDocument | null;
  scheduleAutosave: () => void;
  flushAutosave: () => ProjectDocument | null;
}

const initialFilterStack = createDefaultFilterStack();

const initialFavorites = readJSON<string[]>(FAVORITES_KEY, []);
const initialRecents = readJSON<string[]>(RECENTS_KEY, []);
const initialLanguage = readJSON<'en' | 'ru'>(LANGUAGE_KEY, 'en');
const initialMixes = loadMixes();
const initialPerformance = readJSON<boolean>(PERFORMANCE_KEY, true);
const EMPTY_HOME_PROJECTS: HomeProjectsState = {
  allProjects: [],
  foldersWithProjects: [],
  trashProjects: [],
};

let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

function cloneFilterStack(stack: FilterStack): FilterStack {
  const normalizedStack = normalizeFilterStack(stack);
  return {
    ...normalizedStack,
    mixFilterIds: [...normalizedStack.mixFilterIds],
    parameterValues: {
      ...normalizedStack.parameterValues,
    },
  };
}

function sameParameterValues(
  left: FilterStack['parameterValues'],
  right: FilterStack['parameterValues'],
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every(key => left[key] === right[key]);
}

function sameFilterStack(left: FilterStack, right: FilterStack) {
  const normalizedLeft = normalizeFilterStack(left);
  const normalizedRight = normalizeFilterStack(right);
  return (
    normalizedLeft.filterId === normalizedRight.filterId &&
    normalizedLeft.mixEnabled === normalizedRight.mixEnabled &&
    normalizedLeft.mixFilterIds.length === normalizedRight.mixFilterIds.length &&
    normalizedLeft.mixFilterIds.every(
      (filterId, index) => filterId === normalizedRight.mixFilterIds[index],
    ) &&
    normalizedLeft.intensity === normalizedRight.intensity &&
    sameParameterValues(
      normalizedLeft.parameterValues,
      normalizedRight.parameterValues,
    )
  );
}

function sameAssets(left: MediaAssetRef[], right: MediaAssetRef[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameProjectData(left: ProjectDocument, right: ProjectDocument) {
  return (
    left.title === right.title &&
    left.folderId === right.folderId &&
    left.isTrashed === right.isTrashed &&
    left.trashedAt === right.trashedAt &&
    left.restoreFolderId === right.restoreFolderId &&
    left.coverUri === right.coverUri &&
    left.activeAssetId === right.activeAssetId &&
    left.historyCursor === right.historyCursor &&
    left.collageLayoutId === right.collageLayoutId &&
    sameAssets(left.assets, right.assets) &&
    sameFilterStack(left.filterStack, right.filterStack) &&
    JSON.stringify(left.history) === JSON.stringify(right.history)
  );
}

function createHistorySnapshot(
  filterStack: FilterStack,
  selectedCategoryId: FilterCategoryId,
): HistorySnapshot {
  return {
    filterStack: cloneFilterStack(filterStack),
    selectedCategoryId,
  };
}

function historyState(past: HistorySnapshot[], future: HistorySnapshot[]) {
  return {
    filterHistoryPast: past,
    filterHistoryFuture: future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

function categoryForFilterStack(
  filterStack: FilterStack,
  fallback: FilterCategoryId,
): FilterCategoryId {
  if (fallback === 'favorites' || fallback === 'search') {
    return fallback;
  }
  const activeFilterIds = getActiveFilterIds(filterStack);
  const primaryFilterId =
    activeFilterIds[activeFilterIds.length - 1] ?? filterStack.filterId;
  if (primaryFilterId === NONE_FILTER_ID) {
    return fallback;
  }
  return getFilterById(primaryFilterId).categoryId;
}

function normalizeName(name: string): string {
  return name.trim();
}

function serializeParameterValues(values: Record<string, number>) {
  return JSON.stringify(
    Object.keys(values)
      .sort()
      .reduce<Record<string, number>>((acc, key) => {
        acc[key] = values[key];
        return acc;
      }, {}),
  );
}

function buildMixSignature(filterStack: FilterStack): string {
  const normalizedStack = normalizeFilterStack(filterStack);
  return JSON.stringify({
    mixEnabled: normalizedStack.mixEnabled,
    mixFilterIds: getActiveFilterIds(normalizedStack),
    intensity: normalizedStack.intensity,
    parameterValues: serializeParameterValues(normalizedStack.parameterValues),
  });
}

function buildMixName(filterStack: FilterStack): string {
  const filters = getActiveFilterIds(filterStack).map(getFilterById);
  const names = filters.slice(0, 3).map(filter => filter.name);
  if (filters.length <= 3) {
    return names.join(' + ');
  }
  return `${names.join(' + ')} +${filters.length - 3}`;
}

function normalizeMixDocument(mix: FilterMixDocument): FilterMixDocument {
  return {
    ...mix,
    filterStack: cloneFilterStack({
      ...mix.filterStack,
      mixEnabled: true,
      mixFilterIds: getActiveFilterIds(mix.filterStack),
    }),
  };
}

function persistMixes(mixes: FilterMixDocument[]) {
  writeJSON(
    MIXES_KEY,
    mixes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  );
}

function loadMixes(): FilterMixDocument[] {
  return readJSON<FilterMixDocument[]>(MIXES_KEY, [])
    .map(normalizeMixDocument)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function upsertMixDocument(
  mixes: FilterMixDocument[],
  filterStack: FilterStack,
): { mix: FilterMixDocument; mixes: FilterMixDocument[] } | null {
  const activeFilterIds = getActiveFilterIds(filterStack);
  if (activeFilterIds.length < 2) {
    return null;
  }

  const normalizedStack = cloneFilterStack({
    ...filterStack,
    mixEnabled: true,
    mixFilterIds: activeFilterIds,
    filterId: activeFilterIds[activeFilterIds.length - 1] ?? NONE_FILTER_ID,
  });
  const signature = buildMixSignature(normalizedStack);
  const existing = mixes.find(
    mix => buildMixSignature(mix.filterStack) === signature,
  );
  const now = new Date().toISOString();
  const mix: FilterMixDocument = {
    id: existing?.id ?? createId('mix'),
    name: existing?.name ?? buildMixName(normalizedStack),
    filterStack: normalizedStack,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const nextMixes = [mix, ...mixes.filter(item => item.id !== mix.id)].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  return {
    mix,
    mixes: nextMixes,
  };
}

function buildHomeProjects(
  projects: ProjectDocument[],
  folders: FolderDocument[],
): HomeProjectsState {
  const allProjects = projects.filter(project => !project.isTrashed);
  const trashProjects = projects.filter(project => project.isTrashed);
  const foldersWithProjects = folders.map(folder => ({
    folder,
    projects: allProjects.filter(project => project.folderId === folder.id),
  }));

  return {
    allProjects,
    foldersWithProjects,
    trashProjects,
  };
}

function loadHomeState() {
  const projects = listProjects();
  const folders = listFolders();
  return {
    projects,
    folders,
    homeProjects: buildHomeProjects(projects, folders),
  };
}

function cloneProject(project: ProjectDocument): ProjectDocument {
  return {
    ...project,
    assets: project.assets.map(asset => ({ ...asset })),
    filterStack: cloneFilterStack(project.filterStack),
    history: project.history.map(entry => ({
      ...entry,
      payload: {
        ...entry.payload,
      },
    })),
  };
}

function buildProjectSnapshot(
  state: StudioState,
  existing: ProjectDocument | null,
  title?: string,
): ProjectDocument | null {
  if (!state.currentAsset) {
    return null;
  }
  const id = existing?.id ?? state.activeProjectId ?? createId('project');
  const now = new Date().toISOString();

  return {
    id,
    schemaVersion: 2,
    title: title ?? existing?.title ?? UNTITLED_PROJECT_TITLE,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    folderId: existing?.folderId ?? null,
    isTrashed: existing?.isTrashed ?? false,
    trashedAt: existing?.trashedAt ?? null,
    restoreFolderId: existing?.restoreFolderId ?? null,
    coverUri: state.previewUri ?? state.currentAsset.uri,
    assets: [state.currentAsset],
    activeAssetId: state.currentAsset.id,
    filterStack: cloneFilterStack(state.filterStack),
    history: existing?.history ?? [],
    historyCursor: existing?.historyCursor ?? 0,
    collageLayoutId: existing?.collageLayoutId,
  };
}

function clearAutosaveTimer() {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
    autosaveTimeout = null;
  }
}

export const useStudioStore = create<StudioState>((set, get) => ({
  currentAsset: null,
  previewUri: null,
  filterStack: initialFilterStack,
  selectedCategoryId: 'cinematic',
  filterHistoryPast: [],
  filterHistoryFuture: [],
  canUndo: false,
  canRedo: false,
  favorites: initialFavorites,
  recents: initialRecents,
  mixes: initialMixes,
  onboardingSeen: readJSON<boolean>(ONBOARDING_KEY, false),
  language: initialLanguage,
  performanceMode: initialPerformance,
  projects: [],
  folders: [],
  homeProjects: EMPTY_HOME_PROJECTS,
  activeProjectId: null,

  setCurrentAsset(asset, options) {
    clearAutosaveTimer();
    const neutralStack = createNeutralFilterStack();
    set({
      currentAsset: asset,
      previewUri: asset?.uri ?? null,
      filterStack: neutralStack,
      activeProjectId: options?.resetProject === false ? get().activeProjectId : null,
      ...historyState([], []),
    });
  },

  setPreviewUri(uri) {
    set({ previewUri: uri });
  },

  setCategory(categoryId) {
    set({ selectedCategoryId: categoryId });
  },

  setFilter(filterId, options) {
    set(state => {
      const currentStack = cloneFilterStack(state.filterStack);
      let nextStack: FilterStack;
      let recents = state.recents;

      if (currentStack.mixEnabled) {
        const activeFilterIds = getActiveFilterIds(currentStack);
        if (activeFilterIds.includes(filterId)) {
          const nextFilterIds = activeFilterIds.filter(id => id !== filterId);
          nextStack = normalizeFilterStack({
            ...currentStack,
            filterId: nextFilterIds[nextFilterIds.length - 1] ?? NONE_FILTER_ID,
            mixEnabled: true,
            mixFilterIds: nextFilterIds,
          });
        } else {
          nextStack = normalizeFilterStack({
            ...currentStack,
            filterId,
            mixEnabled: true,
            mixFilterIds: [...activeFilterIds, filterId],
          });
          recents = [filterId, ...state.recents.filter(id => id !== filterId)].slice(0, 32);
          writeJSON(RECENTS_KEY, recents);
        }
      } else {
        const nextFilterId =
          currentStack.filterId === filterId ? NONE_FILTER_ID : filterId;
        nextStack = normalizeFilterStack({
          ...currentStack,
          filterId: nextFilterId,
          mixEnabled: false,
          mixFilterIds: nextFilterId === NONE_FILTER_ID ? [] : [nextFilterId],
        });
        if (nextFilterId !== NONE_FILTER_ID) {
          recents = [nextFilterId, ...state.recents.filter(id => id !== nextFilterId)].slice(
            0,
            32,
          );
          writeJSON(RECENTS_KEY, recents);
        }
      }

      if (sameFilterStack(currentStack, nextStack)) {
        return {};
      }
      const past =
        options?.trackHistory === false
          ? state.filterHistoryPast
          : [
              ...state.filterHistoryPast,
              createHistorySnapshot(
                currentStack,
                categoryForFilterStack(currentStack, state.selectedCategoryId),
              ),
            ];
      const future =
        options?.trackHistory === false ? state.filterHistoryFuture : [];
      return {
        filterStack: nextStack,
        selectedCategoryId: categoryForFilterStack(nextStack, state.selectedCategoryId),
        recents,
        ...historyState(past, future),
      };
    });
  },

  toggleMixMode() {
    set(state => {
      const currentStack = cloneFilterStack(state.filterStack);
      const activeFilterIds = getActiveFilterIds(currentStack);
      const nextStack = currentStack.mixEnabled
        ? normalizeFilterStack({
            ...currentStack,
            filterId: activeFilterIds[activeFilterIds.length - 1] ?? NONE_FILTER_ID,
            mixEnabled: false,
            mixFilterIds: [],
          })
        : normalizeFilterStack({
            ...currentStack,
            mixEnabled: true,
            mixFilterIds: activeFilterIds,
          });

      if (sameFilterStack(currentStack, nextStack)) {
        return {};
      }

      return {
        filterStack: nextStack,
        selectedCategoryId: categoryForFilterStack(nextStack, state.selectedCategoryId),
        ...historyState(
          [
            ...state.filterHistoryPast,
            createHistorySnapshot(
              currentStack,
              categoryForFilterStack(currentStack, state.selectedCategoryId),
            ),
          ],
          [],
        ),
      };
    });
  },

  setIntensity(intensity, options) {
    set(state => {
      const currentStack = cloneFilterStack(state.filterStack);
      if (currentStack.intensity === intensity) {
        return {};
      }
      return {
        ...(options?.trackHistory === false
          ? {}
          : historyState(
              [
                ...state.filterHistoryPast,
                createHistorySnapshot(
                  currentStack,
                  categoryForFilterStack(currentStack, state.selectedCategoryId),
                ),
              ],
              [],
            )),
        filterStack: {
          ...currentStack,
          intensity,
        },
      };
    });
  },

  setParameter(id, value, options) {
    set(state => {
      const currentStack = cloneFilterStack(state.filterStack);
      if (currentStack.parameterValues[id] === value) {
        return {};
      }
      return {
        ...(options?.trackHistory === false
          ? {}
          : historyState(
              [
                ...state.filterHistoryPast,
                createHistorySnapshot(
                  currentStack,
                  categoryForFilterStack(currentStack, state.selectedCategoryId),
                ),
              ],
              [],
            )),
        filterStack: {
          ...currentStack,
          parameterValues: {
            ...currentStack.parameterValues,
            [id]: value,
          },
        },
      };
    });
  },

  resetFilterStack(options) {
    set(state => {
      const neutralStack = createNeutralFilterStack();
      const currentStack = cloneFilterStack(state.filterStack);
      if (sameFilterStack(currentStack, neutralStack)) {
        return {};
      }
      return {
        ...(options?.trackHistory === false
          ? {}
          : historyState(
              [
                ...state.filterHistoryPast,
                createHistorySnapshot(
                  currentStack,
                  categoryForFilterStack(currentStack, state.selectedCategoryId),
                ),
              ],
              [],
            )),
        filterStack: neutralStack,
      };
    });
  },

  commitFilterHistory(previousStack) {
    set(state => {
      if (sameFilterStack(previousStack, state.filterStack)) {
        return {};
      }
      return historyState(
        [
          ...state.filterHistoryPast,
          createHistorySnapshot(
            previousStack,
            categoryForFilterStack(previousStack, state.selectedCategoryId),
          ),
        ],
        [],
      );
    });
  },

  undoFilterChange() {
    set(state => {
      const previousSnapshot = state.filterHistoryPast[state.filterHistoryPast.length - 1];
      if (!previousSnapshot) {
        return {};
      }
      const past = state.filterHistoryPast.slice(0, -1);
      const future = [
        createHistorySnapshot(
          state.filterStack,
          categoryForFilterStack(state.filterStack, state.selectedCategoryId),
        ),
        ...state.filterHistoryFuture,
      ];
      return {
        filterStack: cloneFilterStack(previousSnapshot.filterStack),
        selectedCategoryId: previousSnapshot.selectedCategoryId,
        ...historyState(past, future),
      };
    });
  },

  redoFilterChange() {
    set(state => {
      const [nextSnapshot, ...future] = state.filterHistoryFuture;
      if (!nextSnapshot) {
        return {};
      }
      const past = [
        ...state.filterHistoryPast,
        createHistorySnapshot(
          state.filterStack,
          categoryForFilterStack(state.filterStack, state.selectedCategoryId),
        ),
      ];
      return {
        filterStack: cloneFilterStack(nextSnapshot.filterStack),
        selectedCategoryId: nextSnapshot.selectedCategoryId,
        ...historyState(past, future),
      };
    });
  },

  toggleFavorite(filterId) {
    set(state => {
      const exists = state.favorites.includes(filterId);
      const favorites = exists
        ? state.favorites.filter(id => id !== filterId)
        : [filterId, ...state.favorites];
      writeJSON(FAVORITES_KEY, favorites);
      return {
        favorites,
        selectedCategoryId:
          state.selectedCategoryId === 'favorites' && favorites.length === 0
            ? categoryForFilterStack(state.filterStack, 'cinematic')
            : state.selectedCategoryId,
      };
    });
  },

  clearRecents() {
    writeJSON(RECENTS_KEY, []);
    set({ recents: [] });
  },

  setOnboardingSeen(value) {
    writeJSON(ONBOARDING_KEY, value);
    set({ onboardingSeen: value });
  },

  setLanguage(value) {
    writeJSON(LANGUAGE_KEY, value);
    set({ language: value });
  },

  setPerformanceMode(value) {
    writeJSON(PERFORMANCE_KEY, value);
    set({ performanceMode: value });
  },

  refreshProjects() {
    set(loadHomeState());
  },

  createOrUpdateProject(title) {
    const state = get();
    const existing = state.activeProjectId ? getProject(state.activeProjectId) : null;
    const project = buildProjectSnapshot(state, existing, title);
    if (!project) {
      return null;
    }

    upsertProject(project);
    set({
      activeProjectId: project.id,
      ...loadHomeState(),
    });
    return project;
  },

  openProject(projectId) {
    clearAutosaveTimer();
    const project = getProject(projectId);
    if (!project || project.isTrashed) {
      return null;
    }
    set({
      activeProjectId: project.id,
      filterStack: cloneFilterStack(project.filterStack),
      selectedCategoryId: categoryForFilterStack(project.filterStack, get().selectedCategoryId),
      currentAsset: project.assets.find(asset => asset.id === project.activeAssetId) ?? null,
      previewUri: project.coverUri ?? project.assets[0]?.uri ?? null,
      ...historyState([], []),
    });
    return project;
  },

  createFolder(name) {
    const trimmed = normalizeName(name);
    if (!trimmed) {
      return null;
    }
    const now = new Date().toISOString();
    const folder: FolderDocument = {
      id: createId('folder'),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    insertFolder(folder);
    set(loadHomeState());
    return folder;
  },

  renameFolder(folderId, name) {
    const folder = getFolder(folderId);
    const trimmed = normalizeName(name);
    if (!folder || !trimmed) {
      return null;
    }
    const updatedAt = new Date().toISOString();
    renameFolderRecord(folderId, trimmed, updatedAt);
    set(loadHomeState());
    return {
      ...folder,
      name: trimmed,
      updatedAt,
    };
  },

  removeFolder(folderId) {
    const state = get();
    const now = new Date().toISOString();
    state.projects
      .filter(project => project.folderId === folderId && !project.isTrashed)
      .forEach(project => {
        upsertProject({
          ...cloneProject(project),
          folderId: null,
          isTrashed: true,
          trashedAt: now,
          restoreFolderId: null,
        });
      });
    deleteFolder(folderId);
    set(loadHomeState());
  },

  renameProject(projectId, title) {
    const project = getProject(projectId);
    const trimmed = normalizeName(title);
    if (!project || !trimmed) {
      return null;
    }
    const renamed = {
      ...cloneProject(project),
      title: trimmed,
    };
    upsertProject(renamed);
    set(loadHomeState());
    return renamed;
  },

  duplicateProject(projectId) {
    const project = getProject(projectId);
    if (!project || project.isTrashed) {
      return null;
    }
    const now = new Date().toISOString();
    const duplicated: ProjectDocument = {
      ...cloneProject(project),
      id: createId('project'),
      title: `${project.title} Copy`,
      createdAt: now,
      updatedAt: now,
      restoreFolderId: null,
      trashedAt: null,
      isTrashed: false,
    };
    upsertProject(duplicated);
    set(loadHomeState());
    return duplicated;
  },

  moveProjectToFolder(projectId, folderId) {
    const project = getProject(projectId);
    if (!project || project.isTrashed) {
      return null;
    }
    const moved = {
      ...cloneProject(project),
      folderId,
      restoreFolderId: null,
    };
    upsertProject(moved);
    set(loadHomeState());
    return moved;
  },

  trashProject(projectId) {
    const project = getProject(projectId);
    if (!project || project.isTrashed) {
      return null;
    }
    const trashed: ProjectDocument = {
      ...cloneProject(project),
      folderId: null,
      isTrashed: true,
      trashedAt: new Date().toISOString(),
      restoreFolderId: project.folderId ?? null,
    };
    upsertProject(trashed);
    set(current => ({
      activeProjectId:
        current.activeProjectId === projectId ? null : current.activeProjectId,
      ...loadHomeState(),
    }));
    return trashed;
  },

  recoverProject(projectId) {
    const project = getProject(projectId);
    if (!project || !project.isTrashed) {
      return null;
    }
    const targetFolderId =
      project.restoreFolderId && getFolder(project.restoreFolderId)
        ? project.restoreFolderId
        : null;
    const recovered: ProjectDocument = {
      ...cloneProject(project),
      folderId: targetFolderId,
      isTrashed: false,
      trashedAt: null,
      restoreFolderId: null,
    };
    upsertProject(recovered);
    set(loadHomeState());
    return recovered;
  },

  removeProjectPermanently(projectId) {
    deleteProject(projectId);
    set(current => ({
      activeProjectId:
        current.activeProjectId === projectId ? null : current.activeProjectId,
      ...loadHomeState(),
    }));
  },

  cleanTrash() {
    const state = get();
    state.projects
      .filter(project => project.isTrashed)
      .forEach(project => deleteProject(project.id));
    set(loadHomeState());
  },

  saveCurrentMix() {
    const state = get();
    const result = upsertMixDocument(state.mixes, state.filterStack);
    if (!result) {
      return null;
    }
    persistMixes(result.mixes);
    set({
      mixes: result.mixes,
    });
    return result.mix;
  },

  applyMix(mixId) {
    const mix = get().mixes.find(item => item.id === mixId);
    if (!mix) {
      return null;
    }
    const nextStack = cloneFilterStack({
      ...mix.filterStack,
      mixEnabled: true,
      mixFilterIds: getActiveFilterIds(mix.filterStack),
    });
    set(state => ({
      filterStack: nextStack,
      selectedCategoryId: categoryForFilterStack(nextStack, state.selectedCategoryId),
      ...historyState([], []),
    }));
    return mix;
  },

  scheduleAutosave() {
    clearAutosaveTimer();
    autosaveTimeout = setTimeout(() => {
      get().flushAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  },

  flushAutosave() {
    clearAutosaveTimer();
    const state = get();
    if (!state.currentAsset) {
      return null;
    }
    const existing = state.activeProjectId ? getProject(state.activeProjectId) : null;
    const project = buildProjectSnapshot(state, existing);
    if (!project) {
      return null;
    }
    if (existing && sameProjectData(existing, project)) {
      return existing;
    }
    upsertProject(project);
    set({
      activeProjectId: project.id,
      ...loadHomeState(),
    });
    return project;
  },
}));
