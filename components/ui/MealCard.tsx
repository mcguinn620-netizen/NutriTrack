import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Meal } from '@/services/mockData';

interface MealCardProps {
  meal: Meal;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function MealCard({ meal, onPress, isFavorite, onToggleFavorite }: MealCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.surfaceHover : colors.surface },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {meal.name}
          </Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{meal.category}</Text>
        </View>
        {onToggleFavorite && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            hitSlop={8}
            style={styles.favoriteButton}
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={24}
              color={isFavorite ? colors.error : colors.textLight}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.macros}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: colors.text }]}>{meal.nutrition.calories}</Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Cal</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: colors.protein }]}>
            {meal.nutrition.protein}g
          </Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: colors.carbs }]}>
            {meal.nutrition.carbs}g
          </Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: colors.fat }]}>
            {meal.nutrition.fat}g
          </Text>
          <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat</Text>
        </View>
      </View>

      <Text style={[styles.serving, { color: colors.textLight }]}>{meal.servingSize}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  category: {
    ...typography.caption,
  },
  favoriteButton: {
    padding: spacing.xs,
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    ...typography.h3,
    marginBottom: 2,
  },
  macroLabel: {
    ...typography.caption,
  },
  divider: {
    width: 1,
    height: 24,
  },
  serving: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
