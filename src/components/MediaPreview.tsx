import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { MediaAssetRef } from '../types/media';
import { palette } from '../theme/colors';

interface MediaPreviewProps {
  asset: MediaAssetRef | null;
  previewUri: string | null;
  originalUri: string | null;
  style?: StyleProp<ViewStyle>;
  overlayActions?: ReactNode;
}

const IOS_OVERLAY_SPRING = {
  damping: 20,
  stiffness: 250,
  mass: 0.82,
  velocity: 2.6,
};

export function MediaPreview({
  asset,
  previewUri,
  originalUri,
  style,
  overlayActions,
}: MediaPreviewProps) {
  const { t } = useTranslation();
  const [showOriginal, setShowOriginal] = useState(false);
  const compareVisibility = useSharedValue(1);

  const imageSource = useMemo<ImageSourcePropType | null>(() => {
    const uri = showOriginal ? originalUri : previewUri ?? originalUri;
    return uri ? { uri } : null;
  }, [originalUri, previewUri, showOriginal]);

  useEffect(() => {
    compareVisibility.value = withSpring(showOriginal ? 0 : 1, IOS_OVERLAY_SPRING);
  }, [compareVisibility, showOriginal]);

  const compareStyle = useAnimatedStyle(() => ({
    opacity: compareVisibility.value,
    transform: [
      { translateY: -10 * (1 - compareVisibility.value) },
      { scale: 0.88 + compareVisibility.value * 0.12 },
    ],
  }));

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
    <View style={[styles.wrapper, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('editor.compare')}
        onPressIn={() => setShowOriginal(true)}
        onPressOut={() => setShowOriginal(false)}
        style={styles.imagePressable}
      >
        <Image resizeMode="cover" source={imageSource} style={styles.image} />
      </Pressable>
      <View pointerEvents="box-none" style={styles.overlayContainer}>
        <View style={styles.actionRow}>{overlayActions}</View>
        <View style={styles.overlayTop}>
          <Animated.View style={compareStyle}>
            <Text style={styles.compare}>{t('editor.compare')}</Text>
          </Animated.View>
          {renderMediaBadge()}
        </View>
      </View>
    </View>
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
  imagePressable: {
    flex: 1,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  overlayTop: {
    marginTop: 10,
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
