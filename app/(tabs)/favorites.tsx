import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { getFavoriteFoodItemIds, toggleFavoriteFoodItem } from '@/services/favoritesService';
import { FoodItem, getFoodItemsByIds } from '@/services/netNutritionService';
import { MealCategory } from '@/services/mealLogService';
import { useTray } from '@/components/tray/TrayContext';

const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addItem, hasItem, removeItem, addItemToMeal } = useTray();
  const [favoriteItems, setFavoriteItems] = useState<FoodItem[]>([]);
  const [selectedCategoryByItem, setSelectedCategoryByItem] = useState<Record<string, MealCategory>>({});

  const loadFavorites = useCallback(async () => {
    const ids = await getFavoriteFoodItemIds();
    if (ids.length === 0) {
      setFavoriteItems([]);
      return;
    }

    const items = await getFoodItemsByIds(ids);
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    setFavoriteItems(sorted);
    setSelectedCategoryByItem((prev) => {
      const next = { ...prev };
      sorted.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = 'lunch';
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites]),
  );

  const handleToggleFavorite = async (id: string) => {
    await toggleFavoriteFoodItem(id);
    await loadFavorites();
  };

  const handleLogDirectly = async (item: FoodItem) => {
    const category = selectedCategoryByItem[item.id] ?? 'lunch';
    await addItemToMeal(item, category, { source: 'favorites' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Saved food items with quick tray and meal logging</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {favoriteItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite-border" size={64} color={colors.textLight} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Favorites Yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Tap the heart icon on food items to save them here.</Text>
          </View>
        ) : (
          favoriteItems.map((item) => {
            const selectedCategory = selectedCategoryByItem[item.id] ?? 'lunch';
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}> 
                <View style={styles.row}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Pressable onPress={() => handleToggleFavorite(item.id)} hitSlop={8}>
                    <MaterialIcons name="favorite" size={22} color={colors.error} />
                  </Pressable>
                </View>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Serving: {item.serving_size || 'N/A'}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {String(item.nutrients.calories ?? 0)} cal • P {String(item.nutrients.protein ?? 0)} • C {String(item.nutrients.carbs ?? item.nutrients.carbohydrates ?? 0)} • F {String(item.nutrients.fat ?? 0)}
                </Text>

                <View style={styles.categoryRow}>
                  {MEAL_CATEGORIES.map((category) => (
                    <Pressable
                      key={`${item.id}-${category}`}
                      onPress={() => setSelectedCategoryByItem((prev) => ({ ...prev, [item.id]: category }))}
                      style={[
                        styles.categoryButton,
                        {
                          borderColor: selectedCategory === category ? colors.primary : colors.border,
                          backgroundColor: selectedCategory === category ? `${colors.primary}22` : colors.background,
                        },
                      ]}
                    >
                      <Text style={[styles.categoryButtonText, { color: selectedCategory === category ? colors.primary : colors.textSecondary }]}>{category}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => (hasItem(item.id) ? removeItem(item.id) : addItem(item))}
                    style={[styles.actionButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>{hasItem(item.id) ? 'Remove Tray' : 'Add to Tray'}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleLogDirectly(item)} style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}> 
                    <Text style={styles.primaryActionButtonText}>Log to {selectedCategory}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.body },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyStateText: { ...typography.body, textAlign: 'center' },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { ...typography.h3, flex: 1, marginRight: spacing.sm },
  itemMeta: { ...typography.bodySmall, marginTop: 2 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  categoryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryButtonText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, flex: 1, alignItems: 'center' },
  actionButtonText: { ...typography.bodySmall, fontWeight: '600' },
  primaryActionButton: { borderRadius: borderRadius.md, padding: spacing.sm, flex: 1, alignItems: 'center' },
  primaryActionButtonText: { ...typography.bodySmall, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
});
