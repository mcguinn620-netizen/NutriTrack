import { useState, useEffect, useCallback } from 'react';
import { menuService, MenuStatus } from '@/services/menuService';

export function useMenuStatus() {
  const [status, setStatus] = useState<MenuStatus>({
    lastUpdated: null,
    weekIndex: 0,
    hasUpdate: false,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    const s = await menuService.getStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const { weekIndex, lastUpdated } = await menuService.markUpdated();
    setStatus(prev => ({ ...prev, weekIndex, lastUpdated, hasUpdate: false }));
    setRefreshing(false);
  }, []);

  const dismissUpdate = useCallback(async () => {
    const { weekIndex, lastUpdated } = await menuService.markUpdated();
    setStatus(prev => ({ ...prev, weekIndex, lastUpdated, hasUpdate: false }));
  }, []);

  return {
    status,
    loading,
    refreshing,
    refresh,
    dismissUpdate,
    formattedLastUpdated: menuService.getFormattedLastUpdated(status.lastUpdated),
    nextUpdate: menuService.getNextUpdateDate(),
  };
}
