import React from 'react';
import { StyleSheet, View } from 'react-native';
import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

function SkeletonBlock({ height }: { height: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.block,
        {
          height,
          backgroundColor: colors.surfaceHover,
          borderColor: colors.border,
        },
      ]}
    />
  );
}

export function DiningHallRowSkeleton() {
  return <SkeletonBlock height={68} />;
}

export function StationRowSkeleton() {
  return <SkeletonBlock height={68} />;
}

export function FoodItemCardSkeleton() {
  return <SkeletonBlock height={154} />;
}

export function SkeletonList({ count, type }: { count: number; type: 'hall' | 'station' | 'food' }) {
  const renderer = {
    hall: DiningHallRowSkeleton,
    station: StationRowSkeleton,
    food: FoodItemCardSkeleton,
  }[type];

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => {
        const Row = renderer;
        return <Row key={`${type}-skeleton-${index}`} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  block: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: '100%',
  },
});
