import { create } from 'zustand';
import type { FilterCategoryId, FilterStack } from '../types/filter';
import type { MediaAssetRef } from '../types/media';
import type { ProjectDocument } from '../types/project';
import { createDefaultFilterStack } from '../filters/recipe';
import { getFilterById } from '../filters/filterCatalog';
import { readJSON, writeJSON } from './storage';
import { getProject, listProjects, upsertProject } from '../db/projectRepository';
import { createId } from '../utils/id';

const FAVORITES_KEY = 'favorites';
const RECENTS_KEY = 'recents';
const ONBOARDING_KEY = 'onboardingSeen';
const LANGUAGE_KEY = 'language';
const PERFORMANCE_KEY = 'performanceMode';

interface FilterChangeOptions {
  trackHistory?: boolean;
}

interface StudioState {
  currentAsset: MediaAssetRef | null;
  previewUri: string | null;
  filterStack: FilterStack;
  selectedCategoryId: FilterCategoryId;
  filterHistoryPast: FilterStack[];
  filterHistoryFuture: FilterStack[];
  canUndo: boolean;
  canRedo: boolean;
  favorites: string[];
  recents: string[];
  onboardingSeen: boolean;
  language: 'en' | 'ru';
  performanceMode: boolean;
  projects: ProjectDocument[];
  activeProjectId: string | null;
  setCurrentAsset: (asset: MediaAssetRef | null) => void;
  setPreviewUri: (uri: string | null) => void;
  setCategory: (categoryId: FilterCategoryId) => void;
  setFilter: (filterId: string, options?: FilterChangeOptions) => void;
  setIntensity: (intensity: number, options?: FilterChangeOptions) => void;
  setParameter: (id: string, value: number, options?: FilterChangeOptions) => void;
  commitFilterHistory: (previousStack: FilterStack) => void;
  undoFilterChange: () => void;
  redoFilterChange: () => void;
  toggleFavorite: (filterId: string) => void;
  clearRecents: () => void;
  setOnboardingSeen: (value: boolean) => void;
  setLanguage: (value: 'en' | 'ru') => void;
  setPerformanceMode: (value: boolean) => void;
  refreshProjects: () => void;
  createOrUpdateProject: (title?: string) => ProjectDocument;
  openProject: (projectId: string) => ProjectDocument | null;
}

const initialFilterStack = createDefaultFilterStack();

const initialFavorites = readJSON<string[]>(FAVORITES_KEY, []);
const initialRecents = readJSON<string[]>(RECENTS_KEY, []);
const initialLanguage = readJSON<'en' | 'ru'>(LANGUAGE_KEY, 'en');
const initialPerformance = readJSON<boolean>(PERFORMANCE_KEY, true);

function cloneFilterStack(stack: FilterStack): FilterStack {
  return {
    ...stack,
    parameterValues: {
      ...stack.parameterValues,
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
  return (
    left.filterId === right.filterId &&
    left.intensity === right.intensity &&
    sameParameterValues(left.parameterValues, right.parameterValues)
  );
}

function historyState(past: FilterStack[], future: FilterStack[]) {
  return {
    filterHistoryPast: past,
    filterHistoryFuture: future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
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
  onboardingSeen: readJSON<boolean>(ONBOARDING_KEY, false),
  language: initialLanguage,
  performanceMode: initialPerformance,
  projects: [],
  activeProjectId: null,

  setCurrentAsset(asset) {
    set({
      currentAsset: asset,
      previewUri: asset?.uri ?? null,
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
      if (state.filterStack.filterId === filterId) {
        return {};
      }
      const recents = [filterId, ...state.recents.filter(id => id !== filterId)].slice(
        0,
        32,
      );
      writeJSON(RECENTS_KEY, recents);
      const past =
        options?.trackHistory === false
          ? state.filterHistoryPast
          : [...state.filterHistoryPast, cloneFilterStack(state.filterStack)];
      const future =
        options?.trackHistory === false ? state.filterHistoryFuture : [];
      return {
        filterStack: {
          ...state.filterStack,
          filterId,
        },
        selectedCategoryId: getFilterById(filterId).categoryId,
        recents,
        ...historyState(past, future),
      };
    });
  },

  setIntensity(intensity, options) {
    set(state => {
      if (state.filterStack.intensity === intensity) {
        return {};
      }
      return {
        ...(options?.trackHistory === false
          ? {}
          : historyState(
              [...state.filterHistoryPast, cloneFilterStack(state.filterStack)],
              [],
            )),
        filterStack: {
          ...state.filterStack,
          intensity,
        },
      };
    });
  },

  setParameter(id, value, options) {
    set(state => {
      if (state.filterStack.parameterValues[id] === value) {
        return {};
      }
      return {
        ...(options?.trackHistory === false
          ? {}
          : historyState(
              [...state.filterHistoryPast, cloneFilterStack(state.filterStack)],
              [],
            )),
        filterStack: {
          ...state.filterStack,
          parameterValues: {
            ...state.filterStack.parameterValues,
            [id]: value,
          },
        },
      };
    });
  },

  commitFilterHistory(previousStack) {
    set(state => {
      if (sameFilterStack(previousStack, state.filterStack)) {
        return {};
      }
      return historyState(
        [...state.filterHistoryPast, cloneFilterStack(previousStack)],
        [],
      );
    });
  },

  undoFilterChange() {
    set(state => {
      const previousStack = state.filterHistoryPast[state.filterHistoryPast.length - 1];
      if (!previousStack) {
        return {};
      }
      const past = state.filterHistoryPast.slice(0, -1);
      const future = [cloneFilterStack(state.filterStack), ...state.filterHistoryFuture];
      return {
        filterStack: cloneFilterStack(previousStack),
        selectedCategoryId: getFilterById(previousStack.filterId).categoryId,
        ...historyState(past, future),
      };
    });
  },

  redoFilterChange() {
    set(state => {
      const [nextStack, ...future] = state.filterHistoryFuture;
      if (!nextStack) {
        return {};
      }
      const past = [...state.filterHistoryPast, cloneFilterStack(state.filterStack)];
      return {
        filterStack: cloneFilterStack(nextStack),
        selectedCategoryId: getFilterById(nextStack.filterId).categoryId,
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
      return { favorites };
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
    set({ projects: listProjects() });
  },

  createOrUpdateProject(title) {
    const state = get();
    const id = state.activeProjectId ?? createId('project');
    const now = new Date().toISOString();
    const existing = id ? getProject(id) : null;
    const project: ProjectDocument = {
      id,
      schemaVersion: 1,
      title: title ?? existing?.title ?? 'Untitled Project',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      coverUri: state.previewUri ?? state.currentAsset?.uri,
      assets: state.currentAsset ? [state.currentAsset] : [],
      activeAssetId: state.currentAsset?.id,
      filterStack: state.filterStack,
      history: existing?.history ?? [],
      historyCursor: existing?.historyCursor ?? 0,
      collageLayoutId: existing?.collageLayoutId,
    };
    upsertProject(project);
    set({
      activeProjectId: id,
      projects: listProjects(),
    });
    return project;
  },

  openProject(projectId) {
    const project = getProject(projectId);
    if (!project) {
      return null;
    }
    set({
      activeProjectId: project.id,
      filterStack: project.filterStack,
      selectedCategoryId: getFilterById(project.filterStack.filterId).categoryId,
      currentAsset: project.assets.find(asset => asset.id === project.activeAssetId) ?? null,
      previewUri: project.coverUri ?? project.assets[0]?.uri ?? null,
      ...historyState([], []),
    });
    return project;
  },
}));
