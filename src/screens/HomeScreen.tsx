import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated as NativeAnimated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pickSingle, isCancel as isDocumentPickerCancel, types } from 'react-native-document-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Reanimated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { HomeStackParamList } from '../navigation/types';
import { IOSContextMenu, type IOSContextMenuAction } from '../components/IOSContextMenu';
import { ScreenView } from '../components/Screen';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';
import type { FolderDocument } from '../types/folder';
import type { ProjectDocument } from '../types/project';
import { mapDocumentAsset, mapPickerAsset } from '../utils/media';

type HomeNav = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

type SectionState = Record<string, boolean>;

const SOURCE_OPTIONS = ['gallery', 'files', 'camera'] as const;
const ACCORDION_LAYOUT = LinearTransition.springify()
  .damping(18)
  .stiffness(210)
  .mass(0.92);
const CHEVRON_SPRING = {
  damping: 18,
  stiffness: 220,
  mass: 0.86,
  velocity: 2.6,
};

interface AccordionSectionProps {
  actions?: IOSContextMenuAction[];
  count: number;
  emptyLabel: string;
  isExpanded: boolean;
  onHeaderAction?: (actionId: string) => void;
  onToggle: () => void;
  projects: ProjectDocument[];
  renderProjectCard: (project: ProjectDocument) => ReactElement;
  title: string;
}

function AccordionSection({
  actions,
  count,
  emptyLabel,
  isExpanded,
  onHeaderAction,
  onToggle,
  projects,
  renderProjectCard,
  title,
}: AccordionSectionProps) {
  const { t } = useTranslation();
  const chevronProgress = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    chevronProgress.value = withSpring(isExpanded ? 1 : 0, CHEVRON_SPRING);
  }, [chevronProgress, isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + chevronProgress.value * 0.28,
    transform: [
      { rotate: `${chevronProgress.value * 90}deg` },
      { scale: 0.94 + chevronProgress.value * 0.08 },
    ],
  }));

  const headerContent = (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionMeta}>
          {t('home.sections.projectCount', { count })}
        </Text>
      </View>
      <Reanimated.Text style={[styles.sectionChevron, chevronStyle]}>
        ›
      </Reanimated.Text>
    </View>
  );

  return (
    <Reanimated.View layout={ACCORDION_LAYOUT} style={styles.sectionCard}>
      {actions && onHeaderAction ? (
        <IOSContextMenu
          actions={actions}
          onPress={onToggle}
          onPressAction={onHeaderAction}
          style={styles.sectionHeaderShell}
        >
          {headerContent}
        </IOSContextMenu>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={onToggle}
          style={styles.sectionHeaderShell}
        >
          {headerContent}
        </Pressable>
      )}

      {isExpanded ? (
        <Reanimated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(130)}
          layout={ACCORDION_LAYOUT}
          style={styles.sectionBody}
        >
          {projects.length > 0 ? (
            <Reanimated.View layout={ACCORDION_LAYOUT} style={styles.projectGrid}>
              {projects.map(renderProjectCard)}
            </Reanimated.View>
          ) : (
            <Reanimated.View layout={ACCORDION_LAYOUT} style={styles.emptySection}>
              <Text style={styles.emptySectionText}>{emptyLabel}</Text>
            </Reanimated.View>
          )}
        </Reanimated.View>
      ) : null}
    </Reanimated.View>
  );
}

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNav>();
  const {
    folders,
    homeProjects,
    createFolder,
    cleanTrash,
    duplicateProject,
    moveProjectToFolder,
    openProject,
    recoverProject,
    refreshProjects,
    removeFolder,
    removeProjectPermanently,
    renameFolder,
    renameProject,
    setCurrentAsset,
    trashProject,
  } = useStudioStore();
  const [sourceSheetMounted, setSourceSheetMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<SectionState>({
    all: true,
    trash: false,
  });
  const sheetProgress = useRef(new NativeAnimated.Value(0)).current;

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    setExpandedSections(previous => {
      const next: SectionState = {
        all: previous.all ?? true,
        trash: previous.trash ?? false,
      };
      homeProjects.foldersWithProjects.forEach(({ folder }) => {
        next[folder.id] = previous[folder.id] ?? true;
      });
      return next;
    });
  }, [homeProjects.foldersWithProjects]);

  useEffect(() => {
    if (!sourceSheetMounted) {
      return;
    }

    sheetProgress.setValue(0);
    NativeAnimated.spring(sheetProgress, {
      toValue: 1,
      friction: 8,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [sheetProgress, sourceSheetMounted]);

  const userFolderTargets = useMemo(
    () =>
      folders.map(folder => ({
        id: folder.id,
        title: folder.name,
      })),
    [folders],
  );

  const openSourceSheet = () => {
    setSourceSheetMounted(true);
  };

  const closeSourceSheet = (callback?: () => void) => {
    NativeAnimated.timing(sheetProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setSourceSheetMounted(false);
      callback?.();
    });
  };

  const promptForText = (
    title: string,
    defaultValue: string,
    onSubmit: (value: string) => void,
  ) => {
    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt(
        title,
        undefined,
        [
          {
            style: 'cancel',
            text: t('common.cancel'),
          },
          {
            text: t('common.save'),
            onPress: (value?: string) => {
              const trimmed = value?.trim();
              if (trimmed) {
                onSubmit(trimmed);
              }
            },
          },
        ],
        'plain-text',
        defaultValue,
      );
      return;
    }
    Alert.alert(title, t('home.prompts.iosOnly'));
  };

  const startEditingProjectAsset = (projectAssetAction: () => Promise<void>) => {
    closeSourceSheet(() => {
      projectAssetAction().catch(error => {
        console.warn('Failed to import media', error);
      });
    });
  };

  const handlePickedAsset = (uriAction: ReturnType<typeof mapPickerAsset> | ReturnType<typeof mapDocumentAsset>) => {
    if (!uriAction) {
      return;
    }
    setCurrentAsset(uriAction, { resetProject: true });
    navigation.navigate('Editor');
  };

  const handleOpenGallery = () => {
    startEditingProjectAsset(async () => {
      const response = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 1,
        includeExtra: true,
      });
      handlePickedAsset(mapPickerAsset(response.assets?.[0] ?? null));
    });
  };

  const handleOpenFiles = () => {
    startEditingProjectAsset(async () => {
      try {
        const file = await pickSingle({
          copyTo: 'cachesDirectory',
          mode: 'import',
          presentationStyle: 'formSheet',
          type: [types.images, types.video],
        });
        handlePickedAsset(mapDocumentAsset(file));
      } catch (error) {
        if (!isDocumentPickerCancel(error)) {
          throw error;
        }
      }
    });
  };

  const launchCameraForMode = (mode: 'photo' | 'video') => {
    startEditingProjectAsset(async () => {
      const response = await launchCamera(
        mode === 'photo'
          ? {
              mediaType: 'photo',
              includeExtra: true,
              saveToPhotos: true,
            }
          : {
              mediaType: 'video',
              videoQuality: 'high',
              saveToPhotos: true,
              durationLimit: 30,
            },
      );
      handlePickedAsset(mapPickerAsset(response.assets?.[0] ?? null));
    });
  };

  const handleOpenCamera = () => {
    closeSourceSheet(() => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            cancelButtonIndex: 2,
            options: [
              t('home.source.cameraPhoto'),
              t('home.source.cameraVideo'),
              t('common.cancel'),
            ],
          },
          buttonIndex => {
            if (buttonIndex === 0) {
              launchCameraForMode('photo');
            }
            if (buttonIndex === 1) {
              launchCameraForMode('video');
            }
          },
        );
        return;
      }
      launchCameraForMode('photo');
    });
  };

  const handleSourceSelect = (source: (typeof SOURCE_OPTIONS)[number]) => {
    if (source === 'gallery') {
      handleOpenGallery();
      return;
    }
    if (source === 'files') {
      handleOpenFiles();
      return;
    }
    handleOpenCamera();
  };

  const toggleSection = (key: string) => {
    setExpandedSections(state => ({
      ...state,
      [key]: !(state[key] ?? true),
    }));
  };

  const handleOpenProject = (project: ProjectDocument) => {
    if (project.isTrashed) {
      return;
    }
    const opened = openProject(project.id);
    if (opened) {
      navigation.navigate('Editor');
    }
  };

  const confirmFolderRemoval = (folder: FolderDocument) => {
    Alert.alert(
      t('home.folders.removeTitle', { name: folder.name }),
      t('home.folders.removeBody'),
      [
        {
          style: 'cancel',
          text: t('common.cancel'),
        },
        {
          style: 'destructive',
          text: t('home.actions.remove'),
          onPress: () => removeFolder(folder.id),
        },
      ],
    );
  };

  const confirmPermanentRemoval = (project: ProjectDocument) => {
    Alert.alert(
      t('home.projects.removePermanentTitle', { name: project.title }),
      t('home.projects.removePermanentBody'),
      [
        {
          style: 'cancel',
          text: t('common.cancel'),
        },
        {
          style: 'destructive',
          text: t('home.actions.removePermanently'),
          onPress: () => removeProjectPermanently(project.id),
        },
      ],
    );
  };

  const confirmTrashCleanup = () => {
    Alert.alert(
      t('home.trash.cleanTitle'),
      t('home.trash.cleanBody'),
      [
        {
          style: 'cancel',
          text: t('common.cancel'),
        },
        {
          style: 'destructive',
          text: t('home.actions.cleanTrash'),
          onPress: cleanTrash,
        },
      ],
    );
  };

  const handleProjectMenuAction = (project: ProjectDocument, actionId: string) => {
    if (actionId === 'rename') {
      promptForText(
        t('home.projects.renameTitle'),
        project.title,
        value => renameProject(project.id, value),
      );
      return;
    }
    if (actionId === 'duplicate') {
      duplicateProject(project.id);
      return;
    }
    if (actionId === 'remove') {
      trashProject(project.id);
      return;
    }
    if (actionId === 'recover') {
      recoverProject(project.id);
      return;
    }
    if (actionId === 'remove-permanently') {
      confirmPermanentRemoval(project);
      return;
    }
    if (actionId.startsWith('move:')) {
      const nextFolderId = actionId === 'move:root' ? null : actionId.replace('move:', '');
      moveProjectToFolder(project.id, nextFolderId);
    }
  };

  const handleFolderMenuAction = (folder: FolderDocument, actionId: string) => {
    if (actionId === 'rename') {
      promptForText(
        t('home.folders.renameTitle'),
        folder.name,
        value => renameFolder(folder.id, value),
      );
      return;
    }
    if (actionId === 'remove') {
      confirmFolderRemoval(folder);
    }
  };

  const projectMenuActions = (project: ProjectDocument): IOSContextMenuAction[] => {
    if (project.isTrashed) {
      return [
        {
          id: 'recover',
          systemIcon: 'arrow.uturn.backward',
          title: t('home.actions.recover'),
        },
        {
          id: 'remove-permanently',
          destructive: true,
          systemIcon: 'trash',
          title: t('home.actions.removePermanently'),
        },
      ];
    }

    return [
      {
        id: 'rename',
        systemIcon: 'pencil',
        title: t('home.actions.rename'),
      },
      {
        id: 'duplicate',
        systemIcon: 'plus.square.on.square',
        title: t('home.actions.duplicate'),
      },
      {
        id: 'move',
        systemIcon: 'folder',
        title: t('home.actions.moveToFolder'),
        children: [
          {
            id: 'move:root',
            systemIcon: 'tray',
            title: t('home.folders.noFolder'),
          },
          ...userFolderTargets.map(folder => ({
            id: `move:${folder.id}`,
            systemIcon: 'folder',
            title: folder.title,
          })),
        ],
      },
      {
        id: 'remove',
        destructive: true,
        systemIcon: 'trash',
        title: t('home.actions.remove'),
      },
    ];
  };

  const folderMenuActions = useMemo<IOSContextMenuAction[]>(
    () => [
      {
        id: 'rename',
        systemIcon: 'pencil',
        title: t('home.actions.rename'),
      },
      {
        id: 'remove',
        destructive: true,
        systemIcon: 'trash',
        title: t('home.actions.remove'),
      },
    ],
    [t],
  );

  const trashMenuActions = useMemo<IOSContextMenuAction[]>(
    () => [
      {
        id: 'clean-trash',
        destructive: true,
        systemIcon: 'trash.slash',
        title: t('home.actions.cleanTrash'),
      },
    ],
    [t],
  );

  const renderProjectCard = (project: ProjectDocument) => (
    <IOSContextMenu
      accessibilityLabel={project.title}
      accessibilityRole="button"
      actions={projectMenuActions(project)}
      key={project.id}
      onPress={project.isTrashed ? undefined : () => handleOpenProject(project)}
      onPressAction={actionId => handleProjectMenuAction(project, actionId)}
      style={styles.projectCardShell}
    >
      <View
        collapsable={false}
        style={[
          styles.projectCard,
          project.isTrashed ? styles.projectCardTrashed : undefined,
        ]}
      >
        <View collapsable={false} style={styles.projectPreviewWrap}>
          {project.coverUri ? (
            <Image source={{ uri: project.coverUri }} style={styles.projectPreview} />
          ) : (
            <View style={[styles.projectPreview, styles.projectPreviewFallback]}>
              <Text style={styles.projectPreviewFallbackLabel}>
                {project.title.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.projectPreviewOverlay}>
            <Text style={styles.projectBadge}>
              {project.isTrashed
                ? t('home.sections.trash')
                : project.folderId
                  ? t('home.projects.inFolder')
                  : t('home.projects.inLibrary')}
            </Text>
          </View>
        </View>
        <View style={styles.projectCopy}>
          <Text numberOfLines={1} style={styles.projectTitle}>
            {project.title}
          </Text>
          <Text style={styles.projectMeta}>
            {t('home.projects.assetsCount', { count: project.assets.length })} ·{' '}
            {new Date(project.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </IOSContextMenu>
  );

  const overlayOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sheetTranslate = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  return (
    <ScreenView style={styles.container}>
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            promptForText(t('home.folders.newFolderTitle'), '', value => createFolder(value))
          }
          style={({ pressed }) => [
            styles.newFolderButton,
            pressed ? styles.newFolderButtonPressed : undefined,
          ]}
        >
          <Text style={styles.newFolderButtonLabel}>{t('home.folders.newFolder')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <AccordionSection
          count={homeProjects.allProjects.length}
          emptyLabel={t('home.empty.allProjects')}
          isExpanded={expandedSections.all ?? true}
          onToggle={() => toggleSection('all')}
          projects={homeProjects.allProjects}
          renderProjectCard={renderProjectCard}
          title={t('home.sections.allProjects')}
        />
        {homeProjects.foldersWithProjects.map(({ folder, projects }) =>
          (
            <AccordionSection
              actions={folderMenuActions}
              count={projects.length}
              emptyLabel={t('home.empty.folder')}
              isExpanded={expandedSections[folder.id] ?? true}
              key={folder.id}
              onHeaderAction={actionId => handleFolderMenuAction(folder, actionId)}
              onToggle={() => toggleSection(folder.id)}
              projects={projects}
              renderProjectCard={renderProjectCard}
              title={folder.name}
            />
          ),
        )}
        {homeProjects.trashProjects.length > 0
          ? (
            <AccordionSection
              actions={trashMenuActions}
              count={homeProjects.trashProjects.length}
              emptyLabel={t('home.empty.trash')}
              isExpanded={expandedSections.trash ?? false}
              onHeaderAction={actionId => {
                if (actionId === 'clean-trash') {
                  confirmTrashCleanup();
                }
              }}
              onToggle={() => toggleSection('trash')}
              projects={homeProjects.trashProjects}
              renderProjectCard={renderProjectCard}
              title={t('home.sections.trash')}
            />
          )
          : null}
      </ScrollView>

      <Pressable
        accessibilityLabel={t('home.source.fab')}
        accessibilityRole="button"
        onPress={openSourceSheet}
        style={({ pressed }) => [
          styles.fab,
          pressed ? styles.fabPressed : undefined,
        ]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={() => closeSourceSheet()}
        transparent
        visible={sourceSheetMounted}
      >
        <View style={styles.modalRoot}>
          <NativeAnimated.View style={[styles.modalBackdrop, { opacity: overlayOpacity }]}>
            <Pressable onPress={() => closeSourceSheet()} style={StyleSheet.absoluteFill} />
          </NativeAnimated.View>
          <NativeAnimated.View
            style={[
              styles.modalSheet,
              {
                opacity: sheetProgress,
                transform: [{ translateY: sheetTranslate }],
              },
            ]}
          >
            <Text style={styles.modalEyebrow}>{t('home.source.eyebrow')}</Text>
            <Text style={styles.modalTitle}>{t('home.source.title')}</Text>
            <Text style={styles.modalSubtitle}>{t('home.source.subtitle')}</Text>

            <View style={styles.sourceGrid}>
              {SOURCE_OPTIONS.map(source => (
                <Pressable
                  key={source}
                  onPress={() => handleSourceSelect(source)}
                  style={({ pressed }) => [
                    styles.sourceCard,
                    pressed ? styles.sourceCardPressed : undefined,
                  ]}
                >
                  <View style={styles.sourceIcon}>
                    <Text style={styles.sourceIconLabel}>
                      {t(`home.source.icons.${source}` as const)}
                    </Text>
                  </View>
                  <Text style={styles.sourceLabel}>{t(`home.source.${source}` as const)}</Text>
                  <Text style={styles.sourceHint}>
                    {t(`home.source.${source}Hint` as const)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => closeSourceSheet()} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonLabel}>{t('common.cancel')}</Text>
            </Pressable>
          </NativeAnimated.View>
        </View>
      </Modal>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b12',
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(101,214,255,0.14)',
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    top: 130,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,143,164,0.12)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {
    color: '#7de2ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: palette.textPrimary,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    color: '#b0bad3',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
  },
  newFolderButton: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: 'rgba(19,26,38,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(125,226,255,0.24)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  newFolderButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  newFolderButtonLabel: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 140,
    gap: 14,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,20,31,0.92)',
    overflow: 'hidden',
  },
  sectionHeaderShell: {
    width: '100%',
  },
  sectionBody: {
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionMeta: {
    marginTop: 4,
    color: palette.textSecondary,
    fontSize: 12,
  },
  sectionChevron: {
    color: '#d7e0fa',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
  projectGrid: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  projectCardShell: {
    width: '48%',
  },
  projectCard: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#121828',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  projectCardTrashed: {
    opacity: 0.78,
  },
  projectPreviewWrap: {
    height: 142,
    backgroundColor: '#0c121f',
  },
  projectPreview: {
    width: '100%',
    height: '100%',
  },
  projectPreviewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b2436',
  },
  projectPreviewFallbackLabel: {
    color: '#dce6ff',
    fontSize: 36,
    fontWeight: '800',
  },
  projectPreviewOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  projectBadge: {
    color: '#f3f7ff',
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    backgroundColor: 'rgba(9,13,20,0.62)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  projectCopy: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  projectTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  projectMeta: {
    marginTop: 6,
    color: palette.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  emptySection: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  emptySectionText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 34,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.97 }],
  },
  fabPlus: {
    color: '#051019',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '300',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,7,13,0.58)',
  },
  modalSheet: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 30,
    backgroundColor: '#0e1421',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  modalEyebrow: {
    color: '#7de2ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  modalTitle: {
    marginTop: 8,
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  modalSubtitle: {
    marginTop: 8,
    color: '#a8b3cf',
    fontSize: 14,
    lineHeight: 20,
  },
  sourceGrid: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  sourceCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#151d2d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  sourceCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(125,226,255,0.16)',
  },
  sourceIconLabel: {
    color: '#dff7ff',
    fontSize: 14,
    fontWeight: '800',
  },
  sourceLabel: {
    marginTop: 14,
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  sourceHint: {
    marginTop: 6,
    color: '#96a1bc',
    fontSize: 12,
    lineHeight: 16,
  },
  modalCloseButton: {
    marginTop: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171f30',
    paddingVertical: 14,
  },
  modalCloseButtonLabel: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
