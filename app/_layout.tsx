import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { TrayProvider } from '@/components/tray/TrayContext';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="location/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Meals',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="custom-meal"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AlertProvider>
          <TrayProvider>
            <AppContent />
          </TrayProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
