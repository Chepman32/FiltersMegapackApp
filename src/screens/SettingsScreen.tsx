import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../localization/i18n';
import { palette } from '../theme/colors';
import { useStudioStore } from '../store/useStudioStore';
import { FilterEngine, type FilterEngineCapabilities } from '../native/FilterEngine';

const APP_VERSION = '1.0.0';

export function SettingsScreen() {
  const { t } = useTranslation();
  const {
    language,
    performanceMode,
    setLanguage,
    setPerformanceMode,
    clearRecents,
    setOnboardingSeen,
  } = useStudioStore();
  const [capabilities, setCapabilities] = useState<FilterEngineCapabilities | null>(null);

  useEffect(() => {
    FilterEngine.listCapabilities().then(setCapabilities).catch(() => {
      setCapabilities(null);
    });
  }, []);

  const switchLanguage = async (nextLanguage: 'en' | 'ru') => {
    setLanguage(nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('common.settings')}</Text>

      <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {(['en', 'ru'] as const).map(lng => (
          <Pressable
            key={lng}
            onPress={() => switchLanguage(lng)}
            style={[
              styles.choice,
              language === lng ? styles.choiceActive : undefined,
            ]}
          >
            <Text style={styles.choiceLabel}>{lng.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('settings.performance')}</Text>
      <Pressable
        onPress={() => setPerformanceMode(!performanceMode)}
        style={[styles.choice, performanceMode ? styles.choiceActive : undefined]}
      >
        <Text style={styles.choiceLabel}>{performanceMode ? 'ON' : 'OFF'}</Text>
      </Pressable>

      <Pressable onPress={clearRecents} style={styles.action}>
        <Text style={styles.actionLabel}>{t('settings.clearRecents')}</Text>
      </Pressable>
      <Pressable onPress={() => setOnboardingSeen(false)} style={styles.action}>
        <Text style={styles.actionLabel}>{t('settings.resetOnboarding')}</Text>
      </Pressable>

      <View style={styles.capabilities}>
        <Text style={styles.sectionTitle}>Native capabilities</Text>
        <Text style={styles.capabilityText}>
          Metal:{' '}
          {capabilities?.supportsMetal === undefined
            ? 'unknown'
            : capabilities.supportsMetal
              ? 'yes'
              : 'no'}
        </Text>
        <Text style={styles.capabilityText}>
          Live Photo: {capabilities?.supportsLivePhoto ? 'yes' : 'no'}
        </Text>
        <Text style={styles.capabilityText}>
          GIF pipeline: {capabilities?.supportsGif ? 'yes' : 'no'}
        </Text>
      </View>

      <Text style={styles.version}>
        {t('settings.appVersion')}: {APP_VERSION}
      </Text>
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
    paddingBottom: 40,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 27,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    color: palette.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  choice: {
    minWidth: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceActive: {
    borderColor: palette.accent,
    backgroundColor: '#16293e',
  },
  choiceLabel: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  action: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  actionLabel: {
    color: palette.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  capabilities: {
    marginTop: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  capabilityText: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  version: {
    marginTop: 20,
    color: palette.textSecondary,
    fontSize: 12,
  },
});

