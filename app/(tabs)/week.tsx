import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { storageService, LoggedMeal } from '@/services/storage';

interface DayData {
  date: string;
  dayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: LoggedMeal[];
}

export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    loadWeekData();
  }, []);

  const loadWeekData = async () => {
    const days: DayData[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const meals = await storageService.getDailyLog(dateStr);

      const totals = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.nutrition.calories,
          protein: acc.protein + meal.nutrition.protein,
          carbs: acc.carbs + meal.nutrition.carbs,
          fat: acc.fat + meal.nutrition.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...totals,
        meals,
      });
    }

    setWeekData(days);
  };

  const maxCalories = Math.max(...weekData.map(d => d.calories), 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Weekly Summary</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Last 7 days of nutrition tracking</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Calories</Text>
          <View style={styles.chart}>
            {weekData.map((day) => {
              const heightPercentage = (day.calories / maxCalories) * 100;
              const isSelected = selectedDay?.date === day.date;
              return (
                <Pressable
                  key={day.date}
                  style={styles.barContainer}
                  onPress={() => setSelectedDay(isSelected ? null : day)}
                >
                  <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                    {day.calories > 0 ? day.calories : ''}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(heightPercentage, 5)}%`,
                          backgroundColor: isSelected ? colors.primaryDark : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.text }]}>{day.dayName}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedDay && (
          <View style={[styles.dayDetails, { backgroundColor: colors.surface }]}>
            <Text style={[styles.detailsTitle, { color: colors.text }]}>
              {new Date(selectedDay.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <View style={[styles.macroSummary, { borderBottomColor: colors.border }]}>
              {[
                { label: 'Calories', value: String(selectedDay.calories) },
                { label: 'Protein', value: `${selectedDay.protein}g` },
                { label: 'Carbs', value: `${selectedDay.carbs}g` },
                { label: 'Fat', value: `${selectedDay.fat}g` },
              ].map((item) => (
                <View key={item.label} style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: colors.text }]}>{item.value}</Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.mealsTitle, { color: colors.text }]}>Meals ({selectedDay.meals.length})</Text>
            {selectedDay.meals.map((meal) => (
              <View key={meal.timestamp} style={[styles.mealItem, { borderBottomColor: colors.borderLight }]}>
                <View>
                  <Text style={[styles.mealName, { color: colors.text }]}>{meal.mealName}</Text>
                  <Text style={[styles.mealTime, { color: colors.textSecondary }]}>{meal.mealTime}</Text>
                </View>
                <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{meal.nutrition.calories} cal</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.weekSummary, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Week Total</Text>
          <View style={styles.summaryGrid}>
            {[
              { label: 'Total Calories', value: weekData.reduce((s, d) => s + d.calories, 0).toLocaleString() },
              { label: 'Avg per Day', value: String(Math.round(weekData.reduce((s, d) => s + d.calories, 0) / 7)) },
              { label: 'Total Protein', value: `${weekData.reduce((s, d) => s + d.protein, 0)}g` },
              { label: 'Days Logged', value: String(weekData.filter(d => d.calories > 0).length) },
            ].map((item) => (
              <View key={item.label} style={[styles.summaryCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{item.value}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
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
  chartContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 200, gap: spacing.sm },
  barContainer: { flex: 1, alignItems: 'center' },
  barValue: { ...typography.caption, marginBottom: spacing.xs, fontSize: 10 },
  barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: {
    width: '100%',
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    minHeight: 4,
  },
  barLabel: { ...typography.caption, marginTop: spacing.xs },
  dayDetails: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailsTitle: { ...typography.h3, marginBottom: spacing.md },
  macroSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  macroItem: { alignItems: 'center' },
  macroValue: { ...typography.h3, marginBottom: spacing.xs },
  macroLabel: { ...typography.caption },
  mealsTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  mealName: { ...typography.body },
  mealTime: { ...typography.bodySmall },
  mealCalories: { ...typography.body, fontWeight: '600' },
  weekSummary: { borderRadius: borderRadius.lg, padding: spacing.lg },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: { ...typography.h2, marginBottom: spacing.xs },
  summaryLabel: { ...typography.caption, textAlign: 'center' },
});
