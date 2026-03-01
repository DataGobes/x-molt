import { useState, useCallback, useMemo } from "react";
import { ArchiveStore } from "../services/archive-store.js";
import { getDbPath } from "../config.js";
import type { StoredTweet, BatchDeleteFilter } from "../types.js";

export function useArchive() {
  const store = useMemo(() => new ArchiveStore(getDbPath()), []);
  const [isLoading, setIsLoading] = useState(false);

  const getTweetCount = useCallback((): number => {
    return store.getTweetCount();
  }, [store]);

  const hasArchive = useCallback((): boolean => {
    return store.getTweetCount() > 0;
  }, [store]);

  const search = useCallback((query: string, limit = 50): StoredTweet[] => {
    return store.searchTweets(query, limit);
  }, [store]);

  const getByDateRange = useCallback((start: Date, end: Date, limit = 50): StoredTweet[] => {
    return store.getTweetsByDateRange(start, end, limit);
  }, [store]);

  const getFiltered = useCallback((filter: BatchDeleteFilter, limit?: number): StoredTweet[] => {
    return store.getFilteredTweets(filter, limit);
  }, [store]);

  const markDeleted = useCallback((id: string): void => {
    store.markDeleted(id);
  }, [store]);

  const getStats = useCallback(() => {
    return store.getStats();
  }, [store]);

  return {
    store,
    isLoading,
    getTweetCount,
    hasArchive,
    search,
    getByDateRange,
    getFiltered,
    markDeleted,
    getStats,
  };
}
