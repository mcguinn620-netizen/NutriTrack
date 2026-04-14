import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useDiningHalls } from '@/hooks/useNetNutrition';
import ErrorView from '@/components/ErrorView';
import { SkeletonList } from '@/components/LoadingSkeletons';

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

  const lastUpdatedLabel = formatLastUpdated(lastUpdated);
  const isRefreshing = refreshing || loading;

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
          <Text style={[styles.refreshButtonText, { color: '#ffffff' }]}>
            {isRefreshing ? 'Refreshing...' : 'Refresh from Database'}
          </Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/stations/${item.id}?hallName=${encodeURIComponent(item.name)}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? colors.surfaceHover : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
            </Pressable>
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
  refreshButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  listContent: { padding: spacing.lg },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  stateText: { ...typography.body },
});
