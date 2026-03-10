import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StudioTabsParamList } from '../navigation/types';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';

type ProjectsNav = BottomTabNavigationProp<StudioTabsParamList>;

export function ProjectsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ProjectsNav>();
  const projects = useStudioStore(state => state.projects);
  const refreshProjects = useStudioStore(state => state.refreshProjects);
  const createOrUpdateProject = useStudioStore(state => state.createOrUpdateProject);
  const openProject = useStudioStore(state => state.openProject);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('projects.title')}</Text>
        <Text style={styles.subtitle}>{t('projects.subtitle')}</Text>
      </View>
      <PrimaryButton
        label={t('projects.newProject')}
        onPress={() => {
          createOrUpdateProject(`Project ${new Date().toLocaleTimeString()}`);
          refreshProjects();
        }}
        style={styles.newProjectButton}
      />

      <FlashList
        data={projects}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('projects.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => {
              openProject(item.id);
              navigation.navigate('EditorTab');
            }}
            style={styles.card}
          >
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.projectTitle}>
                {item.title}
              </Text>
              <Text style={styles.projectDate}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.meta}>
              {item.assets.length} assets · {item.history.length} edits
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    color: palette.textPrimary,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  newProjectButton: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  projectTitle: {
    color: palette.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  projectDate: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    marginTop: 6,
    color: palette.textSecondary,
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
});
