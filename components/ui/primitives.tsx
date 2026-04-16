import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type InfoChipVariant = 'neutral' | 'allergen' | 'dietary' | 'info';

export function InfoChip({ label, variant = 'neutral' }: { label: string; variant?: InfoChipVariant }) {
  const { colors, isDark } = useTheme();

  const chipStyles = {
    neutral: {
      borderColor: colors.border,
      backgroundColor: colors.surfaceHover,
      textColor: colors.textSecondary,
    },
    allergen: {
      borderColor: colors.warning,
      backgroundColor: isDark ? colors.allergenChip : colors.warning,
      textColor: '#000000',
    },
    dietary: {
      borderColor: colors.success,
      backgroundColor: isDark ? colors.dietaryChip : colors.success,
      textColor: '#000000',
    },
    info: {
      borderColor: colors.secondaryAccent,
      backgroundColor: isDark ? colors.info : colors.secondaryAccent,
      textColor: isDark ? '#FFFFFF' : colors.text,
    },
  }[variant];

  return (
    <View style={[styles.chip, { borderColor: chipStyles.borderColor, backgroundColor: chipStyles.backgroundColor }]}> 
      <Text style={[styles.chipText, { color: chipStyles.textColor }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>;
}

export function InlineStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.inlineStat, { backgroundColor: colors.surfaceHover }]}> 
      <Text style={[styles.inlineStatLabel, { color: color ?? colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.inlineStatValue, { color: color ?? colors.text }]}>{value}</Text>
    </View>
  );
}

export function MetaRow({
  icon,
  text,
  right,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap;
  text: string;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaRowLeft}>
        {icon ? <MaterialIcons name={icon} size={15} color={colors.textLight} /> : null}
        <Text style={[styles.metaRowText, { color: colors.textSecondary }]} numberOfLines={1}>{text}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    maxWidth: 150,
  },
  chipText: { ...typography.caption, fontWeight: '600' },
  sectionLabel: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  inlineStat: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 72,
  },
  inlineStatLabel: { ...typography.caption },
  inlineStatValue: { ...typography.bodySmall, fontWeight: '700' },
  metaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  metaRowText: { ...typography.bodySmall, flex: 1 },
});
