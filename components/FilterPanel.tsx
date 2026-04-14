import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface FilterPanelProps {
  open: boolean;
  allergenOptions: string[];
  flagOptions: string[];
  selectedAllergens: string[];
  selectedFlags: string[];
  onToggleOpen: () => void;
  onToggleAllergen: (value: string) => void;
  onToggleFlag: (value: string) => void;
  onClear: () => void;
}

function compactFilterLabel(base: string, count: number): string {
  return count > 0 ? `${base} (${count})` : base;
}

export default function FilterPanel({
  open,
  allergenOptions,
  flagOptions,
  selectedAllergens,
  selectedFlags,
  onToggleOpen,
  onToggleAllergen,
  onToggleFlag,
  onClear,
}: FilterPanelProps) {
  const { colors } = useTheme();
  const activeCount = selectedAllergens.length + selectedFlags.length;

  const renderToggle = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={[
        styles.filterPill,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.surface,
        },
      ]}
    >
      <Text style={[styles.filterPillLabel, { color: selected ? '#fff' : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onToggleOpen}
          style={[styles.filtersButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <MaterialIcons name="tune" size={16} color={colors.textSecondary} />
          <Text style={[styles.filtersButtonText, { color: colors.text }]}>{compactFilterLabel('Filters', activeCount)}</Text>
          <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable onPress={onClear} style={[styles.clearButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.clearButtonText, { color: activeCount > 0 ? colors.primary : colors.textSecondary }]}>Clear</Text>
        </Pressable>
      </View>

      {open ? (
        <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Allergens</Text>
          <View style={styles.wrapRow}>
            {allergenOptions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No allergen filters</Text>
            ) : (
              allergenOptions.map((value) => renderToggle(value, selectedAllergens.includes(value), () => onToggleAllergen(value)))
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dietary Flags</Text>
          <View style={styles.wrapRow}>
            {flagOptions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No dietary filters</Text>
            ) : (
              flagOptions.map((value) => renderToggle(value, selectedFlags.includes(value), () => onToggleFlag(value)))
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filtersButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filtersButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  panel: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  filterPillLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.bodySmall,
  },
});
