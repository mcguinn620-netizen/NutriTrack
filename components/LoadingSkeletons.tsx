import React from 'react';
import { StyleSheet, View } from 'react-native';
import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

function SkeletonLine({ width, height = 10 }: { width: string | number; height?: number }) {
  const { colors } = useTheme();
  return <View style={[styles.line, { width, height, backgroundColor: colors.surfaceHover }]} />;
}

function SkeletonCard({ children, minHeight }: { children?: React.ReactNode; minHeight?: number }) {
  const { colors } = useTheme();

  return <View style={[styles.card, { borderColor: colors.border, minHeight }]}>{children}</View>;
}

export function DiningHallRowSkeleton() {
  return (
    <SkeletonCard minHeight={118}>
      <SkeletonLine width="42%" height={12} />
      <SkeletonLine width="70%" />
      <View style={styles.metaRow}>
        <SkeletonLine width={90} />
        <SkeletonLine width={120} />
      </View>
    </SkeletonCard>
  );
}

export function StationRowSkeleton() {
  return (
    <SkeletonCard minHeight={108}>
      <SkeletonLine width="58%" height={12} />
      <SkeletonLine width="48%" />
      <View style={styles.metaRow}>
        <SkeletonLine width={100} />
        <SkeletonLine width={70} />
      </View>
    </SkeletonCard>
  );
}

export function FoodItemCardSkeleton() {
  return (
    <SkeletonCard minHeight={210}>
      <SkeletonLine width="70%" height={12} />
      <SkeletonLine width="44%" />
      <View style={styles.metaRow}>
        <SkeletonLine width={58} height={36} />
        <SkeletonLine width={58} height={36} />
        <SkeletonLine width={58} height={36} />
      </View>
      <View style={styles.chipsRow}>
        <SkeletonLine width={74} height={22} />
        <SkeletonLine width={82} height={22} />
      </View>
      <SkeletonLine width="32%" />
    </SkeletonCard>
  );
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
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
  },
  line: {
    borderRadius: borderRadius.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
