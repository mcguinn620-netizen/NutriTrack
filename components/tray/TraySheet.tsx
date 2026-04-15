import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import CardSurface from '@/components/ui/CardSurface';
import { MealCategory } from '@/services/mealLogService';
import { useTray } from './TrayContext';

interface TraySheetProps {
  visible: boolean;
  onClose: () => void;
}

const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function TraySheet({ visible, onClose }: TraySheetProps) {
  const { colors } = useTheme();
  const { entries, totals, addItem, removeItem, clearTray, logTrayToMeal } = useTray();
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('lunch');

  const handleLogTray = async () => {
    const loggedCount = await logTrayToMeal(selectedCategory);
    if (loggedCount > 0) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}> 
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Build a Plate</Text>
            <Pressable onPress={onClose} hitSlop={10}><MaterialIcons name="close" size={22} color={colors.text} /></Pressable>
          </View>
          <Text style={[styles.summary, { color: colors.textSecondary }]}>
            {totals.itemCount} items · {totals.hasCalories ? `${Math.round(totals.calories)} cal` : 'Calories —'} · P{' '}
            {totals.hasProtein ? Math.round(totals.protein) : '—'} C {totals.hasCarbs ? Math.round(totals.carbs) : '—'} F{' '}
            {totals.hasFat ? Math.round(totals.fat) : '—'}
          </Text>

          <Text style={[styles.mealTitle, { color: colors.text }]}>Log tray to meal</Text>
          <View style={styles.mealCategoryRow}>
            {MEAL_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.mealCategoryButton,
                  {
                    borderColor: selectedCategory === category ? colors.primary : colors.border,
                    backgroundColor: selectedCategory === category ? `${colors.primary}22` : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.mealCategoryText, { color: selectedCategory === category ? colors.primary : colors.textSecondary }]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {entries.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>Your tray is empty.</Text>
            ) : (
              entries.map((entry) => (
                <CardSurface key={entry.item.id} style={styles.entryCard} contentStyle={styles.entryContent}>
                  <View style={styles.entryText}>
                    <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={2}>{entry.item.name}</Text>
                    <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>Qty {entry.quantity}</Text>
                  </View>
                  <View style={styles.entryActions}>
                    <Pressable onPress={() => removeItem(entry.item.id)} hitSlop={8}><MaterialIcons name="remove-circle-outline" size={24} color={colors.textSecondary} /></Pressable>
                    <Pressable onPress={() => addItem(entry.item)} hitSlop={8}><MaterialIcons name="add-circle-outline" size={24} color={colors.primary} /></Pressable>
                  </View>
                </CardSurface>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={handleLogTray} style={[styles.primaryFooterButton, { backgroundColor: colors.primary }]}> 
              <Text style={styles.primaryFooterButtonText}>Log Tray to {selectedCategory}</Text>
            </Pressable>
            <Pressable onPress={clearTray} style={[styles.footerButton, { borderColor: colors.border }]}> 
              <Text style={[styles.footerButtonText, { color: colors.textSecondary }]}>Clear Tray</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.32)' },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h2 },
  summary: { ...typography.bodySmall, marginTop: spacing.xs },
  mealTitle: { ...typography.body, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '600' },
  mealCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealCategoryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  mealCategoryText: { ...typography.caption, textTransform: 'capitalize', fontWeight: '700' },
  list: { paddingVertical: spacing.md, gap: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  entryCard: { marginBottom: spacing.xs },
  entryContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryText: { flex: 1, marginRight: spacing.md },
  entryTitle: { ...typography.body, fontWeight: '600' },
  entryMeta: { ...typography.caption, marginTop: 2 },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footer: { paddingTop: spacing.xs, gap: spacing.xs },
  primaryFooterButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryFooterButtonText: { ...typography.bodySmall, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  footerButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  footerButtonText: { ...typography.bodySmall, fontWeight: '600' },
});
