import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
import { useTranslation } from 'react-i18next';
import { FILTERS_BY_CATEGORY, getFilterById } from '../filters/filterCatalog';
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
  const { t } = useTranslation();
  const {
    currentAsset,
    previewUri,
    filterStack,
    selectedCategoryId,
    favorites,
    setCategory,
    setFilter,
    setIntensity,
    setParameter,
    setCurrentAsset,
    setPreviewUri,
    toggleFavorite,
    createOrUpdateProject,
  } = useStudioStore();

  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    () => FILTERS_BY_CATEGORY[selectedCategoryId],
    [selectedCategoryId],
  );
  const deferredFilters = useDeferredValue(filtersForCategory);
  const activeFilter = getFilterById(filterStack.filterId);

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

  const handleExport = async () => {
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

  return (
    <ScreenView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <MediaPreview
          asset={currentAsset}
          previewUri={previewUri}
          originalUri={currentAsset?.uri ?? null}
        />
        {!currentAsset ? (
          <PrimaryButton
            label={t('common.importMedia')}
            onPress={handleImport}
            style={styles.importButton}
          />
        ) : null}

        <View style={styles.intensityPanel}>
          <Text style={styles.intensityTitle}>{activeFilter.name}</Text>
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
          onValueChange={setIntensity}
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
          onValueChange={value => setParameter('micro', value)}
          style={styles.slider}
        />

        <FilterCategoryBar selectedId={selectedCategoryId} onSelect={setCategory} />
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
            onSelect={setFilter}
            onToggleFavorite={toggleFavorite}
          />
        </View>
      </ScrollView>
      <PrimaryButton
        disabled={!currentAsset || busy}
        label={busy ? t('common.loading') : t('common.export')}
        onPress={handleExport}
        style={styles.exportButton}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  importButton: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  intensityPanel: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intensityTitle: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  intensityValue: {
    color: palette.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  slider: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  countRow: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    minHeight: 420,
  },
  exportButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 6,
  },
});
