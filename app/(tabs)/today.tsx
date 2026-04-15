import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useMealLog } from '@/hooks/useMealLog';
import { useGoals } from '@/hooks/useGoals';
import { MacroCard } from '@/components/ui/MacroCard';
import { useAlert } from '@/template';
import { DailyGoals } from '@/services/storage';

const MEAL_TIMES = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'wb-sunny' },
  { mode: 'dark', label: 'Dark', icon: 'nights-stay' },
  { mode: 'system', label: 'System', icon: 'settings-brightness' },
];

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { colors, themeMode, setThemeMode } = useTheme();
  const today = new Date().toISOString().split('T')[0];
  const { entries, byCategory, totals, removeEntry } = useMealLog(today);
  const { goals, updateGoals } = useGoals();
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [editedGoals, setEditedGoals] = useState<DailyGoals>(goals);

  const totalMacros = totals.protein + totals.carbs + totals.fat;
  const proteinPercentage = totalMacros > 0 ? Math.round((totals.protein / totalMacros) * 100) : 0;
  const carbsPercentage = totalMacros > 0 ? Math.round((totals.carbs / totalMacros) * 100) : 0;
  const fatPercentage = totalMacros > 0 ? Math.round((totals.fat / totalMacros) * 100) : 0;

  const caloriesProgress = goals.calories > 0 ? Math.min(Math.round((totals.calories / goals.calories) * 100), 100) : 0;
  const proteinGoalPct = goals.protein > 0 ? Math.min(Math.round((totals.protein / goals.protein) * 100), 100) : 0;
  const carbsGoalPct = goals.carbs > 0 ? Math.min(Math.round((totals.carbs / goals.carbs) * 100), 100) : 0;
  const fatGoalPct = goals.fat > 0 ? Math.min(Math.round((totals.fat / goals.fat) * 100), 100) : 0;

  const handleSaveGoals = async () => {
    await updateGoals(editedGoals);
    setGoalsModalVisible(false);
  };

  const handleOpenGoals = () => {
    setEditedGoals(goals);
    setGoalsModalVisible(true);
  };

  const handleRemoveMeal = (entryId: string, mealName: string) => {
    showAlert('Remove Meal', `Remove ${mealName} from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeEntry(entryId) },
    ]);
  };

  const renderMealSection = (mealTime: (typeof MEAL_TIMES)[number]) => {
    const mealsList = byCategory[mealTime];
    const sectionCalories = mealsList.reduce((acc, meal) => acc + meal.food.nutrients.calories * meal.quantity, 0);

    return (
      <View key={mealTime} style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <Text style={[styles.mealTitle, { color: colors.text }]}>{mealTime.charAt(0).toUpperCase() + mealTime.slice(1)}</Text>
          <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{sectionCalories} cal</Text>
        </View>

        {mealsList.length === 0 ? (
          <View style={[styles.emptyMeal, { borderColor: colors.borderLight }]}>
            <MaterialIcons name="add-circle-outline" size={32} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No meals added yet</Text>
          </View>
        ) : (
          mealsList.map((meal) => (
            <View key={meal.id} style={[styles.mealItem, { backgroundColor: colors.surface }]}>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealName, { color: colors.text }]}>{meal.food.name} {meal.quantity > 1 ? `×${meal.quantity}` : ''}</Text>
                <Text style={[styles.mealMacroText, { color: colors.textSecondary }]}>
                  {meal.food.nutrients.calories * meal.quantity} cal • {meal.food.nutrients.protein * meal.quantity}g P • {meal.food.nutrients.carbs * meal.quantity}g C • {meal.food.nutrients.fat * meal.quantity}g F
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveMeal(meal.id, meal.food.name)}
                hitSlop={8}
                style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
              >
                <MaterialIcons name="close" size={20} color={colors.textLight} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Today</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <Pressable onPress={handleOpenGoals} style={styles.goalsButton} hitSlop={8}>
          <MaterialIcons name="settings" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]} showsVerticalScrollIndicator={false}>
        {/* Calorie Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={[styles.summaryTitle, { color: '#fff', opacity: 0.9 }]}>Daily Summary</Text>
          <Text style={[styles.totalCalories, { color: '#fff' }]}>{totals.calories}</Text>
          <Text style={[styles.caloriesLabel, { color: '#fff', opacity: 0.9 }]}>of {goals.calories} cal goal</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${caloriesProgress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: '#fff', opacity: 0.9 }]}>{caloriesProgress}% Complete</Text>
        </View>

        {/* Macro Goal Progress */}
        <View style={[styles.goalProgressContainer, { backgroundColor: colors.surface }]}>
          {[
            { label: 'Protein', pct: proteinGoalPct, current: totals.protein, goal: goals.protein },
            { label: 'Carbs', pct: carbsGoalPct, current: totals.carbs, goal: goals.carbs },
            { label: 'Fat', pct: fatGoalPct, current: totals.fat, goal: goals.fat },
          ].map((item) => (
            <View key={item.label} style={styles.goalProgressItem}>
              <View style={[styles.circularProgress, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.goalPercentage, { color: colors.primary }]}>{item.pct}%</Text>
              </View>
              <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.goalValue, { color: colors.text }]}>{item.current}g / {item.goal}g</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Macronutrients</Text>
        <MacroCard label="Protein" value={totals.protein} unit="g" color={colors.protein} percentage={proteinPercentage} />
        <MacroCard label="Carbohydrates" value={totals.carbs} unit="g" color={colors.carbs} percentage={carbsPercentage} />
        <MacroCard label="Fat" value={totals.fat} unit="g" color={colors.fat} percentage={fatPercentage} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Other Nutrients</Text>
        <View style={styles.nutrientGrid}>
          {[
            { label: 'Fiber', value: `${totals.fiber}g` },
            { label: 'Sugar', value: `${totals.sugar}g` },
            { label: 'Sodium', value: `${totals.sodium}mg` },
            { label: 'Cholesterol', value: `${totals.cholesterol}mg` },
          ].map((item) => (
            <View key={item.label} style={[styles.nutrientCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.nutrientValue, { color: colors.text }]}>{item.value}</Text>
              <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Meals</Text>
        {MEAL_TIMES.map(renderMealSection)}

        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="restaurant" size={64} color={colors.textLight} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Meals Logged</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Browse dining locations and add meals to start tracking
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={goalsModalVisible} animationType="slide" transparent={false} onRequestClose={() => setGoalsModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>
              <Pressable onPress={() => setGoalsModalVisible(false)} hitSlop={8}>
                <MaterialIcons name="close" size={28} color={colors.text} />
              </Pressable>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Theme Section */}
              <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>Appearance</Text>
              <View style={[styles.themeCard, { backgroundColor: colors.surface }]}>
                {THEME_OPTIONS.map((option) => (
                  <Pressable
                    key={option.mode}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: themeMode === option.mode ? colors.primary + '15' : 'transparent',
                        borderColor: themeMode === option.mode ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setThemeMode(option.mode)}
                  >
                    <MaterialIcons
                      name={option.icon as any}
                      size={22}
                      color={themeMode === option.mode ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.themeLabel, { color: themeMode === option.mode ? colors.primary : colors.text }]}>
                      {option.label}
                    </Text>
                    {themeMode === option.mode && (
                      <MaterialIcons name="check-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Goals Section */}
              <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>Daily Goals</Text>

              {[
                { key: 'calories', label: 'Calories', placeholder: '2000' },
                { key: 'protein', label: 'Protein (g)', placeholder: '150' },
                { key: 'carbs', label: 'Carbohydrates (g)', placeholder: '225' },
                { key: 'fat', label: 'Fat (g)', placeholder: '65' },
              ].map((field) => (
                <View key={field.key}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={String(editedGoals[field.key as keyof DailyGoals])}
                    onChangeText={(text) =>
                      setEditedGoals({ ...editedGoals, [field.key]: parseInt(text) || 0 })
                    }
                    keyboardType="numeric"
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.md }]}>
              <Pressable style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveGoals}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>
            </View>
            </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  goalsButton: { padding: spacing.sm },
  title: { ...typography.h1, marginBottom: spacing.xs },
  date: { ...typography.body },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryTitle: { ...typography.body, marginBottom: spacing.sm },
  totalCalories: { fontSize: 48, fontWeight: '700', marginBottom: spacing.xs },
  caloriesLabel: { ...typography.body },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.full,
  },
  progressText: { ...typography.bodySmall, marginTop: spacing.sm },
  goalProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  goalProgressItem: { alignItems: 'center' },
  circularProgress: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  goalPercentage: { fontSize: 16, fontWeight: '700' },
  goalLabel: { ...typography.caption, marginBottom: spacing.xs },
  goalValue: { ...typography.bodySmall, fontWeight: '600' },
  sectionTitle: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.md },
  nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  nutrientCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  nutrientValue: { ...typography.h3, marginBottom: spacing.xs },
  nutrientLabel: { ...typography.caption },
  mealSection: { marginBottom: spacing.lg },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mealTitle: { ...typography.h3 },
  mealCalories: { ...typography.body, fontWeight: '600' },
  emptyMeal: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyText: { ...typography.bodySmall, marginTop: spacing.sm },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  mealInfo: { flex: 1 },
  mealName: { ...typography.body, fontWeight: '600', marginBottom: spacing.xs },
  mealMacroText: { ...typography.bodySmall },
  removeButton: { padding: spacing.sm, marginLeft: spacing.sm },
  removeButtonPressed: { opacity: 0.6 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyStateTitle: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyStateText: { ...typography.body, textAlign: 'center', paddingHorizontal: spacing.xl },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: { ...typography.h2 },
  modalContent: { flex: 1, padding: spacing.lg },
  settingsSectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  themeCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  themeLabel: { ...typography.body, fontWeight: '600' },
  inputLabel: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modalFooter: { padding: spacing.lg, borderTopWidth: 1 },
  saveButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: { ...typography.h3, color: '#ffffff' },
});
