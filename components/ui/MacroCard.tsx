import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface MacroCardProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  percentage?: number;
}

export function MacroCard({ label, value, unit, color, percentage }: MacroCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: colors.text }]}>
            {Math.round(value)}
            <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
          </Text>
          {percentage !== undefined && (
            <Text style={[styles.percentage, { color: colors.textSecondary }]}>{percentage}%</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  indicator: {
    width: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.h2,
  },
  unit: {
    ...typography.bodySmall,
    fontWeight: '400',
  },
  percentage: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
