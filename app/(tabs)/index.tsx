import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useDiningHalls } from '@/hooks/useNetNutrition';

export default function DiningHallsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: diningHalls, loading, error, refresh } = useDiningHalls();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const isRefreshing = refreshing || loading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dining Halls</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select a hall to view stations</Text>
        <Pressable
          onPress={onRefresh}
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
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>Loading dining halls…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.error }]}>Error: {error}</Text>
          <Pressable
            onPress={onRefresh}
            disabled={isRefreshing}
            style={({ pressed }) => [
              styles.refreshButton,
              styles.centerRefreshButton,
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
      ) : diningHalls.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>No data available</Text>
          <Pressable
            onPress={onRefresh}
            disabled={isRefreshing}
            style={({ pressed }) => [
              styles.refreshButton,
              styles.centerRefreshButton,
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
      ) : (
        <FlatList
          data={diningHalls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  centerRefreshButton: {
    marginTop: spacing.md,
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
  errorText: { ...typography.body, textAlign: 'center' },
});
