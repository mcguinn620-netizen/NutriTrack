import { useState, useEffect, useCallback } from 'react';
import {
  netNutritionService,
  NNLocation,
  NNCategory,
  NNItem,
  NNNutrition,
} from '@/services/netNutritionService';
import { diningLocations } from '@/services/mockData';

// Fallback: convert static DiningLocation list to NNLocation shape
const FALLBACK_LOCATIONS: NNLocation[] = diningLocations.map((loc, i) => ({
  oid: -(i + 1), // negative OIDs flag them as static fallbacks
  name: loc.name,
}));

// ── Locations ─────────────────────────────────────────────────────────────────

export function useLocations() {
  const [locations, setLocations] = useState<NNLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (forceRefresh) await netNutritionService.clearCache();
      const data = await netNutritionService.getLocations();
      if (data.length > 0) {
        setLocations(data);
      } else {
        // Live fetch returned empty — use static fallback so the UI is never blank
        setLocations(FALLBACK_LOCATIONS);
        setError('Live data unavailable — showing cached locations');
      }
    } catch (e) {
      // Network / edge function error — fall back to static list
      setLocations(FALLBACK_LOCATIONS);
      setError('Could not reach BSU NetNutrition — showing cached locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { locations, loading, error, refresh: () => load(true) };
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useCategories(unitOid: number | null) {
  const [categories, setCategories] = useState<NNCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!unitOid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await netNutritionService.getCategories(unitOid);
      setCategories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [unitOid]);

  useEffect(() => { load(); }, [load]);

  return { categories, loading, error, refresh: load };
}

// ── Items ─────────────────────────────────────────────────────────────────────

export function useItems(unitOid: number | null, categoryOid: number | null) {
  const [items, setItems] = useState<NNItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!unitOid || !categoryOid) return;
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const data = await netNutritionService.getItems(unitOid, categoryOid);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [unitOid, categoryOid]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, refresh: load };
}

// ── Nutrition ─────────────────────────────────────────────────────────────────

export function useNutrition() {
  const [nutrition, setNutrition] = useState<NNNutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNutrition = useCallback(async (itemOid: number) => {
    setLoading(true);
    setError(null);
    setNutrition(null);
    try {
      const data = await netNutritionService.getNutrition(itemOid);
      setNutrition(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load nutrition');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setNutrition(null);
    setError(null);
    setLoading(false);
  }, []);

  return { nutrition, loading, error, loadNutrition, reset };
}
