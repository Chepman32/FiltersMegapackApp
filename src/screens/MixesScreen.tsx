import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getFilterById } from '../filters/filterCatalog';
import { getActiveFilterIds } from '../filters/recipe';
import type { StudioTabsParamList } from '../navigation/types';
import { ScreenView } from '../components/Screen';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';

type MixesNav = BottomTabNavigationProp<StudioTabsParamList, 'MixesTab'>;

export function MixesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<MixesNav>();
  const mixes = useStudioStore(state => state.mixes);
  const applyMix = useStudioStore(state => state.applyMix);

  const handleOpenMix = (mixId: string) => {
    const mix = applyMix(mixId);
    if (!mix) {
      return;
    }
    navigation.navigate('HomeTab', {
      screen: 'Editor',
    });
  };

  return (
    <ScreenView style={styles.container}>
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t('mixes.eyebrow')}</Text>
        <Text style={styles.title}>{t('mixes.title')}</Text>
        <Text style={styles.subtitle}>{t('mixes.subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mixes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('mixes.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('mixes.emptyBody')}</Text>
          </View>
        ) : (
          mixes.map(mix => {
            const filters = getActiveFilterIds(mix.filterStack).map(getFilterById);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={mix.name}
                key={mix.id}
                onPress={() => handleOpenMix(mix.id)}
                style={({ pressed }) => [
                  styles.mixCard,
                  pressed ? styles.mixCardPressed : undefined,
                ]}
              >
                <View style={styles.mixCardTop}>
                  <Text numberOfLines={1} style={styles.mixTitle}>
                    {mix.name}
                  </Text>
                  <Text style={styles.mixCount}>
                    {t('mixes.filtersCount', { count: filters.length })}
                  </Text>
                </View>

                <View style={styles.mixChipRow}>
                  {filters.map(filter => (
                    <View key={filter.id} style={styles.mixChip}>
                      <Text numberOfLines={1} style={styles.mixChipLabel}>
                        {filter.name}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.mixCardFooter}>
                  <Text style={styles.mixDate}>
                    {new Date(mix.updatedAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.mixApplyLabel}>{t('mixes.apply')}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d15',
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 156, 94, 0.14)',
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    top: 160,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(125, 226, 255, 0.12)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  eyebrow: {
    color: '#ffb273',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
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
    color: '#afbbd6',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 120,
    gap: 14,
  },
  emptyCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    backgroundColor: 'rgba(17, 23, 36, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    marginTop: 8,
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  mixCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(16, 22, 35, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  mixCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  mixCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mixTitle: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  mixCount: {
    color: '#ffb273',
    fontSize: 12,
    fontWeight: '700',
  },
  mixChipRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mixChip: {
    borderRadius: 999,
    backgroundColor: '#182032',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mixChipLabel: {
    color: '#dce7ff',
    fontSize: 12,
    fontWeight: '700',
  },
  mixCardFooter: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mixDate: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  mixApplyLabel: {
    color: '#7de2ff',
    fontSize: 12,
    fontWeight: '800',
  },
});
