import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocations } from '@/hooks/useNetNutrition';
import { getLocationMeta, NNLocation } from '@/services/netNutritionService';
import { useFavorites } from '@/hooks/useFavorites';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useCustomMeals } from '@/hooks/useCustomMeals';
import { searchService } from '@/services/searchService';
import { Meal } from '@/services/mockData';
import { MealCard } from '@/components/ui/MealCard';
import { NutritionDetailsModal } from '@/components/feature/NutritionDetailsModal';
import { LoggedMeal } from '@/services/storage';

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { customMeals } = useCustomMeals();
  const today = new Date().toISOString().split('T')[0];
  const { addMeal } = useDailyLog(today);

  const { locations, loading, error, refresh } = useLocations();
  const [refreshing, setRefreshing] = useState(false);

  const searchResults = searchQuery.trim() ? searchService.searchMeals(searchQuery) : [];
  const showingSearch = searchQuery.trim().length > 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleMealPress = (meal: Meal) => {
    setSelectedMeal(meal);
    setModalVisible(true);
  };

  const handleAddMeal = async (meal: LoggedMeal) => {
    await addMeal(meal);
  };

  const renderLocationCard = (loc: NNLocation) => {
    const meta = getLocationMeta(loc.name);
    return (
      <Pressable
        key={loc.oid}
        style={({ pressed }) => [
          styles.locationCard,
          {
            backgroundColor: pressed ? colors.surfaceHover : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => {
            if (loc.oid < 0) {
              // Fallback static location — link to mock detail via name only
              router.push(`/location/${loc.oid}?name=${encodeURIComponent(loc.name)}&static=1`);
            } else {
              router.push(`/location/${loc.oid}?name=${encodeURIComponent(loc.name)}`);
            }
          }}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '18' }]}>
            <MaterialIcons name={meta.icon as any} size={26} color={colors.primary} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.locationName, { color: colors.text }]} numberOfLines={1}>
              {loc.name}
            </Text>
            <Text style={[styles.locationDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {meta.description}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
        </View>
        <View style={[styles.hoursRow, { borderTopColor: colors.borderLight }]}>
          <MaterialIcons name="access-time" size={13} color={colors.textLight} />
          <Text style={[styles.hoursText, { color: colors.textLight }]} numberOfLines={1}>
            {meta.hours}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitles}>
            <Text style={[styles.title, { color: colors.text }]}>Dining Locations</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Live from BSU NetNutrition
            </Text>
          </View>
          <Pressable onPress={() => router.push('/custom-meal')} style={styles.addButton} hitSlop={8}>
            <MaterialIcons name="add-circle" size={28} color={colors.primary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textLight}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.textLight} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Search results ── */}
        {showingSearch ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Results</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {searchResults.length} found
              </Text>
            </View>
            {searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={56} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No results</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Try a different term</Text>
              </View>
            ) : (
              searchResults.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onPress={() => handleMealPress(meal)}
                  isFavorite={isFavorite(meal.id)}
                  onToggleFavorite={() => toggleFavorite(meal.id)}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* ── Custom meals ── */}
            {customMeals.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My Custom Meals</Text>
                {customMeals.map(cm => {
                  const meal: Meal = {
                    id: cm.id, name: cm.name, location: 'Custom', category: 'Custom Meal',
                    servingSize: cm.servingSize, nutrition: cm.nutrition,
                  };
                  return (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onPress={() => handleMealPress(meal)}
                      isFavorite={isFavorite(meal.id)}
                      onToggleFavorite={() => toggleFavorite(meal.id)}
                    />
                  );
                })}
              </>
            )}

            {/* ── Live dining halls ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dining Halls</Text>
              {!loading && (
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {locations.length} locations
                </Text>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading live menus…
                </Text>
              </View>
            ) : error ? (
              <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="wifi-off" size={40} color={colors.textLight} />
                <Text style={[styles.errorTitle, { color: colors.text }]}>Could not reach BSU Dining</Text>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                <Pressable
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={handleRefresh}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : locations.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="restaurant" size={56} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Locations Found</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Pull down to refresh
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.liveIndicator, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.liveText, { color: colors.success }]}>
                    Live data from BSU NetNutrition
                  </Text>
                </View>
                {locations.map(renderLocationCard)}
              </>
            )}
          </>
        )}
      </ScrollView>

      <NutritionDetailsModal
        visible={modalVisible}
        meal={selectedMeal}
        onClose={() => setModalVisible(false)}
        onAddMeal={handleAddMeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerTitles: { flex: 1, marginRight: spacing.sm },
  addButton: { padding: spacing.xs },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: spacing.xs },
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  sectionCount: { ...typography.bodySmall },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { ...typography.bodySmall, fontWeight: '600' },
  locationCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  locationName: { ...typography.body, fontWeight: '700', marginBottom: 3 },
  locationDesc: { ...typography.bodySmall, lineHeight: 18 },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  hoursText: { ...typography.caption, flex: 1 },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  loadingText: { ...typography.body },
  errorCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    gap: spacing.md,
  },
  errorTitle: { ...typography.h3 },
  errorText: { ...typography.bodySmall, textAlign: 'center' },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  retryText: { ...typography.body, color: '#fff', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptyText: { ...typography.body, textAlign: 'center' },
});
