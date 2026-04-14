import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFoodItems } from '@/hooks/useNetNutrition';
import { FoodItem } from '@/services/netNutritionService';
import ErrorView from '@/components/ErrorView';
import { SkeletonList } from '@/components/LoadingSkeletons';

function formatNutrientLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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

  const allergenOptions = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.allergens))).sort(),
    [items],
  );
  const flagOptions = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.dietary_flags))).sort(),
    [items],
  );

  const hasActiveFilters = selectedAllergens.length > 0 || selectedFlags.length > 0;
  const lastUpdatedLabel = formatLastUpdated(lastUpdated);

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

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const nutrientEntries = Object.entries(item.nutrients ?? {});

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Serving Size: {item.serving_size}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Allergens: {item.allergens.join(', ') || 'None'}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Dietary Flags: {item.dietary_flags.join(', ') || 'None'}</Text>

        <View style={styles.nutrientsContainer}>
          <Text style={[styles.nutrientsTitle, { color: colors.text }]}>Nutrients</Text>
          {nutrientEntries.length === 0 ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>N/A</Text>
          ) : (
            nutrientEntries.map(([key, value]) => (
              <View key={`${item.id}-${key}`} style={styles.nutrientRow}>
                <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>{formatNutrientLabel(key)}</Text>
                <Text style={[styles.nutrientValue, { color: colors.text }]}>{String(value)}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
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
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          {allergenOptions.map((allergen) => (
            <Pressable
              key={`a-${allergen}`}
              onPress={() => toggleFilter(allergen, selectedAllergens, setSelectedAllergens)}
              style={[styles.chip, { backgroundColor: selectedAllergens.includes(allergen) ? colors.primary : colors.surface, borderColor: colors.border }]}
            >
              <Text style={{ color: selectedAllergens.includes(allergen) ? '#fff' : colors.text }}>A: {allergen}</Text>
            </Pressable>
          ))}
          {flagOptions.map((flag) => (
            <Pressable
              key={`f-${flag}`}
              onPress={() => toggleFilter(flag, selectedFlags, setSelectedFlags)}
              style={[styles.chip, { backgroundColor: selectedFlags.includes(flag) ? colors.primary : colors.surface, borderColor: colors.border }]}
            >
              <Text style={{ color: selectedFlags.includes(flag) ? '#fff' : colors.text }}>D: {flag}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={clearFilters}
          style={[
            styles.clearButton,
            {
              backgroundColor: hasActiveFilters ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={{
              color: hasActiveFilters ? '#fff' : colors.textSecondary,
              fontWeight: hasActiveFilters ? '600' : '400',
            }}
          >
            Clear Filters
          </Text>
        </Pressable>
      </View>

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
          renderItem={renderFoodItem}
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
  filterRow: { marginBottom: spacing.sm },
  filtersContainer: { paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm, paddingRight: spacing.xl },
  chip: { borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  clearButton: {
    alignSelf: 'flex-end',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  name: { ...typography.h3, marginBottom: spacing.xs },
  meta: { ...typography.bodySmall, marginBottom: 4 },
  nutrientsContainer: { marginTop: spacing.xs, gap: 4 },
  nutrientsTitle: { ...typography.body, fontWeight: '600' },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nutrientLabel: { ...typography.bodySmall, flex: 1 },
  nutrientValue: { ...typography.bodySmall, fontWeight: '600' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  stateText: { ...typography.body, textAlign: 'center' },
  emptyTitle: { ...typography.h3, marginBottom: spacing.xs, textAlign: 'center' },
});
