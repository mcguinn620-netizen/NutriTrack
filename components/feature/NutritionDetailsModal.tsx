import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Meal } from '@/services/mockData';
import { MacroCard } from '@/components/ui/MacroCard';
import { LoggedMeal } from '@/services/storage';

interface NutritionDetailsModalProps {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onAddMeal: (meal: LoggedMeal) => void;
}

const MEAL_TIMES: Array<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'> = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
];

export function NutritionDetailsModal({
  visible,
  meal,
  onClose,
  onAddMeal,
}: NutritionDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedMealTime, setSelectedMealTime] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Lunch');

  if (!meal) return null;

  const totalMacros = meal.nutrition.protein + meal.nutrition.carbs + meal.nutrition.fat;
  const proteinPercentage = totalMacros > 0 ? Math.round((meal.nutrition.protein / totalMacros) * 100) : 0;
  const carbsPercentage = totalMacros > 0 ? Math.round((meal.nutrition.carbs / totalMacros) * 100) : 0;
  const fatPercentage = totalMacros > 0 ? Math.round((meal.nutrition.fat / totalMacros) * 100) : 0;

  const handleAddMeal = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const loggedMeal: LoggedMeal = {
      mealId: meal.id,
      mealName: meal.name,
      mealTime: selectedMealTime,
      nutrition: meal.nutrition,
      timestamp: now.toISOString(),
      date: today,
    };
    onAddMeal(loggedMeal);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <MaterialIcons name="arrow-back" size={28} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{meal.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {meal.location} • {meal.category}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.caloriesCard, { backgroundColor: colors.primary }]}>
            <Text style={[styles.caloriesValue, { color: colors.surface }]}>{meal.nutrition.calories}</Text>
            <Text style={[styles.caloriesLabel, { color: colors.surface }]}>Calories</Text>
            <Text style={[styles.servingSize, { color: colors.surface }]}>{meal.servingSize}</Text>
            {(meal.isVegetarian || meal.isVegan || meal.isGlutenFree) && (
              <View style={styles.dietaryBadges}>
                {meal.isVegan && (
                  <View style={styles.dietaryBadge}>
                    <Text style={styles.dietaryBadgeText}>🌱 Vegan</Text>
                  </View>
                )}
                {meal.isVegetarian && !meal.isVegan && (
                  <View style={styles.dietaryBadge}>
                    <Text style={styles.dietaryBadgeText}>🥚 Vegetarian</Text>
                  </View>
                )}
                {meal.isGlutenFree && (
                  <View style={styles.dietaryBadge}>
                    <Text style={styles.dietaryBadgeText}>🌾 Gluten-Free</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Macronutrients</Text>
          <MacroCard
            label="Protein"
            value={meal.nutrition.protein}
            unit="g"
            color={colors.protein}
            percentage={proteinPercentage}
          />
          <MacroCard
            label="Carbohydrates"
            value={meal.nutrition.carbs}
            unit="g"
            color={colors.carbs}
            percentage={carbsPercentage}
          />
          <MacroCard
            label="Fat"
            value={meal.nutrition.fat}
            unit="g"
            color={colors.fat}
            percentage={fatPercentage}
          />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Other Nutrients</Text>
          {[
            { label: 'Fiber', value: `${meal.nutrition.fiber}g` },
            { label: 'Sugar', value: `${meal.nutrition.sugar}g` },
            { label: 'Sodium', value: `${meal.nutrition.sodium}mg` },
            { label: 'Cholesterol', value: `${meal.nutrition.cholesterol}mg` },
          ].map((item) => (
            <View key={item.label} style={[styles.nutrientRow, { backgroundColor: colors.surface }]}>
              <Text style={[styles.nutrientLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.nutrientValue, { color: colors.textSecondary }]}>{item.value}</Text>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add to Meal Time</Text>
          <View style={styles.mealTimeContainer}>
            {MEAL_TIMES.map((time) => (
              <Pressable
                key={time}
                style={[
                  styles.mealTimeButton,
                  {
                    backgroundColor: selectedMealTime === time ? colors.primary + '15' : colors.surface,
                    borderColor: selectedMealTime === time ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedMealTime(time)}
              >
                <Text
                  style={[
                    styles.mealTimeText,
                    { color: selectedMealTime === time ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + spacing.md,
          }
        ]}>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: pressed ? colors.primaryDark : colors.primary },
            ]}
            onPress={handleAddMeal}
          >
            <MaterialIcons name="add" size={24} color="#ffffff" />
            <Text style={styles.addButtonText}>Add to Daily Log</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  caloriesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dietaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  dietaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dietaryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: spacing.xs,
    opacity: 1,
  },
  caloriesLabel: {
    ...typography.h3,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  servingSize: {
    ...typography.bodySmall,
    opacity: 0.8,
  },
  sectionTitle: {
    ...typography.h3,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  nutrientLabel: {
    ...typography.body,
  },
  nutrientValue: {
    ...typography.body,
    fontWeight: '600',
  },
  mealTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  mealTimeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  mealTimeText: {
    ...typography.body,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  addButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    ...typography.h3,
    color: '#ffffff',
    marginLeft: spacing.sm,
  },
});
