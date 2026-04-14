import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface ErrorViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ title = 'Something went wrong', message, onRetry }: ErrorViewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.error }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: pressed ? colors.primaryDark ?? colors.primary : colors.primary,
            },
          ]}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
