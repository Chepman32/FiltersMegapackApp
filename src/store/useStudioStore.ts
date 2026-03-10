import { create } from 'zustand';
import type { FilterCategoryId, FilterStack } from '../types/filter';
import type { MediaAssetRef } from '../types/media';
import type { ProjectDocument } from '../types/project';
import { createDefaultFilterStack } from '../filters/recipe';
import { readJSON, writeJSON } from './storage';
import { getProject, listProjects, upsertProject } from '../db/projectRepository';
import { createId } from '../utils/id';

const FAVORITES_KEY = 'favorites';
const RECENTS_KEY = 'recents';
const ONBOARDING_KEY = 'onboardingSeen';
const LANGUAGE_KEY = 'language';
const PERFORMANCE_KEY = 'performanceMode';

interface StudioState {
  currentAsset: MediaAssetRef | null;
  previewUri: string | null;
  filterStack: FilterStack;
  selectedCategoryId: FilterCategoryId;
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
  setFilter: (filterId: string) => void;
  setIntensity: (intensity: number) => void;
  setParameter: (id: string, value: number) => void;
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

export const useStudioStore = create<StudioState>((set, get) => ({
  currentAsset: null,
  previewUri: null,
  filterStack: initialFilterStack,
  selectedCategoryId: 'cinematic',
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

  setFilter(filterId) {
    set(state => {
      const recents = [filterId, ...state.recents.filter(id => id !== filterId)].slice(
        0,
        32,
      );
      writeJSON(RECENTS_KEY, recents);
      return {
        filterStack: {
          ...state.filterStack,
          filterId,
        },
        recents,
      };
    });
  },

  setIntensity(intensity) {
    set(state => ({
      filterStack: {
        ...state.filterStack,
        intensity,
      },
    }));
  },

  setParameter(id, value) {
    set(state => ({
      filterStack: {
        ...state.filterStack,
        parameterValues: {
          ...state.filterStack.parameterValues,
          [id]: value,
        },
      },
    }));
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
      currentAsset: project.assets.find(asset => asset.id === project.activeAssetId) ?? null,
      previewUri: project.coverUri ?? project.assets[0]?.uri ?? null,
    });
    return project;
  },
}));
