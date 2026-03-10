import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { mapPickerAsset } from '../utils/media';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';

const LAYOUTS = [2, 3, 4, 6, 9] as const;

export function CollageScreen() {
  const { t } = useTranslation();
  const currentAsset = useStudioStore(state => state.currentAsset);
  const [assets, setAssets] = useState(() => (currentAsset ? [currentAsset] : []));
  const [layoutSize, setLayoutSize] = useState<(typeof LAYOUTS)[number]>(4);

  const slots = useMemo(() => {
    const next = Array.from({ length: layoutSize }, (_, index) => assets[index] ?? null);
    return next;
  }, [assets, layoutSize]);

  const handleAddAsset = async () => {
    const response = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 1,
    });
    const mapped = mapPickerAsset(response.assets?.[0] ?? null);
    if (mapped) {
      setAssets(prev => [mapped, ...prev].slice(0, 9));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('collage.title')}</Text>
      <Text style={styles.subtitle}>{t('collage.subtitle')}</Text>

      <View style={styles.layoutRow}>
        {LAYOUTS.map(size => (
          <Pressable
            key={size}
            onPress={() => setLayoutSize(size)}
            style={[
              styles.layoutChip,
              size === layoutSize ? styles.layoutChipActive : undefined,
            ]}
          >
            <Text style={styles.layoutLabel}>{size}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {slots.map((slot, index) => (
          <View key={index} style={styles.cell}>
            {slot ? (
              <Image source={{ uri: slot.uri }} style={styles.image} resizeMode="cover" />
            ) : (
              <Text style={styles.placeholder}>+</Text>
            )}
          </View>
        ))}
      </View>

      <PrimaryButton label={t('collage.addSlot')} onPress={handleAddAsset} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  layoutChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  layoutChipActive: {
    borderColor: palette.accent,
    backgroundColor: '#16273b',
  },
  layoutLabel: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cell: {
    width: '31%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: palette.panel,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    color: palette.textSecondary,
    fontSize: 24,
    fontWeight: '500',
  },
});

