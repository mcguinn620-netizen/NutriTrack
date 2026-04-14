import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFoodItems } from '@/hooks/useNetNutrition';
import { FoodItem } from '@/services/netNutritionService';
import { getFavoriteFoodItemIds, toggleFavoriteFoodItem } from '@/services/favoritesService';
import { recordRecentFoodItem } from '@/services/recentItemsService';
import ErrorView from '@/components/ErrorView';
import { SkeletonList } from '@/components/LoadingSkeletons';
import FoodItemCard from '@/components/FoodItemCard';
import FilterPanel from '@/components/FilterPanel';

function formatLastUpdated(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FoodItemsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { stationId, stationName } = useLocalSearchParams<{ stationId: string; stationName?: string }>();
  const { data: items, loading, refreshing, error, refresh, lastUpdated, isOfflineFallback } = useFoodItems(stationId);

  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const initialFavorites = await getFavoriteFoodItemIds();
      setFavorites(initialFavorites);
    })();
  }, []);

  const allergenOptions = useMemo(() => Array.from(new Set(items.flatMap((item) => item.allergens))).sort(), [items]);
  const flagOptions = useMemo(() => Array.from(new Set(items.flatMap((item) => item.dietary_flags))).sort(), [items]);

  const hasActiveFilters = selectedAllergens.length > 0 || selectedFlags.length > 0;
  const lastUpdatedLabel = formatLastUpdated(lastUpdated);
  const isRefreshing = refreshing || loading;

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        return (
          selectedAllergens.every((a) => item.allergens.includes(a)) &&
          selectedFlags.every((f) => item.dietary_flags.includes(f))
        );
      }),
    [items, selectedAllergens, selectedFlags],
  );

  const clearFilters = () => {
    setSelectedAllergens([]);
    setSelectedFlags([]);
  };

  const toggleFilter = (value: string, selected: string[], setSelected: (next: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const handleToggleFavorite = async (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
    const persisted = await toggleFavoriteFoodItem(id);
    setFavorites(persisted);
  };

  const handleViewItem = async (item: FoodItem) => {
    await recordRecentFoodItem({
      id: item.id,
      name: item.name,
      station_id: item.station_id,
      station_name: stationName,
    });
  };

  const renderEmptyState = () => {
    if (items.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>No data available</Text>
        </View>
      );
    }

    if (hasActiveFilters && filteredItems.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching items</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>Try removing one or more filters.</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{stationName || 'Food Items'}</Text>
        {lastUpdatedLabel ? (
          <Text style={[styles.lastUpdated, { color: colors.textLight }]}>Last updated: {lastUpdatedLabel}</Text>
        ) : null}
        {isOfflineFallback ? (
          <View style={[styles.banner, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}> 
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>Offline – showing last saved data</Text>
          </View>
        ) : null}
        <Pressable
          onPress={refresh}
          disabled={isRefreshing}
          style={({ pressed }) => [
            styles.refreshButton,
            {
              backgroundColor: pressed ? colors.primaryDark ?? colors.primary : colors.primary,
              opacity: isRefreshing ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.refreshButtonText}>{isRefreshing ? 'Refreshing...' : 'Refresh from Database'}</Text>
        </Pressable>
      </View>

      <FilterPanel
        open={filtersOpen}
        allergenOptions={allergenOptions}
        flagOptions={flagOptions}
        selectedAllergens={selectedAllergens}
        selectedFlags={selectedFlags}
        onToggleOpen={() => setFiltersOpen((prev) => !prev)}
        onToggleAllergen={(value) => toggleFilter(value, selectedAllergens, setSelectedAllergens)}
        onToggleFlag={(value) => toggleFilter(value, selectedFlags, setSelectedFlags)}
        onClear={clearFilters}
      />

      {loading ? (
        <SkeletonList count={5} type="food" />
      ) : error ? (
        <ErrorView message={error} onRetry={refresh} />
      ) : filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={({ item }) => (
            <FoodItemCard
              item={item}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={handleToggleFavorite}
              onViewed={handleViewItem}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...typography.h1 },
  lastUpdated: { ...typography.bodySmall, marginTop: spacing.xs },
  banner: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  bannerText: { ...typography.bodySmall },
  refreshButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: '#ffffff',
  },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  stateText: { ...typography.body, textAlign: 'center' },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs, textAlign: 'center' },
});
