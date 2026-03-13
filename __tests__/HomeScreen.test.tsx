import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Image, Modal, Text } from 'react-native';
import '../src/localization/i18n';
import { HomeScreen } from '../src/screens/HomeScreen';
import type { FolderDocument } from '../src/types/folder';
import type { ProjectDocument } from '../src/types/project';

const mockNavigate = jest.fn();

const mockStoreState = {
  folders: [] as FolderDocument[],
  homeProjects: {
    allProjects: [] as ProjectDocument[],
    foldersWithProjects: [] as Array<{ folder: FolderDocument; projects: ProjectDocument[] }>,
    trashProjects: [] as ProjectDocument[],
  },
  createFolder: jest.fn(),
  cleanTrash: jest.fn(),
  duplicateProject: jest.fn(),
  moveProjectToFolder: jest.fn(),
  openProject: jest.fn(),
  recoverProject: jest.fn(),
  refreshProjects: jest.fn(),
  removeFolder: jest.fn(),
  removeProjectPermanently: jest.fn(),
  renameFolder: jest.fn(),
  renameProject: jest.fn(),
  setCurrentAsset: jest.fn(),
  trashProject: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../src/store/useStudioStore', () => ({
  useStudioStore: () => mockStoreState,
}));

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
    coverUri: overrides.coverUri,
    assets: overrides.assets ?? [],
    activeAssetId: overrides.activeAssetId,
    filterStack: overrides.filterStack ?? {
      filterId: '__none__',
      mixEnabled: false,
      mixFilterIds: [],
      intensity: 1,
      parameterValues: { strength: 1, micro: 0.5 },
    },
    history: overrides.history ?? [],
    historyCursor: overrides.historyCursor ?? 0,
    collageLayoutId: overrides.collageLayoutId,
  };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    Object.assign(mockStoreState, {
      folders: [],
      homeProjects: {
        allProjects: [],
        foldersWithProjects: [],
        trashProjects: [],
      },
    });
    Object.values(mockStoreState).forEach(value => {
      if (typeof value === 'function' && 'mockReset' in value) {
        (value as jest.Mock).mockReset();
      }
    });
  });

  it('renders the empty all projects state', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('All Projects');
    expect(texts).toContain('Import something to create your first project.');
    expect(mockStoreState.refreshProjects).toHaveBeenCalled();
  });

  it('renders grouped sections with preview images', async () => {
    const folder = {
      id: 'folder_a',
      name: 'Campaigns',
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: '2026-03-10T10:00:00.000Z',
    };
    Object.assign(mockStoreState, {
      folders: [folder],
      homeProjects: {
        allProjects: [
          makeProject({
            id: 'project_root',
            title: 'Launch',
            coverUri: 'file:///launch.jpg',
          }),
          makeProject({
            id: 'project_folder',
            title: 'Spring',
            folderId: folder.id,
            coverUri: 'file:///spring.jpg',
          }),
        ],
        foldersWithProjects: [
          {
            folder,
            projects: [
              makeProject({
                id: 'project_folder',
                title: 'Spring',
                folderId: folder.id,
                coverUri: 'file:///spring.jpg',
              }),
            ],
          },
        ],
        trashProjects: [],
      },
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    const imageUris = renderer!.root
      .findAllByType(Image)
      .map(node => node.props.source?.uri)
      .filter(Boolean);
    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();

    expect(texts).toContain('Campaigns');
    expect(texts).toContain('Launch');
    expect(texts).toContain('Spring');
    expect(imageUris).toEqual(expect.arrayContaining(['file:///launch.jpg', 'file:///spring.jpg']));
  });

  it('shows the trash accordion when trash contains projects', async () => {
    Object.assign(mockStoreState, {
      homeProjects: {
        allProjects: [],
        foldersWithProjects: [],
        trashProjects: [
          makeProject({
            id: 'project_trash',
            title: 'Deleted',
            isTrashed: true,
            trashedAt: '2026-03-10T10:00:00.000Z',
          }),
        ],
      },
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('Trash');
    expect(texts).toContain('1 project');
  });

  it('opens the source sheet when the create project button is pressed', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen />);
    });

    const fab = renderer!.root.find(
      node =>
        node.props?.accessibilityLabel === 'Create project' &&
        typeof node.props?.onPress === 'function',
    );

    await ReactTestRenderer.act(() => {
      fab.props.onPress();
    });

    const modal = renderer!.root.findByType(Modal);
    expect(modal.props.visible).toBe(true);
  });
});
