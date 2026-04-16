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

function normalizeNutrientKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, '');
}

function normalizeNutrientValue(value: unknown): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>;
    for (const key of ['value', 'amount', 'qty']) {
      const normalized = normalizeNutrientValue(objectValue[key]);
      if (normalized) return normalized;
    }
  }

  return null;
}

function readNutrientValue(item: FoodItem, keys: string[], suffix = ''): string {
  const nutrientMap = item.nutrients ?? {};
  const normalizedKeys = keys.map(normalizeNutrientKey);

  for (const [key, value] of Object.entries(nutrientMap)) {
    const normalizedKey = normalizeNutrientKey(key);
    if (!normalizedKeys.includes(normalizedKey)) continue;

    const normalizedValue = normalizeNutrientValue(value);
    if (!normalizedValue) continue;

    if (suffix && !/[a-zA-Z]/.test(normalizedValue)) {
      return `${normalizedValue}${suffix}`;
    }

    return normalizedValue;
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
  const flagChips = item.dietary_flags.slice(0, Math.max(0, 4 - allergenChips.length));
  const hiddenChipCount = item.allergens.length + item.dietary_flags.length - allergenChips.length - flagChips.length;

  const calories = readNutrientValue(item, ['calories']);
  const protein = readNutrientValue(item, ['protein'], 'g');
  const carbs = readNutrientValue(item, ['carbs', 'carbohydrates'], 'g');
  const fat = readNutrientValue(item, ['fat', 'total fat'], 'g');

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  const renderNutrientRows = (entries: [string, unknown][]) => {
    if (!entries.length) {
      return <Text style={[styles.meta, { color: colors.textSecondary }]}>N/A</Text>;
    }

    return entries.map(([key, value]) => (
      <View key={`${item.id}-${key}`} style={styles.nutrientRow}>
        <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]} numberOfLines={1}>{formatNutrientLabel(key)}</Text>
        <Text style={[styles.nutrientValue, { color: colors.text }]}>{normalizeNutrientValue(value) ?? '—'}</Text>
      </View>
    ));
  };

  return (
    <CardSurface style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <FavoriteButton isFavorite={isFavorite} onPress={() => onToggleFavorite(item.id)} compact />
      </View>

      <View style={styles.collapsedBodyRow}>
        <View style={styles.mainColumn}>
          <MetaRow icon="straighten" text={item.serving_size ? `Serving size: ${item.serving_size}` : 'Serving size unavailable'} />

          {calories !== '—' ? (
            <View style={styles.calorieBadgeWrap}>
              <InfoChip label={`${calories} cal`} variant="info" />
            </View>
          ) : null}

          <View style={styles.macroGrid}>
            <InlineStat label="Calories" value={calories} color={colors.calories} />
            <InlineStat label="Protein" value={protein} color={colors.protein} />
            <InlineStat label="Carbs" value={carbs} color={colors.carbs} />
            <InlineStat label="Fat" value={fat} color={colors.fat} />
          </View>

          {onAddToTray && onRemoveFromTray ? (
            <View style={styles.compactActionRow}>
              <Pressable
                onPress={() => (inTray ? onRemoveFromTray(item.id) : onAddToTray(item))}
                style={[
                  styles.trayButton,
                  {
                    borderColor: inTray ? colors.border : colors.primary,
                    backgroundColor: inTray ? colors.surfaceHover : colors.primary,
                  },
                ]}
              >
                <MaterialIcons name={inTray ? 'remove-shopping-cart' : 'add-shopping-cart'} size={16} color={inTray ? colors.textSecondary : '#FFFFFF'} />
                <Text style={[styles.trayButtonText, { color: inTray ? colors.textSecondary : '#FFFFFF' }]}>{inTray ? 'Remove Tray' : 'Add to Tray'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.chipsColumn}>
          {allergenChips.map((allergen) => (
            <InfoChip key={`${item.id}-${allergen}`} label={allergen} variant="allergen" />
          ))}
          {flagChips.map((flag) => (
            <InfoChip key={`${item.id}-${flag}`} label={flag} variant="dietary" />
          ))}
          {hiddenChipCount > 0 ? <InfoChip label={`+${hiddenChipCount} more`} /> : null}
        </View>
      </View>

      <Pressable onPress={toggleExpanded} style={[styles.detailsToggleRow, { borderColor: colors.border }]}>
        <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? 'Hide details' : 'View details'}</Text>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.primary} />
      </Pressable>

      {expanded ? (
        <View style={styles.detailsContainer}>
          {onAddToMeal ? (
            <View>
              <SectionLabel label="Add to Meal" />
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
            </View>
          ) : null}

          <View style={styles.nutrientColumns}>
            <View style={styles.nutrientColumn}>
              <SectionLabel label="Macros" />
              {renderNutrientRows(macroNutrients)}
            </View>

            <View style={styles.nutrientColumn}>
              <SectionLabel label="Micronutrients" />
              {renderNutrientRows(micronutrients)}
            </View>
          </View>

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
  collapsedBodyRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mainColumn: { flex: 1, minWidth: 0 },
  calorieBadgeWrap: { marginTop: spacing.xs, alignSelf: 'flex-start' },
  macroGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipsColumn: {
    width: 128,
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  compactActionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
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
  detailsToggleRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  mealActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealActionButton: { borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  mealActionText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  detailsContainer: { marginTop: spacing.md, gap: spacing.sm },
  nutrientColumns: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  nutrientColumn: {
    flex: 1,
    minWidth: 150,
    gap: spacing.xs,
  },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nutrientLabel: { ...typography.bodySmall, flex: 1 },
  nutrientValue: { ...typography.bodySmall, fontWeight: '600' },
  expandText: { ...typography.bodySmall, fontWeight: '600' },
});
