import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/constants/theme';

interface ProgressRingProps {
  current: number;
  goal: number;
  label: string;
  color: string;
  size?: number;
}

export function ProgressRing({ current, goal, label, color, size = 80 }: ProgressRingProps) {
  const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <svg width={size} height={size} style={styles.svg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <View style={styles.content}>
        <Text style={styles.percentage}>{percentage}%</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
  },
  percentage: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
