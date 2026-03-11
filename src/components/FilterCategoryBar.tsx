import { useMemo } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FILTER_CATEGORIES } from '../filters/filterCatalog';
import type { FilterCategoryId } from '../types/filter';
import { palette } from '../theme/colors';

interface FilterCategoryBarProps {
  favoritesCount: number;
  selectedId: FilterCategoryId;
  onSelect: (id: FilterCategoryId) => void;
}

export function FilterCategoryBar({
  favoritesCount,
  selectedId,
  onSelect,
}: FilterCategoryBarProps) {
  const { i18n, t } = useTranslation();
  const categories = useMemo(
    () =>
      favoritesCount > 0
        ? [
            {
              id: 'favorites' as const,
              titleKey: 'categories.favorites.title',
              subtitleKey: 'categories.favorites.subtitle',
              color: palette.warning,
            },
            ...FILTER_CATEGORIES,
          ]
        : FILTER_CATEGORIES,
    [favoritesCount],
  );

  const resolveCategoryTitle = (category: (typeof categories)[number]) => {
    if (category.id === 'favorites') {
      return t(category.titleKey, {
        defaultValue: i18n.language.startsWith('ru') ? 'Избранное' : 'Favorites',
      });
    }
    return t(category.titleKey);
  };

  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsHorizontalScrollIndicator={false}
    >
      {categories.map(category => {
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="button"
            accessibilityLabel={resolveCategoryTitle(category)}
            style={[
              styles.pill,
              selected ? styles.pillSelected : undefined,
              {
                borderColor: selected ? category.color : palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: category.color,
                },
              ]}
            />
            <Text style={[styles.label, selected ? styles.labelSelected : undefined]}>
              {resolveCategoryTitle(category)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    minHeight: 44,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    backgroundColor: palette.panel,
  },
  pillSelected: {
    backgroundColor: palette.panelElevated,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  labelSelected: {
    color: palette.textPrimary,
  },
});
