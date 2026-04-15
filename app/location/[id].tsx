import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyLocationRedirect() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return <Redirect href={`/dining/stations/${id}${name ? `?hallName=${encodeURIComponent(name)}` : ''}`} />;
}
