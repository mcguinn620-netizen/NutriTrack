import { Stack } from 'expo-router';

export default function DiningStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="stations/[hallId]" options={{ title: 'Stations', headerBackTitle: 'Back' }} />
      <Stack.Screen name="food-items/[stationId]" options={{ title: 'Food Items', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
