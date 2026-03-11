import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FILTER_CATEGORIES } from '../filters/filterCatalog';
import type { FilterCategoryId } from '../types/filter';
import { palette } from '../theme/colors';

interface FilterCategoryBarProps {
  selectedId: FilterCategoryId;
  onSelect: (id: FilterCategoryId) => void;
}

export function FilterCategoryBar({
  selectedId,
  onSelect,
}: FilterCategoryBarProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.container}
      showsHorizontalScrollIndicator={false}
    >
      {FILTER_CATEGORIES.map(category => {
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="button"
            accessibilityLabel={t(category.titleKey)}
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
              {t(category.titleKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
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
