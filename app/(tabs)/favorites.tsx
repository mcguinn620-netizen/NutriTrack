import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useDailyLog } from '@/hooks/useDailyLog';
import { mockMeals, Meal } from '@/services/mockData';
import { useCustomMeals } from '@/hooks/useCustomMeals';
import { MealCard } from '@/components/ui/MealCard';
import { NutritionDetailsModal } from '@/components/feature/NutritionDetailsModal';
import { LoggedMeal } from '@/services/storage';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { toggleFavorite, isFavorite } = useFavorites();
  const today = new Date().toISOString().split('T')[0];
  const { addMeal } = useDailyLog(today);
  const { customMeals } = useCustomMeals();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const customAsMeals: Meal[] = customMeals.map(cm => ({
    id: cm.id, name: cm.name, location: 'Custom', category: 'Custom Meal',
    servingSize: cm.servingSize, nutrition: cm.nutrition,
  }));
  const allMeals = [...mockMeals, ...customAsMeals];
  const favoriteMeals = allMeals.filter(meal => isFavorite(meal.id));

  const handleMealPress = (meal: Meal) => {
    setSelectedMeal(meal);
    setModalVisible(true);
  };

  const handleAddMeal = async (meal: LoggedMeal) => {
    await addMeal(meal);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Quick access to your favorite meals</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {favoriteMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite-border" size={64} color={colors.textLight} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Favorites Yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Tap the heart icon on any meal to save it here for quick access
            </Text>
          </View>
        ) : (
          favoriteMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onPress={() => handleMealPress(meal)}
              isFavorite={isFavorite(meal.id)}
              onToggleFavorite={() => toggleFavorite(meal.id)}
            />
          ))
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
});
