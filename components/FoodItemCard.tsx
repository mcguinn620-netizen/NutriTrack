import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { FoodItem } from '@/services/netNutritionService';
import FavoriteButton from '@/components/FavoriteButton';

const MACRO_KEYS = new Set(['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol']);

function formatNutrientLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderSummary(values: string[]): string {
  if (!values.length) return 'None';
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
}

interface FoodItemCardProps {
  item: FoodItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onViewed: (item: FoodItem) => void;
}

export default function FoodItemCard({ item, isFavorite, onToggleFavorite, onViewed }: FoodItemCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const nutrientEntries = useMemo(() => Object.entries(item.nutrients ?? {}), [item.nutrients]);
  const explicitMicronutrients = useMemo(() => Object.entries(item.micronutrients ?? {}), [item.micronutrients]);

  const macroNutrients = nutrientEntries.filter(([key]) => MACRO_KEYS.has(key.toLowerCase()));
  const inferredMicronutrients = nutrientEntries.filter(([key]) => !MACRO_KEYS.has(key.toLowerCase()));
  const micronutrients = explicitMicronutrients.length > 0 ? explicitMicronutrients : inferredMicronutrients;

  const toggleExpanded = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded) {
      onViewed(item);
    }
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <FavoriteButton isFavorite={isFavorite} onPress={() => onToggleFavorite(item.id)} />
      </View>

      <Text style={[styles.meta, { color: colors.textSecondary }]}>Serving Size: {item.serving_size}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>Allergens: {expanded ? item.allergens.join(', ') || 'None' : renderSummary(item.allergens)}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>Dietary Flags: {expanded ? item.dietary_flags.join(', ') || 'None' : renderSummary(item.dietary_flags)}</Text>

      {expanded ? (
        <View style={styles.detailsContainer}>
          {item.ingredients && item.ingredients.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.ingredients.join(', ')}</Text>
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrients</Text>
            {renderNutrientRows(macroNutrients)}
          </View>

          {micronutrients.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Micronutrients</Text>
              {renderNutrientRows(micronutrients)}
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable onPress={toggleExpanded} style={styles.expandButton}>
        <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? 'Show less' : 'Show more'}</Text>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.h3, flex: 1 },
  meta: { ...typography.bodySmall, marginTop: 4 },
  detailsContainer: { marginTop: spacing.sm, gap: spacing.sm },
  sectionBlock: { gap: 4 },
  sectionTitle: { ...typography.body, fontWeight: '600' },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nutrientLabel: { ...typography.bodySmall, flex: 1 },
  nutrientValue: { ...typography.bodySmall, fontWeight: '600' },
  expandButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expandText: { ...typography.bodySmall, fontWeight: '600' },
});
