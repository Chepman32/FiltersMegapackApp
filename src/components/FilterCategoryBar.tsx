import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FILTER_CATEGORIES } from '../filters/filterCatalog';
import type { FilterCategoryId } from '../types/filter';
import { palette } from '../theme/colors';

interface FilterCategoryBarProps {
  favoritesCount: number;
  selectedId: FilterCategoryId;
  onSelect: (id: FilterCategoryId) => void;
}

const IOS_SPRING = {
  damping: 18,
  stiffness: 220,
  mass: 0.85,
  velocity: 2.4,
};

interface CategoryPillProps {
  color: string;
  label: string;
  onPress: () => void;
  selected: boolean;
  onLayout?: (x: number) => void;
}

function CategoryPill({
  color,
  label,
  onPress,
  selected,
  onLayout,
}: CategoryPillProps) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, IOS_SPRING);
  }, [progress, selected]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.panel, palette.panelElevated],
    ),
    borderColor: interpolateColor(progress.value, [0, 1], [palette.border, color]),
    shadowColor: color,
    shadowOpacity: progress.value * 0.18,
    shadowRadius: 14 * progress.value,
    shadowOffset: {
      width: 0,
      height: 8 * progress.value,
    },
    transform: [
      { scale: 1 + progress.value * 0.045 },
      { translateY: -2 * progress.value },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [palette.textSecondary, palette.textPrimary],
    ),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.2 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLayout={e => onLayout?.(e.nativeEvent.layout.x)}
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
        <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function FilterCategoryBar({
  favoritesCount,
  selectedId,
  onSelect,
}: FilterCategoryBarProps) {
  const { i18n, t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const pillXPositions = useRef(new Map<string, number>());

  useEffect(() => {
    const x = pillXPositions.current.get(selectedId);
    if (x != null) {
      scrollViewRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
    }
  }, [selectedId]);
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
      ref={scrollViewRef}
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsHorizontalScrollIndicator={false}
    >
      {categories.map(category => {
        const selected = category.id === selectedId;
        const label = resolveCategoryTitle(category);
        return (
          <CategoryPill
            color={category.color}
            key={category.id}
            onPress={() => onSelect(category.id)}
            label={label}
            selected={selected}
            onLayout={x => pillXPositions.current.set(category.id, x)}
          />
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
