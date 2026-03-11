import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { FilterDefinition } from '../types/filter';
import { palette } from '../theme/colors';

interface FilterGridProps {
  filters: FilterDefinition[];
  selectedFilterId: string;
  favorites: string[];
  onSelect: (filterId: string) => void;
  onToggleFavorite: (filterId: string) => void;
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
      estimatedItemSize={pageWidth + 12}
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
                    <Pressable
                      key={filter.id}
                      onPress={() => onSelect(filter.id)}
                      onLongPress={() => onToggleFavorite(filter.id)}
                      accessibilityRole="button"
                      accessibilityLabel={filter.name}
                      style={[
                        styles.card,
                        {
                          width: cardWidth,
                        },
                        selected ? styles.cardSelected : undefined,
                      ]}
                    >
                      <View style={styles.header}>
                        <Text style={styles.name}>{filter.name}</Text>
                        <Text style={styles.heart}>{favorite ? '★' : '☆'}</Text>
                      </View>
                      <Text style={styles.meta}>
                        {filter.operations.length} ops · #{filter.indexInCategory + 1}
                      </Text>
                    </Pressable>
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
  cardSelected: {
    borderColor: palette.accent,
    backgroundColor: '#16273c',
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
    color: palette.warning,
    fontSize: 16,
  },
  meta: {
    marginTop: 6,
    color: palette.textSecondary,
    fontSize: 11,
  },
});
