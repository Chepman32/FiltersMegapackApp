import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { FilterDefinition } from '../types/filter';
import { palette } from '../theme/colors';

interface FilterGridProps {
  filters: FilterDefinition[];
  selectedFilterId: string;
  favorites: string[];
  onSelect: (filterId: string) => void;
  onToggleFavorite: (filterId: string) => void;
}

const IOS_CARD_SPRING = {
  damping: 20,
  stiffness: 230,
  mass: 0.84,
  velocity: 2.1,
};

interface FilterCardProps {
  cardWidth: number;
  favorite: boolean;
  filter: FilterDefinition;
  onSelect: (filterId: string) => void;
  onToggleFavorite: (filterId: string) => void;
  selected: boolean;
}

function FilterCard({
  cardWidth,
  favorite,
  filter,
  onSelect,
  onToggleFavorite,
  selected,
}: FilterCardProps) {
  const { t } = useTranslation();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, IOS_CARD_SPRING);
  }, [progress, selected]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.panel, '#16273c'],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.border, palette.accent],
    ),
    shadowColor: palette.accent,
    shadowOpacity: progress.value * 0.16,
    shadowRadius: 14 * progress.value,
    shadowOffset: {
      width: 0,
      height: 8 * progress.value,
    },
    transform: [
      { scale: 1 + progress.value * 0.026 },
      { translateY: -2.5 * progress.value },
    ],
  }));

  const nameStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [palette.textPrimary, '#f5f9ff'],
    ),
  }));

  const metaStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [palette.textSecondary, '#a9c9ec'],
    ),
  }));

  return (
    <Pressable
      accessibilityLabel={filter.name}
      accessibilityRole="button"
      onPress={() => onSelect(filter.id)}
      style={{ width: cardWidth }}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.header}>
          <Animated.Text style={[styles.name, nameStyle]}>{filter.name}</Animated.Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('editor.favorite')}
            hitSlop={8}
            onPress={event => {
              event.stopPropagation();
              onToggleFavorite(filter.id);
            }}
            style={styles.favoriteButton}
          >
            <Text
              style={[
                styles.heart,
                favorite ? styles.heartActive : styles.heartInactive,
              ]}
            >
              {favorite ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>
        <Animated.Text style={[styles.meta, metaStyle]}>
          {filter.operations.length} ops · #{filter.indexInCategory + 1}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function FilterGrid({
  filters,
  selectedFilterId,
  favorites,
  onSelect,
  onToggleFavorite,
}: FilterGridProps) {
  const { width } = useWindowDimensions();
  const pageWidth = width - 32;
  const cardWidth = (pageWidth - 8) / 2;
  const pages = useMemo(() => {
    const next: FilterDefinition[][] = [];
    for (let index = 0; index < filters.length; index += 4) {
      next.push(filters.slice(index, index + 4));
    }
    return next;
  }, [filters]);

  return (
    <FlashList
      data={pages}
      horizontal
      decelerationRate="fast"
      disableIntervalMomentum
      extraData={{ favorites, selectedFilterId }}
      keyExtractor={(item, index) => item[0]?.id ?? `page-${index}`}
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => {
        const rows = [item.slice(0, 2), item.slice(2, 4)];

        return (
          <View style={[styles.page, { width: pageWidth }]}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map(filter => {
                  const selected = filter.id === selectedFilterId;
                  const favorite = favorites.includes(filter.id);

                  return (
                    <FilterCard
                      cardWidth={cardWidth}
                      favorite={favorite}
                      key={filter.id}
                      filter={filter}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                      selected={selected}
                    />
                  );
                })}
                {row.length === 1 ? <View style={{ width: cardWidth }} /> : null}
              </View>
            ))}
          </View>
        );
      }}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  page: {
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    height: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  heart: {
    fontSize: 16,
  },
  heartActive: {
    color: palette.warning,
  },
  heartInactive: {
    color: palette.textSecondary,
  },
  favoriteButton: {
    paddingLeft: 4,
    paddingVertical: 2,
  },
  meta: {
    marginTop: 6,
    color: palette.textSecondary,
    fontSize: 11,
  },
});
