/**
 * useNetNutrition.ts
 *
 * React hooks wrapping netNutritionService.
 * Hierarchy (from CBORD_NN_UI.js): units → menus → courses → items → nutrition
 */

import { useState, useEffect, useCallback } from 'react';
import {
  netNutritionService,
  NNLocation,
  NNMenu,
  NNCourse,
  NNItem,
  NNNutrition,
} from '@/services/netNutritionService';
import { diningLocations } from '@/services/mockData';

// Fallback static list if live fetch fails
const FALLBACK_LOCATIONS: NNLocation[] = diningLocations.map((loc, i) => ({
  oid: -(i + 1), // negative = static fallback flag
  name: loc.name,
}));

// ── Locations ─────────────────────────────────────────────────────────────────

export function useLocations() {
  const [locations, setLocations] = useState<NNLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    console.log('[useLocations] load start', { forceRefresh });
    setLoading(true);
    setError(null);
    try {
      if (forceRefresh) {
        await netNutritionService.refreshDataFromEdge();
        await netNutritionService.clearCache();
      }
      const data = await netNutritionService.getLocations();
      console.log('[useLocations] load success', { count: data.length });
      if (data.length > 0) {
        setLocations(data);
      } else {
        console.warn('[useLocations] empty live payload, using fallback');
        setLocations(FALLBACK_LOCATIONS);
        setError('Live data unavailable — showing cached locations');
      }
    } catch (e) {
      console.error('[NetNutrition] Failed to load live locations:', e);
      setLocations(FALLBACK_LOCATIONS);
      const detail = e instanceof Error ? ` (${e.message})` : '';
      setError(`Could not reach BSU NetNutrition${detail} — showing cached locations`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { locations, loading, error, refresh: () => load(true) };
}

// ── Menus (Breakfast / Lunch / Dinner / etc.) ─────────────────────────────────

export function useMenus(unitOid: number | null) {
  const [menus, setMenus] = useState<NNMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!unitOid || unitOid < 0) return;
    console.log('[useMenus] load start', { unitOid });
    setLoading(true);
    setError(null);
    try {
      const data = await netNutritionService.getMenus(unitOid);
      console.log('[useMenus] load success', { unitOid, count: data.length });
      setMenus(data);
    } catch (e) {
      console.error('[useMenus] load failed', { unitOid, error: e });
      setError(e instanceof Error ? e.message : 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  }, [unitOid]);

  useEffect(() => {
    load();
  }, [load]);

  return { menus, loading, error, refresh: load };
}

// ── Courses (stations within a menu) ─────────────────────────────────────────

export function useCourses(unitOid: number | null, menuOid: number | null) {
  const [courses, setCourses] = useState<NNCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!unitOid || !menuOid || unitOid < 0) return;
    console.log('[useCourses] load start', { unitOid, menuOid });
    setLoading(true);
    setError(null);
    try {
      const data = await netNutritionService.getCourses(unitOid, menuOid);
      console.log('[useCourses] load success', { unitOid, menuOid, count: data.length });
      setCourses(data);
    } catch (e) {
      console.error('[useCourses] load failed', { unitOid, menuOid, error: e });
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [unitOid, menuOid]);

  useEffect(() => {
    load();
  }, [load]);

  return { courses, loading, error, refresh: load };
}

// ── Items ─────────────────────────────────────────────────────────────────────

export function useItems(
  unitOid: number | null,
  menuOid: number | null,
  courseOid?: number | null,
) {
  const [items, setItems] = useState<NNItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!unitOid || !menuOid || unitOid < 0) return;
    console.log('[useItems] load start', { unitOid, menuOid, courseOid: courseOid ?? null });
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const data = await netNutritionService.getItems(
        unitOid,
        menuOid,
        courseOid ?? undefined,
      );
      console.log('[useItems] load success', {
        unitOid,
        menuOid,
        courseOid: courseOid ?? null,
        count: data.length,
      });
      setItems(data);
    } catch (e) {
      console.error('[useItems] load failed', { unitOid, menuOid, courseOid, error: e });
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [unitOid, menuOid, courseOid]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refresh: load };
}

// ── Nutrition ─────────────────────────────────────────────────────────────────

export function useNutrition() {
  const [nutrition, setNutrition] = useState<NNNutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNutrition = useCallback(
    async (itemOid: number, menuOid?: number) => {
      setLoading(true);
      setError(null);
      setNutrition(null);
      try {
        console.log('[useNutrition] load start', { itemOid, menuOid: menuOid ?? null });
        const data = await netNutritionService.getNutrition(itemOid);
        console.log('[useNutrition] load success', {
          itemOid,
          menuOid: menuOid ?? null,
          hasCalories: typeof data?.calories === 'number',
        });
        setNutrition(data);
      } catch (e) {
        console.error('[useNutrition] load failed', { itemOid, menuOid, error: e });
        setError(e instanceof Error ? e.message : 'Failed to load nutrition');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setNutrition(null);
    setError(null);
    setLoading(false);
  }, []);

  return { nutrition, loading, error, loadNutrition, reset };
}
