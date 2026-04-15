import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import CardSurface from '@/components/ui/CardSurface';

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
  onRemoveActiveFilter: (type: 'allergen' | 'flag', value: string) => void;
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
  onRemoveActiveFilter,
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

      {activeCount > 0 ? (
        <View style={styles.activeChipsRow}>
          {selectedAllergens.map((value) => (
            <Pressable
              key={`active-a-${value}`}
              onPress={() => onRemoveActiveFilter('allergen', value)}
              style={[styles.activeChip, { borderColor: colors.border, backgroundColor: colors.surfaceHover }]}
            >
              <Text style={[styles.activeChipText, { color: colors.textSecondary }]} numberOfLines={1}>Allergen: {value}</Text>
              <MaterialIcons name="close" size={14} color={colors.textLight} />
            </Pressable>
          ))}
          {selectedFlags.map((value) => (
            <Pressable
              key={`active-f-${value}`}
              onPress={() => onRemoveActiveFilter('flag', value)}
              style={[styles.activeChip, { borderColor: colors.border, backgroundColor: colors.surfaceHover }]}
            >
              <Text style={[styles.activeChipText, { color: colors.textSecondary }]} numberOfLines={1}>Flag: {value}</Text>
              <MaterialIcons name="close" size={14} color={colors.textLight} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {open ? (
        <CardSurface style={styles.panel}>
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
        </CardSurface>
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
  activeChipsRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  activeChip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  activeChipText: { ...typography.caption, fontWeight: '600', maxWidth: 210 },
  panel: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
