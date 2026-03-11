import type { FolderDocument } from '../src/types/folder';
import type { ProjectDocument } from '../src/types/project';

const repoState: {
  folders: FolderDocument[];
  projects: ProjectDocument[];
} = {
  folders: [],
  projects: [],
};

jest.mock('../src/db/projectRepository', () => ({
  createFolder: jest.fn((folder: FolderDocument) => {
    repoState.folders = [...repoState.folders, { ...folder }];
  }),
  getFolder: jest.fn((folderId: string) =>
    repoState.folders.find(folder => folder.id === folderId) ?? null,
  ),
  getProject: jest.fn((projectId: string) =>
    repoState.projects.find(project => project.id === projectId) ?? null,
  ),
  listFolders: jest.fn(() =>
    [...repoState.folders].sort((left, right) => left.name.localeCompare(right.name)),
  ),
  listProjects: jest.fn(() =>
    [...repoState.projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  ),
  removeFolder: jest.fn((folderId: string) => {
    repoState.folders = repoState.folders.filter(folder => folder.id !== folderId);
  }),
  removeProject: jest.fn((projectId: string) => {
    repoState.projects = repoState.projects.filter(project => project.id !== projectId);
  }),
  renameFolder: jest.fn((folderId: string, name: string, updatedAt: string) => {
    repoState.folders = repoState.folders.map(folder =>
      folder.id === folderId ? { ...folder, name, updatedAt } : folder,
    );
  }),
  upsertProject: jest.fn((project: ProjectDocument) => {
    const next = { ...project };
    repoState.projects = repoState.projects.some(item => item.id === project.id)
      ? repoState.projects.map(item => (item.id === project.id ? next : item))
      : [...repoState.projects, next];
  }),
}));

import { createNeutralFilterStack } from '../src/filters/recipe';
import { useStudioStore } from '../src/store/useStudioStore';

function makeProject(overrides: Partial<ProjectDocument>): ProjectDocument {
  return {
    id: overrides.id ?? 'project_1',
    schemaVersion: 2,
    title: overrides.title ?? 'Project',
    createdAt: overrides.createdAt ?? '2026-03-10T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-10T10:00:00.000Z',
    folderId: overrides.folderId ?? null,
    isTrashed: overrides.isTrashed ?? false,
    trashedAt: overrides.trashedAt ?? null,
    restoreFolderId: overrides.restoreFolderId ?? null,
    coverUri: overrides.coverUri ?? 'file:///preview.jpg',
    assets: overrides.assets ?? [],
    activeAssetId: overrides.activeAssetId,
    filterStack: overrides.filterStack ?? createNeutralFilterStack(),
    history: overrides.history ?? [],
    historyCursor: overrides.historyCursor ?? 0,
    collageLayoutId: overrides.collageLayoutId,
  };
}

function makeFolder(overrides: Partial<FolderDocument>): FolderDocument {
  return {
    id: overrides.id ?? 'folder_1',
    name: overrides.name ?? 'Folder',
    createdAt: overrides.createdAt ?? '2026-03-10T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-10T10:00:00.000Z',
  };
}

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

describe('studio store home project management', () => {
  beforeEach(() => {
    repoState.folders = [];
    repoState.projects = [];
    resetStore();
  });

  it('creates folders and moves projects in and out of them', () => {
    repoState.projects = [makeProject({ id: 'project_a', title: 'Poster' })];

    const store = useStudioStore.getState();
    store.refreshProjects();
    const folder = store.createFolder('Drafts');

    expect(folder?.name).toBe('Drafts');
    expect(useStudioStore.getState().homeProjects.allProjects).toHaveLength(1);

    useStudioStore.getState().moveProjectToFolder('project_a', folder?.id ?? null);
    expect(useStudioStore.getState().homeProjects.foldersWithProjects[0]?.projects).toHaveLength(1);
    expect(repoState.projects[0]?.folderId).toBe(folder?.id);

    useStudioStore.getState().moveProjectToFolder('project_a', null);
    expect(repoState.projects[0]?.folderId).toBeNull();
    expect(useStudioStore.getState().homeProjects.foldersWithProjects[0]?.projects).toHaveLength(0);
    expect(useStudioStore.getState().homeProjects.allProjects).toHaveLength(1);
  });

  it('trashes, recovers, and permanently removes projects', () => {
    repoState.folders = [makeFolder({ id: 'folder_travel', name: 'Travel' })];
    repoState.projects = [
      makeProject({
        id: 'project_trip',
        folderId: 'folder_travel',
        title: 'Trip',
      }),
    ];

    const store = useStudioStore.getState();
    store.refreshProjects();
    store.trashProject('project_trip');

    expect(useStudioStore.getState().homeProjects.allProjects).toHaveLength(0);
    expect(useStudioStore.getState().homeProjects.trashProjects).toHaveLength(1);
    expect(repoState.projects[0]?.restoreFolderId).toBe('folder_travel');

    store.recoverProject('project_trip');
    expect(useStudioStore.getState().homeProjects.trashProjects).toHaveLength(0);
    expect(repoState.projects[0]?.folderId).toBe('folder_travel');

    store.trashProject('project_trip');
    store.cleanTrash();
    expect(repoState.projects).toHaveLength(0);
    expect(useStudioStore.getState().homeProjects.trashProjects).toHaveLength(0);
  });

  it('duplicates projects and trashes folder contents when a folder is removed', () => {
    repoState.folders = [makeFolder({ id: 'folder_brand', name: 'Brand' })];
    repoState.projects = [
      makeProject({
        id: 'project_brand',
        folderId: 'folder_brand',
        title: 'Brand Board',
      }),
    ];

    const store = useStudioStore.getState();
    store.refreshProjects();
    const duplicate = store.duplicateProject('project_brand');

    expect(duplicate).not.toBeNull();
    expect(repoState.projects).toHaveLength(2);
    expect(repoState.projects.every(project => project.folderId === 'folder_brand')).toBe(true);

    store.removeFolder('folder_brand');
    expect(repoState.folders).toHaveLength(0);
    expect(repoState.projects.every(project => project.isTrashed)).toBe(true);
    expect(repoState.projects.every(project => project.restoreFolderId === null)).toBe(true);
    expect(useStudioStore.getState().homeProjects.allProjects).toHaveLength(0);
    expect(useStudioStore.getState().homeProjects.trashProjects).toHaveLength(2);
  });
});
