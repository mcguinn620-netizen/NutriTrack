import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { FoodItem } from '@/services/netNutritionService';
import { MealCategory } from '@/services/mealLogService';
import FavoriteButton from '@/components/FavoriteButton';
import CardSurface from '@/components/ui/CardSurface';
import { InfoChip, InlineStat, MetaRow, SectionLabel } from '@/components/ui/primitives';

const MACRO_KEYS = new Set(['calories', 'protein', 'carbs', 'carbohydrates', 'fat', 'total fat', 'fiber', 'sugar', 'sodium', 'cholesterol']);

const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

function formatNutrientLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderCompactValue(item: FoodItem, keys: string[]): string {
  const nutrients = item.nutrients ?? {};
  for (const [key, value] of Object.entries(nutrients)) {
    if (keys.includes(key.toLowerCase())) {
      if (typeof value === 'string' || typeof value === 'number') return String(value);
    }
  }
  return '—';
}

interface FoodItemCardProps {
  item: FoodItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToTray?: (item: FoodItem) => void;
  onRemoveFromTray?: (itemId: string) => void;
  onAddToMeal?: (item: FoodItem, category: MealCategory) => void;
  inTray?: boolean;
}

export default function FoodItemCard({
  item,
  isFavorite,
  onToggleFavorite,
  onAddToTray,
  onRemoveFromTray,
  onAddToMeal,
  inTray,
}: FoodItemCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const nutrientEntries = useMemo(() => Object.entries(item.nutrients ?? {}), [item.nutrients]);
  const explicitMicronutrients = useMemo(() => Object.entries(item.micronutrients ?? {}), [item.micronutrients]);

  const macroNutrients = nutrientEntries.filter(([key]) => MACRO_KEYS.has(key.toLowerCase()));
  const inferredMicronutrients = nutrientEntries.filter(([key]) => !MACRO_KEYS.has(key.toLowerCase()));
  const micronutrients = explicitMicronutrients.length > 0 ? explicitMicronutrients : inferredMicronutrients;

  const allergenChips = item.allergens.slice(0, 2);
  const flagChips = item.dietary_flags.slice(0, Math.max(0, 3 - allergenChips.length));
  const hiddenChipCount = item.allergens.length + item.dietary_flags.length - allergenChips.length - flagChips.length;

  const calories = renderCompactValue(item, ['calories']);
  const protein = renderCompactValue(item, ['protein']);
  const carbs = renderCompactValue(item, ['carbs', 'carbohydrates']);
  const fat = renderCompactValue(item, ['fat', 'total fat']);

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  const renderNutrientRows = (entries: [string, unknown][]) => {
    if (!entries.length) {
      return <Text style={[styles.meta, { color: colors.textSecondary }]}>N/A</Text>;
    }

    return entries.map(([key, value]) => (
      <View key={`${item.id}-${key}`} style={styles.nutrientRow}>
        <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>{formatNutrientLabel(key)}</Text>
        <Text style={[styles.nutrientValue, { color: colors.text }]}>{String(value)}</Text>
      </View>
    ));
  };

  return (
    <CardSurface style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <FavoriteButton isFavorite={isFavorite} onPress={() => onToggleFavorite(item.id)} compact />
      </View>

      <MetaRow icon="straighten" text={item.serving_size ? `Serving size: ${item.serving_size}` : 'Serving size unavailable'} />

      <View style={styles.scanRow}>
        <InlineStat label="Calories" value={calories} color={colors.calories} />
        <InlineStat label="Protein" value={protein} color={colors.protein} />
        <InlineStat label="Carbs" value={carbs} color={colors.carbs} />
        <InlineStat label="Fat" value={fat} color={colors.fat} />
      </View>

      <View style={styles.chipsRow}>
        {allergenChips.map((allergen) => (
          <InfoChip key={`${item.id}-${allergen}`} label={allergen} />
        ))}
        {flagChips.map((flag) => (
          <InfoChip key={`${item.id}-${flag}`} label={flag} />
        ))}
        {hiddenChipCount > 0 ? <InfoChip label={`+${hiddenChipCount} more`} /> : null}
      </View>

      <View style={styles.actionRow}>
        {onAddToTray && onRemoveFromTray ? (
          <Pressable
            onPress={() => (inTray ? onRemoveFromTray(item.id) : onAddToTray(item))}
            style={[styles.trayButton, { borderColor: colors.border, backgroundColor: colors.surfaceHover }]}
          >
            <MaterialIcons name={inTray ? 'remove-shopping-cart' : 'add-shopping-cart'} size={16} color={colors.textSecondary} />
            <Text style={[styles.trayButtonText, { color: colors.textSecondary }]}>{inTray ? 'Remove Tray' : 'Add to Tray'}</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={toggleExpanded} style={styles.expandButton}>
          <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? 'Hide details' : 'View details'}</Text>
          <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.primary} />
        </Pressable>
      </View>


      {onAddToMeal ? (
        <View style={styles.mealActionRow}>
          {MEAL_CATEGORIES.map((category) => (
            <Pressable
              key={`${item.id}-${category}`}
              onPress={() => onAddToMeal(item, category)}
              style={[styles.mealActionButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.mealActionText, { color: colors.primary }]}>{category}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.detailsContainer}>
          <View>
            <SectionLabel label="Allergens" />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.allergens.join(', ') || 'None listed'}</Text>
          </View>

          <View>
            <SectionLabel label="Dietary Flags" />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.dietary_flags.join(', ') || 'None listed'}</Text>
          </View>

          {item.ingredients && item.ingredients.length > 0 ? (
            <View>
              <SectionLabel label="Ingredients" />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.ingredients.join(', ')}</Text>
            </View>
          ) : null}

          <View>
            <SectionLabel label="Nutrients" />
            {renderNutrientRows(macroNutrients)}
          </View>

          {micronutrients.length > 0 ? (
            <View>
              <SectionLabel label="Micronutrients" />
              {renderNutrientRows(micronutrients)}
            </View>
          ) : null}
        </View>
      ) : null}
    </CardSurface>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.h3, flex: 1 },
  meta: { ...typography.bodySmall },
  scanRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  trayButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trayButtonText: { ...typography.caption, fontWeight: '600' },
  mealActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  mealActionButton: { borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  mealActionText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  detailsContainer: { marginTop: spacing.md, gap: spacing.sm },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nutrientLabel: { ...typography.bodySmall, flex: 1 },
  nutrientValue: { ...typography.bodySmall, fontWeight: '600' },
  expandButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  expandText: { ...typography.bodySmall, fontWeight: '600' },
});
