import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_KEY = '@app_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColorPalette {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textLight: string;
  border: string;
  borderLight: string;
  error: string;
  warning: string;
  success: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
  cardShadow: string;
}

export const lightColors: ColorPalette = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  secondary: '#10b981',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  protein: '#ec4899',
  carbs: '#3b82f6',
  fat: '#f59e0b',
  calories: '#8b5cf6',
  cardShadow: '#000000',
};

export const darkColors: ColorPalette = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  secondary: '#10b981',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#2d3f55',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textLight: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  error: '#f87171',
  warning: '#fbbf24',
  success: '#34d399',
  protein: '#f472b6',
  carbs: '#60a5fa',
  fat: '#fbbf24',
  calories: '#a78bfa',
  cardShadow: '#000000',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
