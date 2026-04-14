import { useCallback, useEffect, useState } from 'react';
import {
  DiningHall,
  FoodItem,
  Station,
  getDiningHalls,
  getFoodItemsByStation,
  getStationsByHall,
  refreshFromDatabase,
} from '@/services/netNutritionService';

function resolveErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const message = err.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

export function useDiningHalls() {
  const [data, setData] = useState<DiningHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDiningHalls();
      setData(result);
    } catch (err) {
      console.error('[useDiningHalls] load failed:', err);
      setError(resolveErrorMessage(err, 'Failed to load dining halls'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshFromDatabase();
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh };
}

export function useStations(hallId?: string) {
  const [data, setData] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hallId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getStationsByHall(hallId);
      setData(result);
    } catch (err) {
      console.error('[useStations] load failed:', err);
      setError(resolveErrorMessage(err, 'Failed to load stations'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [hallId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

export function useFoodItems(stationId?: string) {
  const [data, setData] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!stationId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getFoodItemsByStation(stationId);
      setData(result);
    } catch (err) {
      console.error('[useFoodItems] load failed:', err);
      setError(resolveErrorMessage(err, 'Failed to load food items'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
