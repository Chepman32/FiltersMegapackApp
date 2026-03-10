import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  return (
    <FlashList
      data={filters}
      numColumns={2}
      keyExtractor={item => item.id}
      renderItem={({ item }) => {
        const selected = item.id === selectedFilterId;
        const favorite = favorites.includes(item.id);
        return (
          <Pressable
            onPress={() => onSelect(item.id)}
            onLongPress={() => onToggleFavorite(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={[
              styles.card,
              selected ? styles.cardSelected : undefined,
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.heart}>{favorite ? '★' : '☆'}</Text>
            </View>
            <Text style={styles.meta}>
              {item.operations.length} ops · #{item.indexInCategory + 1}
            </Text>
          </Pressable>
        );
      }}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    flex: 1,
    minHeight: 74,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    paddingHorizontal: 10,
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
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  heart: {
    color: palette.warning,
    fontSize: 14,
  },
  meta: {
    marginTop: 8,
    color: palette.textSecondary,
    fontSize: 11,
  },
});
