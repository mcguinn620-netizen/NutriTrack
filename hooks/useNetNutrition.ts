import { useCallback, useEffect, useRef, useState } from 'react';
import { getDiningHallsResult, getFoodItemsByStationResult, getStationsByHallResult, triggerScrape } from '@/services/netNutritionService';
import { DiningHall, FoodItem, Station } from '@/services/nutritionTypes';

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

interface LoaderState<T> {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  isOfflineFallback: boolean;
}

function useInitialLoadGuard(key: string | undefined, callback: () => Promise<void>) {
  const initializedForKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (initializedForKey.current === key) {
      return;
    }

    initializedForKey.current = key;
    void callback();
  }, [callback, key]);
}

export function useDiningHalls() {
  const [state, setState] = useState<LoaderState<DiningHall>>({
    data: [],
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
    isOfflineFallback: false,
  });
  const inFlightRef = useRef(false);

  const load = useCallback(async (options?: { forceRefresh?: boolean }) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState((prev) => ({
      ...prev,
      loading: options?.forceRefresh ? prev.loading : true,
      refreshing: !!options?.forceRefresh,
      error: null,
      isOfflineFallback: false,
    }));

    try {
      const result = await getDiningHallsResult(options);
      setState((prev) => ({
        ...prev,
        data: result.data,
        error: null,
        lastUpdated: result.timestamp,
        isOfflineFallback: result.isOfflineFallback,
      }));
    } catch (err) {
      console.error('[useDiningHalls] load failed:', err);
      setState((prev) => ({
        ...prev,
        data: [],
        error: resolveErrorMessage(err, 'Failed to load dining halls'),
        isOfflineFallback: false,
      }));
    } finally {
      inFlightRef.current = false;
      setState((prev) => ({ ...prev, loading: false, refreshing: false }));
    }
  }, []);

  useInitialLoadGuard('dining_halls', load);

  const refresh = useCallback(async () => {
    await load({ forceRefresh: true });
  }, [load]);

  const runScrape = useCallback(async () => {
    await triggerScrape();
    await load({ forceRefresh: true });
  }, [load]);

  return { ...state, refresh, runScrape };
}

export function useStations(hallId?: string) {
  const [state, setState] = useState<LoaderState<Station>>({
    data: [],
    loading: false,
    refreshing: false,
    error: null,
    lastUpdated: null,
    isOfflineFallback: false,
  });
  const inFlightRef = useRef<string | null>(null);

  const load = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (!hallId) {
        setState((prev) => ({ ...prev, data: [], loading: false, refreshing: false, error: null }));
        return;
      }

      if (inFlightRef.current === hallId) {
        return;
      }

      inFlightRef.current = hallId;
      setState((prev) => ({
        ...prev,
        loading: options?.forceRefresh ? prev.loading : true,
        refreshing: !!options?.forceRefresh,
        error: null,
        isOfflineFallback: false,
      }));

      try {
        const result = await getStationsByHallResult(hallId, options);
        setState((prev) => ({
          ...prev,
          data: result.data,
          error: null,
          lastUpdated: result.timestamp,
          isOfflineFallback: result.isOfflineFallback,
        }));
      } catch (err) {
        console.error('[useStations] load failed:', err);
        setState((prev) => ({
          ...prev,
          data: [],
          error: resolveErrorMessage(err, 'Failed to load stations'),
          isOfflineFallback: false,
        }));
      } finally {
        inFlightRef.current = null;
        setState((prev) => ({ ...prev, loading: false, refreshing: false }));
      }
    },
    [hallId],
  );

  useInitialLoadGuard(hallId, load);

  const refresh = useCallback(async () => {
    await load({ forceRefresh: true });
  }, [load]);

  return { ...state, refresh };
}

export function useFoodItems(stationId?: string) {
  const [state, setState] = useState<LoaderState<FoodItem>>({
    data: [],
    loading: false,
    refreshing: false,
    error: null,
    lastUpdated: null,
    isOfflineFallback: false,
  });
  const inFlightRef = useRef<string | null>(null);

  const load = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (!stationId) {
        setState((prev) => ({ ...prev, data: [], loading: false, refreshing: false, error: null }));
        return;
      }

      if (inFlightRef.current === stationId) {
        return;
      }

      inFlightRef.current = stationId;
      setState((prev) => ({
        ...prev,
        loading: options?.forceRefresh ? prev.loading : true,
        refreshing: !!options?.forceRefresh,
        error: null,
        isOfflineFallback: false,
      }));

      try {
        const result = await getFoodItemsByStationResult(stationId, options);
        setState((prev) => ({
          ...prev,
          data: result.data,
          error: null,
          lastUpdated: result.timestamp,
          isOfflineFallback: result.isOfflineFallback,
        }));
      } catch (err) {
        console.error('[useFoodItems] load failed:', err);
        setState((prev) => ({
          ...prev,
          data: [],
          error: resolveErrorMessage(err, 'Failed to load food items'),
          isOfflineFallback: false,
        }));
      } finally {
        inFlightRef.current = null;
        setState((prev) => ({ ...prev, loading: false, refreshing: false }));
      }
    },
    [stationId],
  );

  useInitialLoadGuard(stationId, load);

  const refresh = useCallback(async () => {
    await load({ forceRefresh: true });
  }, [load]);

  return { ...state, refresh };
}
