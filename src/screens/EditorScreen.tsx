import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FILTERS_BY_CATEGORY, FILTERS_BY_ID } from '../filters/filterCatalog';
import type { FilterStack } from '../types/filter';
import {
  MAX_MIX_FILTERS,
  getActiveFilterIds,
  normalizeFilterStack,
  resolveFiltersInStack,
  resolveFilterStack,
} from '../filters/recipe';
import type { HomeStackParamList } from '../navigation/types';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';
import { FilterCategoryBar } from '../components/FilterCategoryBar';
import { FilterGrid } from '../components/FilterGrid';
import { MediaPreview } from '../components/MediaPreview';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenScrollView } from '../components/Screen';
import { useRenderPreview } from '../hooks/useRenderPreview';
import { buildRenderOptions, FilterEngine } from '../native/FilterEngine';
import { MediaPipeline } from '../native/MediaPipeline';
import { mapPickerAsset } from '../utils/media';

type EditorNav = NativeStackNavigationProp<HomeStackParamList, 'Editor'>;

export function EditorScreen() {
  const { i18n, t } = useTranslation();
  const navigation = useNavigation<EditorNav>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    currentAsset,
    previewUri,
    filterStack,
    selectedCategoryId,
    canRedo,
    canUndo,
    favorites,
    commitFilterHistory,
    redoFilterChange,
    resetFilterStack,
    saveCurrentMix,
    setCategory,
    setFilter,
    setIntensity,
    setParameter,
    setCurrentAsset,
    setPreviewUri,
    scheduleAutosave,
    flushAutosave,
    toggleMixMode,
    toggleFavorite,
    undoFilterChange,
    createOrUpdateProject,
  } = useStudioStore();

  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const intensityStartRef = useRef<FilterStack | null>(null);
  const microStartRef = useRef<FilterStack | null>(null);
  const categorySwitchProgress = useSharedValue(1);

  useRenderPreview({
    asset: currentAsset,
    stack: filterStack,
    enabled: !!currentAsset,
    onPreviewReady: uri => {
      startTransition(() => {
        setPreviewUri(uri);
      });
    },
  });

  const filtersForCategory = useMemo(
    () =>
      selectedCategoryId === 'favorites'
        ? favorites.flatMap(filterId => {
            const filter = FILTERS_BY_ID[filterId];
            return filter ? [filter] : [];
          })
        : (FILTERS_BY_CATEGORY[selectedCategoryId] ?? []),
    [favorites, selectedCategoryId],
  );
  const deferredFilters = useDeferredValue(filtersForCategory);
  const activeFilter = resolveFilterStack(filterStack);
  const activeFilters = useMemo(
    () => resolveFiltersInStack(filterStack),
    [filterStack],
  );
  const activeFilterIds = useMemo(
    () => getActiveFilterIds(filterStack),
    [filterStack],
  );
  const mixSignature = useMemo(
    () =>
      JSON.stringify({
        ids: activeFilterIds,
        intensity: filterStack.intensity,
        mixEnabled: filterStack.mixEnabled,
        parameterValues: filterStack.parameterValues,
      }),
    [activeFilterIds, filterStack.intensity, filterStack.mixEnabled, filterStack.parameterValues],
  );
  const isMixMode = Boolean(filterStack.mixEnabled);
  const previewHeight = isMixMode
    ? Math.min(304, Math.max(248, height * 0.31))
    : Math.min(332, Math.max(266, height * 0.35));
  const undoLabel = t('common.undo', {
    defaultValue: i18n.language.startsWith('ru') ? 'Отменить' : 'Undo',
  });
  const redoLabel = t('common.redo', {
    defaultValue: i18n.language.startsWith('ru') ? 'Повторить' : 'Redo',
  });
  const shareLabel = t('common.share', {
    defaultValue: i18n.language.startsWith('ru') ? 'Поделиться' : 'Share',
  });
  const resetLabel = t('common.reset', {
    defaultValue: i18n.language.startsWith('ru') ? 'Сброс' : 'Reset',
  });
  const originalLabel = t('editor.original', {
    defaultValue: i18n.language.startsWith('ru') ? 'Оригинал' : 'Original',
  });
  const mixLabel = t('editor.mix');
  const canReset =
    activeFilterIds.length > 0 ||
    filterStack.intensity !== 1 ||
    filterStack.parameterValues.micro !== 0.5 ||
    filterStack.parameterValues.strength !== 1;

  useEffect(() => {
    categorySwitchProgress.value = 0.84;
    categorySwitchProgress.value = withSpring(1, {
      damping: 18,
      stiffness: 220,
      mass: 0.85,
      velocity: 2.3,
    });
  }, [categorySwitchProgress, selectedCategoryId]);

  useEffect(() => {
    if (!currentAsset) {
      return;
    }
    scheduleAutosave();
  }, [currentAsset, filterStack, previewUri, scheduleAutosave]);

  useEffect(() => {
    if (!isMixMode || activeFilterIds.length < 2) {
      return;
    }
    saveCurrentMix();
  }, [activeFilterIds.length, isMixMode, mixSignature, saveCurrentMix]);

  useEffect(
    () => () => {
      flushAutosave();
    },
    [flushAutosave],
  );

  const gridMotionStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + categorySwitchProgress.value * 0.28,
    transform: [
      { translateX: (1 - categorySwitchProgress.value) * 24 },
      { scale: 0.965 + categorySwitchProgress.value * 0.035 },
    ],
  }));

  const snapshotFilterStack = (stack: FilterStack): FilterStack => ({
    ...normalizeFilterStack(stack),
    mixFilterIds: [...getActiveFilterIds(stack)],
    parameterValues: {
      ...stack.parameterValues,
    },
  });

  const handleImport = async () => {
    const response = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 1,
    });
    const asset = mapPickerAsset(response.assets?.[0] ?? null);
    if (asset) {
      setCurrentAsset(asset, { resetProject: false });
      setStatusLabel(null);
    }
  };

  const handleShare = async () => {
    if (!currentAsset) {
      return;
    }
    setBusy(true);
    try {
      const rendered = await FilterEngine.renderFull(
        currentAsset.uri,
        buildRenderOptions(filterStack, currentAsset.kind),
      );
      const exported =
        currentAsset.kind === 'video'
          ? await MediaPipeline.transcodeVideo(rendered.uri, 'high')
          : await MediaPipeline.exportAsset(rendered.uri, currentAsset.kind, 0.95);
      const project = createOrUpdateProject();
      if (project) {
        setStatusLabel(`Saved ${project.title}`);
      }
      await Share.open({
        url: exported.uri.startsWith('file://')
          ? exported.uri
          : `file://${exported.uri}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    resetFilterStack();
  };

  const handleToggleMixMode = () => {
    toggleMixMode();
    setStatusLabel(isMixMode ? t('editor.mixDisabled') : t('editor.mixEnabled'));
  };

  const handleFilterSelect = (filterId: string) => {
    const isAlreadySelected = activeFilterIds.includes(filterId);
    if (isMixMode && !isAlreadySelected && activeFilterIds.length >= MAX_MIX_FILTERS) {
      setStatusLabel(t('editor.mixLimit', { count: MAX_MIX_FILTERS }));
      return;
    }
    setStatusLabel(null);
    setFilter(filterId);
  };

  const overlayActions = currentAsset ? (
    <>
      <View style={styles.historyGroup}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={undoLabel}
          disabled={!canUndo || busy}
          onPress={undoFilterChange}
          style={[
            styles.headerButton,
            !canUndo || busy ? styles.headerButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.headerButtonLabel}>{undoLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={redoLabel}
          disabled={!canRedo || busy}
          onPress={redoFilterChange}
          style={[
            styles.headerButton,
            !canRedo || busy ? styles.headerButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.headerButtonLabel}>{redoLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resetLabel}
          disabled={!canReset || busy}
          onPress={handleReset}
          style={[
            styles.headerButton,
            !canReset || busy ? styles.headerButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.headerButtonLabel}>{resetLabel}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shareLabel}
        disabled={!currentAsset || busy}
        onPress={handleShare}
        style={[
          styles.shareButton,
          !currentAsset || busy ? styles.headerButtonDisabled : undefined,
        ]}
      >
        <Text style={styles.shareButtonLabel}>
          {busy ? t('common.loading') : shareLabel}
        </Text>
      </Pressable>
    </>
  ) : null;

  return (
    <ScreenScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.container}>
        <View style={styles.navigationRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonLabel}>{t('common.back')}</Text>
          </Pressable>
        </View>
        <MediaPreview
          asset={currentAsset}
          overlayActions={overlayActions}
          previewUri={previewUri}
          originalUri={currentAsset?.uri ?? null}
          style={[
            styles.preview,
            {
              height: previewHeight,
            },
          ]}
        />
        {!currentAsset ? (
          <PrimaryButton
            label={t('common.importMedia')}
            onPress={handleImport}
            style={styles.importButton}
          />
        ) : null}

        <View style={styles.editorTopBar}>
          <View style={styles.editorHeadingGroup}>
            <Text style={styles.editorHeading}>{t('common.editor')}</Text>
            <Text style={styles.editorSubheading}>
              {isMixMode
                ? t('editor.mixCount', {
                    count: activeFilterIds.length,
                    max: MAX_MIX_FILTERS,
                  })
                : t('editor.singleMode')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mixLabel}
            onPress={handleToggleMixMode}
            style={[
              styles.mixButton,
              isMixMode ? styles.mixButtonActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.mixButtonLabel,
                isMixMode ? styles.mixButtonLabelActive : undefined,
              ]}
            >
              {mixLabel}
            </Text>
          </Pressable>
        </View>

        {isMixMode ? (
          <View style={styles.mixPanel}>
            <Text style={styles.mixPanelLabel}>{t('editor.mixSelection')}</Text>
            <View style={styles.mixChipRow}>
              {activeFilters.length > 0 ? (
                activeFilters.map(filter => (
                  <View key={filter.id} style={styles.mixChip}>
                    <Text numberOfLines={1} style={styles.mixChipLabel}>
                      {filter.name}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.mixEmptyLabel}>{t('editor.mixEmpty')}</Text>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.intensityPanel}>
          <Text style={styles.intensityTitle}>
            {isMixMode && activeFilters.length > 1
              ? t('editor.mixActiveTitle', { count: activeFilters.length })
              : activeFilter?.name ?? originalLabel}
          </Text>
          <Text style={styles.intensityValue}>{Math.round(filterStack.intensity * 100)}%</Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={filterStack.intensity}
          minimumTrackTintColor={palette.accent}
          maximumTrackTintColor={palette.border}
          thumbTintColor={palette.accent}
          onSlidingStart={() => {
            intensityStartRef.current = snapshotFilterStack(filterStack);
          }}
          onSlidingComplete={value => {
            setIntensity(value, { trackHistory: false });
            if (intensityStartRef.current) {
              commitFilterHistory(intensityStartRef.current);
              intensityStartRef.current = null;
            }
          }}
          onValueChange={value => setIntensity(value, { trackHistory: false })}
          style={styles.slider}
        />
        <Slider
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={filterStack.parameterValues.micro ?? 0.5}
          minimumTrackTintColor={palette.accentAlt}
          maximumTrackTintColor={palette.border}
          thumbTintColor={palette.accentAlt}
          onSlidingStart={() => {
            microStartRef.current = snapshotFilterStack(filterStack);
          }}
          onSlidingComplete={value => {
            setParameter('micro', value, { trackHistory: false });
            if (microStartRef.current) {
              commitFilterHistory(microStartRef.current);
              microStartRef.current = null;
            }
          }}
          onValueChange={value => setParameter('micro', value, { trackHistory: false })}
          style={styles.slider}
        />

        <FilterCategoryBar
          favoritesCount={favorites.length}
          selectedId={selectedCategoryId}
          onSelect={setCategory}
        />
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {deferredFilters.length} / {filtersForCategory.length} filters
          </Text>
          {statusLabel ? <Text style={styles.statusText}>{statusLabel}</Text> : null}
        </View>
        <Animated.View style={[styles.gridContainer, gridMotionStyle]}>
          <FilterGrid
            favorites={favorites}
            filters={deferredFilters}
            selectedFilterIds={activeFilterIds}
            onSelect={handleFilterSelect}
            onToggleFavorite={toggleFavorite}
          />
        </Animated.View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.bg,
  },
  content: {
    paddingBottom: 8,
  },
  navigationRow: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(13, 20, 36, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonLabel: {
    color: palette.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  editorTopBar: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editorHeadingGroup: {
    flex: 1,
  },
  editorHeading: {
    color: palette.textPrimary,
    fontSize: 26,
    fontWeight: '900',
  },
  editorSubheading: {
    marginTop: 4,
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  mixButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(125, 226, 255, 0.18)',
    backgroundColor: '#131b29',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  mixButtonActive: {
    borderColor: 'rgba(255, 178, 115, 0.44)',
    backgroundColor: 'rgba(255, 178, 115, 0.16)',
  },
  mixButtonLabel: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  mixButtonLabelActive: {
    color: '#ffd0a9',
  },
  historyGroup: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  headerButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(13, 20, 36, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonDisabled: {
    opacity: 0.45,
  },
  headerButtonLabel: {
    color: palette.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  shareButton: {
    borderRadius: 12,
    backgroundColor: palette.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  shareButtonLabel: {
    color: '#041019',
    fontSize: 12,
    fontWeight: '800',
  },
  preview: {
    marginTop: 4,
  },
  importButton: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  mixPanel: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#121927',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mixPanelLabel: {
    color: '#ffbe85',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  mixChipRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mixChip: {
    borderRadius: 999,
    backgroundColor: '#1a2436',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mixChipLabel: {
    color: '#dce7ff',
    fontSize: 12,
    fontWeight: '700',
  },
  mixEmptyLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  intensityPanel: {
    marginTop: 10,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intensityTitle: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  intensityValue: {
    color: palette.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  slider: {
    marginHorizontal: 16,
    marginTop: 1,
  },
  countRow: {
    marginTop: 4,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusText: {
    color: palette.success,
    fontSize: 11,
    fontWeight: '600',
  },
  gridContainer: {
    height: 178,
    marginTop: 2,
  },
});
