import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import CardSurface from '@/components/ui/CardSurface';

interface ErrorViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ title = 'Something went wrong', message, onRetry }: ErrorViewProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <CardSurface style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="error-outline" size={22} color={colors.error} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
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
      </CardSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: { width: '100%', maxWidth: 480 },
  iconWrap: { marginBottom: spacing.xs },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
  },
  retryButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
