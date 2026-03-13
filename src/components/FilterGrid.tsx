import { useEffect, useMemo, useState } from 'react';
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
  selectedFilterIds: string[];
  favorites: string[];
  onSelect: (filterId: string) => void;
  onToggleFavorite: (filterId: string) => void;
}

const PAGE_HORIZONTAL_PADDING = 16;
const CARD_GAP = 8;
const FILTERS_PER_PAGE = 4;

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
  mixOrder?: number;
  onSelect: (filterId: string) => void;
  onToggleFavorite: (filterId: string) => void;
  selected: boolean;
}

function FilterCard({
  cardWidth,
  favorite,
  filter,
  mixOrder,
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
        {typeof mixOrder === 'number' ? (
          <View style={styles.mixBadge}>
            <Text style={styles.mixBadgeLabel}>{mixOrder}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function FilterGrid({
  filters,
  selectedFilterIds,
  favorites,
  onSelect,
  onToggleFavorite,
}: FilterGridProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(0);
  const pageWidth = viewportWidth || windowWidth;
  const cardWidth = Math.max(
    0,
    (pageWidth - PAGE_HORIZONTAL_PADDING * 2 - CARD_GAP) / 2,
  );
  const pages = useMemo(() => {
    const next: FilterDefinition[][] = [];
    for (let index = 0; index < filters.length; index += FILTERS_PER_PAGE) {
      next.push(filters.slice(index, index + FILTERS_PER_PAGE));
    }
    return next;
  }, [filters]);

  return (
    <View
      onLayout={event => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        setViewportWidth(currentWidth =>
          currentWidth === nextWidth ? currentWidth : nextWidth,
        );
      }}
      style={styles.viewport}
    >
      <FlashList
        data={pages}
        horizontal
        decelerationRate="fast"
        disableIntervalMomentum
        estimatedItemSize={pageWidth}
        extraData={{ favorites, selectedFilterIds, pageWidth }}
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
                    const mixOrder = selectedFilterIds.indexOf(filter.id);
                    const selected = mixOrder !== -1;
                    const favorite = favorites.includes(filter.id);

                    return (
                      <FilterCard
                        cardWidth={cardWidth}
                        favorite={favorite}
                        key={filter.id}
                        filter={filter}
                        mixOrder={selected ? mixOrder + 1 : undefined}
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
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
  },
  content: {
    paddingVertical: 4,
  },
  page: {
    justifyContent: 'space-between',
    paddingHorizontal: PAGE_HORIZONTAL_PADDING,
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
  mixBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(125, 226, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(125, 226, 255, 0.38)',
  },
  mixBadgeLabel: {
    color: palette.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
});
