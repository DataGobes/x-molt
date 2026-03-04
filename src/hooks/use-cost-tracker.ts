import { useMemo, useCallback, useState } from "react";
import { CostTracker, type SpendByEndpoint, type DailySpend } from "../services/cost-tracker.js";
import { getDbPath } from "../config.js";

export function useCostTracker() {
  const tracker = useMemo(() => new CostTracker(getDbPath()), []);
  const [, setTick] = useState(0);

  // Force re-render after recording to update spend displays
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const record = useCallback((endpoint: string, resourceCount?: number) => {
    tracker.record(endpoint, resourceCount);
    refresh();
  }, [tracker, refresh]);

  const estimateCost = useCallback((endpoint: string, count?: number): number => {
    return tracker.estimateCost(endpoint, count);
  }, [tracker]);

  const getSessionSpend = useCallback((): number => {
    return tracker.getSessionSpend();
  }, [tracker]);

  const getDailySpend = useCallback((): number => {
    return tracker.getDailySpend();
  }, [tracker]);

  const getMonthlySpend = useCallback((): number => {
    return tracker.getMonthlySpend();
  }, [tracker]);

  const getSpendByEndpoint = useCallback((since?: number): SpendByEndpoint[] => {
    return tracker.getSpendByEndpoint(since);
  }, [tracker]);

  const getSessionCallCount = useCallback((): number => {
    return tracker.getSessionCallCount();
  }, [tracker]);

  const getDailySpendHistory = useCallback((days?: number): DailySpend[] => {
    return tracker.getDailySpendHistory(days);
  }, [tracker]);

  const getTotalSpend = useCallback((): number => {
    return tracker.getTotalSpend();
  }, [tracker]);

  const getTotalCallCount = useCallback((): number => {
    return tracker.getTotalCallCount();
  }, [tracker]);

  return {
    tracker,
    record,
    estimateCost,
    getSessionSpend,
    getDailySpend,
    getMonthlySpend,
    getSpendByEndpoint,
    getSessionCallCount,
    getDailySpendHistory,
    getTotalSpend,
    getTotalCallCount,
  };
}
