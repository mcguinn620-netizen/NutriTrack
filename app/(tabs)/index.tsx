import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useDiningHalls } from '@/hooks/useNetNutrition';
import { getRecentFoodItemEntries, RecentFoodItem } from '@/services/recentItemsService';
import ErrorView from '@/components/ErrorView';
import { SkeletonList } from '@/components/LoadingSkeletons';
import RecentItemsSection from '@/components/RecentItemsSection';
import CardSurface from '@/components/ui/CardSurface';
import { MetaRow } from '@/components/ui/primitives';

function formatLastUpdated(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DiningHallsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: diningHalls, loading, refreshing, error, refresh, lastUpdated, isOfflineFallback } = useDiningHalls();
  const [recentItems, setRecentItems] = useState<RecentFoodItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const entries = await getRecentFoodItemEntries();
        if (active) {
          setRecentItems(entries);
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const lastUpdatedLabel = formatLastUpdated(lastUpdated);
  const isRefreshing = refreshing || loading;

  const handleOpenRecentItem = (item: RecentFoodItem) => {
    if (item.station_id) {
      router.push(`/food-items/${item.station_id}?stationName=${encodeURIComponent(item.station_name ?? 'Food Items')}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dining Halls</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select a hall to view stations</Text>
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

      {loading ? (
        <SkeletonList count={6} type="hall" />
      ) : error ? (
        <ErrorView message={error} onRetry={refresh} />
      ) : diningHalls.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>No data available</Text>
        </View>
      ) : (
        <FlatList
          data={diningHalls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<RecentItemsSection items={recentItems} onPressItem={handleOpenRecentItem} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={({ item }) => {
            const stationCount = (item as { station_count?: number }).station_count;

            return (
              <CardSurface
                style={styles.card}
                onPress={() => router.push(`/stations/${item.id}?hallName=${encodeURIComponent(item.name)}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBadge, { backgroundColor: colors.surfaceHover }]}>
                    <MaterialIcons name="apartment" size={18} color={colors.primary} />
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Fresh menus and nutrition details</Text>
                <MetaRow
                  icon="restaurant"
                  text={typeof stationCount === 'number' ? `${stationCount} stations` : 'Station count unavailable'}
                  right={<Text style={[styles.metaHint, { color: colors.textLight }]}>Open</Text>}
                />
              </CardSurface>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { ...typography.h1 },
  subtitle: { ...typography.body },
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
  refreshButtonText: { ...typography.bodySmall, color: '#ffffff', fontWeight: '700' },
  listContent: { paddingBottom: spacing.lg },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  cardTitle: { ...typography.h3 },
  cardSubtitle: { ...typography.bodySmall, marginTop: 2 },
  metaHint: { ...typography.caption, fontWeight: '700' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  stateText: { ...typography.body },
});
