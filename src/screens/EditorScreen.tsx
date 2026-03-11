import { startTransition, useDeferredValue, useMemo, useRef, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { FILTERS_BY_CATEGORY, FILTERS_BY_ID } from '../filters/filterCatalog';
import type { FilterStack } from '../types/filter';
import {
  NONE_FILTER_ID,
  resolveFilterStack,
} from '../filters/recipe';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';
import { FilterCategoryBar } from '../components/FilterCategoryBar';
import { FilterGrid } from '../components/FilterGrid';
import { MediaPreview } from '../components/MediaPreview';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenView } from '../components/Screen';
import { useRenderPreview } from '../hooks/useRenderPreview';
import { buildRenderOptions, FilterEngine } from '../native/FilterEngine';
import { MediaPipeline } from '../native/MediaPipeline';
import { mapPickerAsset } from '../utils/media';

export function EditorScreen() {
  const { i18n, t } = useTranslation();
  const { height } = useWindowDimensions();
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
    setCategory,
    setFilter,
    setIntensity,
    setParameter,
    setCurrentAsset,
    setPreviewUri,
    toggleFavorite,
    undoFilterChange,
    createOrUpdateProject,
  } = useStudioStore();

  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const intensityStartRef = useRef<FilterStack | null>(null);
  const microStartRef = useRef<FilterStack | null>(null);

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
  const previewHeight = Math.min(380, Math.max(290, height * 0.4));
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
  const canReset =
    filterStack.filterId !== NONE_FILTER_ID ||
    filterStack.intensity !== 1 ||
    filterStack.parameterValues.micro !== 0.5 ||
    filterStack.parameterValues.strength !== 1;

  const snapshotFilterStack = (stack: FilterStack): FilterStack => ({
    ...stack,
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
      setCurrentAsset(asset);
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
      setStatusLabel(`Saved ${project.title}`);
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
    <ScreenView style={styles.container}>
      <View style={styles.content}>
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

        <View style={styles.intensityPanel}>
          <Text style={styles.intensityTitle}>{activeFilter?.name ?? originalLabel}</Text>
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
        <View style={styles.gridContainer}>
          <FilterGrid
            favorites={favorites}
            filters={deferredFilters}
            selectedFilterId={filterStack.filterId}
            onSelect={filterId => {
              setFilter(filterId);
            }}
            onToggleFavorite={toggleFavorite}
          />
        </View>
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1,
    paddingBottom: 8,
  },
  historyGroup: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 1,
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
