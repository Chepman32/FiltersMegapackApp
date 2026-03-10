import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MediaAssetRef } from '../types/media';
import { palette } from '../theme/colors';

interface MediaPreviewProps {
  asset: MediaAssetRef | null;
  previewUri: string | null;
  originalUri: string | null;
}

export function MediaPreview({
  asset,
  previewUri,
  originalUri,
}: MediaPreviewProps) {
  const { t } = useTranslation();
  const [showOriginal, setShowOriginal] = useState(false);

  const imageSource = useMemo<ImageSourcePropType | null>(() => {
    const uri = showOriginal ? originalUri : previewUri ?? originalUri;
    return uri ? { uri } : null;
  }, [originalUri, previewUri, showOriginal]);

  if (!asset || !imageSource) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('editor.noMediaTitle')}</Text>
        <Text style={styles.emptyBody}>{t('editor.noMediaBody')}</Text>
      </View>
    );
  }

  const renderMediaBadge = () => {
    if (asset.kind === 'photo') {
      return null;
    }
    return <Text style={styles.badge}>{asset.kind.toUpperCase()}</Text>;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('editor.compare')}
      onPressIn={() => setShowOriginal(true)}
      onPressOut={() => setShowOriginal(false)}
      style={styles.wrapper}
    >
      <Image resizeMode="cover" source={imageSource} style={styles.image} />
      <View style={styles.overlayTop}>
        <Text style={styles.compare}>{t('editor.compare')}</Text>
        {renderMediaBadge()}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#0a0d16',
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compare: {
    color: '#d8e1ff',
    fontWeight: '600',
    fontSize: 12,
    backgroundColor: 'rgba(10,14,24,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge: {
    color: '#d8e1ff',
    fontWeight: '700',
    fontSize: 11,
    backgroundColor: 'rgba(10,14,24,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  empty: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 20,
    paddingVertical: 30,
    minHeight: 180,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: palette.textSecondary,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
});

