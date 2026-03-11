import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { Asset, ImagePickerResponse } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StudioTabsParamList } from '../navigation/types';
import { useStudioStore } from '../store/useStudioStore';
import { mapPickerAsset } from '../utils/media';
import { palette } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenView } from '../components/Screen';

type CameraNav = BottomTabNavigationProp<StudioTabsParamList>;

export function CameraScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<CameraNav>();
  const setCurrentAsset = useStudioStore(state => state.setCurrentAsset);
  const [loading, setLoading] = useState(false);

  const handlePickerResult = (asset: Asset | null) => {
    if (!asset) {
      return;
    }
    const mapped = mapPickerAsset(asset);
    if (!mapped) {
      return;
    }
    setCurrentAsset(mapped);
    navigation.navigate('EditorTab');
  };

  const withLoading = async (
    action: () => Promise<ImagePickerResponse>,
  ) => {
    setLoading(true);
    try {
      const response = await action();
      handlePickerResult(response.assets?.[0] ?? null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenView style={styles.container}>
      <Text style={styles.title}>{t('camera.title')}</Text>
      <Text style={styles.subtitle}>{t('camera.subtitle')}</Text>

      <PrimaryButton
        disabled={loading}
        label={t('camera.capturePhoto')}
        onPress={() =>
          withLoading(() =>
            launchCamera({
              mediaType: 'photo',
              includeExtra: true,
              saveToPhotos: true,
            }),
          )
        }
        style={styles.button}
      />
      <PrimaryButton
        disabled={loading}
        label={t('camera.captureVideo')}
        onPress={() =>
          withLoading(() =>
            launchCamera({
              mediaType: 'video',
              videoQuality: 'high',
              saveToPhotos: true,
              durationLimit: 30,
            }),
          )
        }
        style={styles.button}
      />
      <PrimaryButton
        disabled={loading}
        label={t('camera.importFromLibrary')}
        onPress={() =>
          withLoading(() =>
            launchImageLibrary({
              mediaType: 'mixed',
              selectionLimit: 1,
            }),
          )
        }
        style={styles.button}
      />
      <Text style={styles.note}>
        {loading ? t('common.loading') : `${t('common.camera')} · 240 filters ready`}
      </Text>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 24,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginBottom: 12,
  },
  note: {
    marginTop: 16,
    color: palette.textSecondary,
    fontSize: 12,
  },
});
