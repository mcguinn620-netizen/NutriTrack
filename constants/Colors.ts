import { colors } from './theme';

export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSecondary,
    tabIconDefault: colors.textLight,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: '#f8fafc',
    background: '#020617',
    tint: '#60a5fa',
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: '#60a5fa',
  },
} as const;

