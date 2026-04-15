import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useStations } from '@/hooks/useNetNutrition';
import ErrorView from '@/components/ErrorView';
import { SkeletonList } from '@/components/LoadingSkeletons';
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

export default function StationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hallId, hallName } = useLocalSearchParams<{ hallId: string; hallName?: string }>();
  const { data: stations, loading, refreshing, error, refresh, lastUpdated, isOfflineFallback } = useStations(hallId);

  const lastUpdatedLabel = formatLastUpdated(lastUpdated);
  const isRefreshing = refreshing || loading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{hallName || 'Stations'}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select a station to view food items</Text>
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
        <SkeletonList count={6} type="station" />
      ) : error ? (
        <ErrorView message={error} onRetry={refresh} />
      ) : stations.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>No data available</Text>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={({ item }) => (
            <CardSurface
              style={styles.card}
              onPress={() => router.push(`/food-items/${item.id}?stationName=${encodeURIComponent(item.name)}`)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.surfaceHover }]}>
                  <MaterialIcons name="ramen-dining" size={18} color={colors.primary} />
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Browse available food items</Text>
              <MetaRow icon="touch-app" text="Tap to open station menu" />
            </CardSurface>
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
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  card: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  cardTitle: { ...typography.h3 },
  cardSubtitle: { ...typography.bodySmall, marginTop: 2 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  stateText: { ...typography.body },
});
