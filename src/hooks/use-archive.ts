import { useState, useCallback, useMemo } from "react";
import { ArchiveStore } from "../services/archive-store.js";
import { getDbPath } from "../config.js";
import type {
  StoredTweet, StoredLike, StoredFollower, StoredFollowing, StoredBlock, StoredMute,
  StoredAccount, StoredProfile, StoredDmConversation, StoredDirectMessage, StoredNoteTweet,
  StoredGrokChat, StoredIpAudit, StoredInterest, StoredDemographic, StoredContact,
  StoredAdEngagement, StoredAdImpression, StoredConnectedApp, StoredDeviceToken, StoredApp,
  BatchDeleteFilter, DateHierarchy, EmbeddableType,
} from "../types.js";

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

  const getLikeCount = useCallback((): number => {
    return store.getLikeCount();
  }, [store]);

  const getFollowerCount = useCallback((): number => {
    return store.getFollowerCount();
  }, [store]);

  const getFollowingCount = useCallback((): number => {
    return store.getFollowingCount();
  }, [store]);

  const getBlockCount = useCallback((): number => {
    return store.getBlockCount();
  }, [store]);

  const getMuteCount = useCallback((): number => {
    return store.getMuteCount();
  }, [store]);

  const getAccount = useCallback((): StoredAccount | null => {
    return store.getAccount();
  }, [store]);

  const getProfile = useCallback((): StoredProfile | null => {
    return store.getProfile();
  }, [store]);

  const getStats = useCallback(() => {
    return store.getStats();
  }, [store]);

  const getDateHierarchy = useCallback((): DateHierarchy => {
    return store.getDateHierarchy();
  }, [store]);

  const getTweetsByDay = useCallback((year: number, month: number, day: number): StoredTweet[] => {
    return store.getTweetsByDay(year, month, day);
  }, [store]);

  const getTweets = useCallback((limit = 50, offset = 0): StoredTweet[] => {
    return store.getTweets(limit, offset);
  }, [store]);

  const getLikes = useCallback((limit = 50, offset = 0): StoredLike[] => {
    return store.getLikes(limit, offset);
  }, [store]);

  const searchLikes = useCallback((query: string, limit = 50): StoredLike[] => {
    return store.searchLikes(query, limit);
  }, [store]);

  const getFollowers = useCallback((limit = 50, offset = 0): StoredFollower[] => {
    return store.getFollowers(limit, offset);
  }, [store]);

  const getFollowing = useCallback((limit = 50, offset = 0): StoredFollowing[] => {
    return store.getFollowing(limit, offset);
  }, [store]);

  const getBlocks = useCallback((limit = 50, offset = 0): StoredBlock[] => {
    return store.getBlocks(limit, offset);
  }, [store]);

  const getMutes = useCallback((limit = 50, offset = 0): StoredMute[] => {
    return store.getMutes(limit, offset);
  }, [store]);

  const getDmConversationCount = useCallback((): number => store.getDmConversationCount(), [store]);
  const getDirectMessageCount = useCallback((): number => store.getDirectMessageCount(), [store]);
  const getDmConversations = useCallback((limit = 50, offset = 0): StoredDmConversation[] => store.getDmConversations(limit, offset), [store]);
  const getDirectMessages = useCallback((conversationId: string, limit = 100, offset = 0): StoredDirectMessage[] => store.getDirectMessages(conversationId, limit, offset), [store]);

  const getNoteTweetCount = useCallback((): number => store.getNoteTweetCount(), [store]);
  const getNoteTweets = useCallback((limit = 50, offset = 0): StoredNoteTweet[] => store.getNoteTweets(limit, offset), [store]);

  const getGrokChatCount = useCallback((): number => store.getGrokChatCount(), [store]);
  const getGrokChats = useCallback((limit = 50, offset = 0): StoredGrokChat[] => store.getGrokChats(limit, offset), [store]);

  const getIpAuditCount = useCallback((): number => store.getIpAuditCount(), [store]);
  const getIpAudit = useCallback((limit = 50, offset = 0): StoredIpAudit[] => store.getIpAudit(limit, offset), [store]);

  const getInterestCount = useCallback((): number => store.getInterestCount(), [store]);
  const getInterests = useCallback((limit = 50, offset = 0): StoredInterest[] => store.getInterests(limit, offset), [store]);

  const getDemographics = useCallback((): StoredDemographic[] => store.getDemographics(), [store]);

  const getContactCount = useCallback((): number => store.getContactCount(), [store]);
  const getContacts = useCallback((limit = 50, offset = 0): StoredContact[] => store.getContacts(limit, offset), [store]);

  const getAdEngagementCount = useCallback((): number => store.getAdEngagementCount(), [store]);
  const getAdEngagements = useCallback((limit = 50, offset = 0): StoredAdEngagement[] => store.getAdEngagements(limit, offset), [store]);

  const getAdImpressionCount = useCallback((): number => store.getAdImpressionCount(), [store]);
  const getAdImpressions = useCallback((limit = 50, offset = 0): StoredAdImpression[] => store.getAdImpressions(limit, offset), [store]);

  const getConnectedAppCount = useCallback((): number => store.getConnectedAppCount(), [store]);
  const getConnectedApps = useCallback((limit = 50, offset = 0): StoredConnectedApp[] => store.getConnectedApps(limit, offset), [store]);

  const getDeviceTokenCount = useCallback((): number => store.getDeviceTokenCount(), [store]);
  const getDeviceTokens = useCallback((limit = 50, offset = 0): StoredDeviceToken[] => store.getDeviceTokens(limit, offset), [store]);

  const getAppCount = useCallback((): number => store.getAppCount(), [store]);
  const getApps = useCallback((limit = 50, offset = 0): StoredApp[] => store.getApps(limit, offset), [store]);

  // --- Semantic Search ---
  const semanticSearch = useCallback(async (query: string, limit = 50) => {
    return store.semanticSearch(query, limit);
  }, [store]);

  const semanticSearchLikes = useCallback(async (query: string, limit = 50) => {
    return store.semanticSearchLikes(query, limit);
  }, [store]);

  const semanticSearchDms = useCallback(async (query: string, limit = 50) => {
    return store.semanticSearchDms(query, limit);
  }, [store]);

  const semanticSearchGrokChats = useCallback(async (query: string, limit = 50) => {
    return store.semanticSearchGrokChats(query, limit);
  }, [store]);

  const semanticSearchNoteTweets = useCallback(async (query: string, limit = 50) => {
    return store.semanticSearchNoteTweets(query, limit);
  }, [store]);

  const getEmbeddingStats = useCallback((): Record<EmbeddableType, { total: number; embedded: number }> => {
    return store.getEmbeddingStats();
  }, [store]);

  // --- Analytics ---
  const getYearlyCounts = useCallback(() => store.getYearlyCounts(), [store]);
  const getHourlyDistribution = useCallback(() => store.getHourlyDistribution(), [store]);
  const getDayOfWeekDistribution = useCallback(() => store.getDayOfWeekDistribution(), [store]);
  const getMonthlyCountsForYear = useCallback((year: string) => store.getMonthlyCountsForYear(year), [store]);
  const getTopTweetsByLikes = useCallback((limit = 10) => store.getTopTweetsByLikes(limit), [store]);
  const getTopTweetsByRetweets = useCallback((limit = 10) => store.getTopTweetsByRetweets(limit), [store]);
  const getEngagementDistribution = useCallback(() => store.getEngagementDistribution(), [store]);
  const getAvgEngagementByType = useCallback(() => store.getAvgEngagementByType(), [store]);
  const getTopAdvertisers = useCallback((limit = 10) => store.getTopAdvertisers(limit), [store]);
  const getTopTargetingTypes = useCallback((limit = 10) => store.getTopTargetingTypes(limit), [store]);
  const getAdDeviceBreakdown = useCallback(() => store.getAdDeviceBreakdown(), [store]);
  const getIpAuditSummary = useCallback(() => store.getIpAuditSummary(), [store]);

  return {
    store,
    isLoading,
    getTweetCount,
    hasArchive,
    search,
    getByDateRange,
    getFiltered,
    getDateHierarchy,
    getTweetsByDay,
    markDeleted,
    getLikeCount,
    getFollowerCount,
    getFollowingCount,
    getBlockCount,
    getMuteCount,
    getAccount,
    getProfile,
    getStats,
    getTweets,
    getLikes,
    searchLikes,
    getFollowers,
    getFollowing,
    getBlocks,
    getMutes,
    getDmConversationCount,
    getDirectMessageCount,
    getDmConversations,
    getDirectMessages,
    getNoteTweetCount,
    getNoteTweets,
    getGrokChatCount,
    getGrokChats,
    getIpAuditCount,
    getIpAudit,
    getInterestCount,
    getInterests,
    getDemographics,
    getContactCount,
    getContacts,
    getAdEngagementCount,
    getAdEngagements,
    getAdImpressionCount,
    getAdImpressions,
    getConnectedAppCount,
    getConnectedApps,
    getDeviceTokenCount,
    getDeviceTokens,
    getAppCount,
    getApps,
    getYearlyCounts,
    getHourlyDistribution,
    getDayOfWeekDistribution,
    getMonthlyCountsForYear,
    getTopTweetsByLikes,
    getTopTweetsByRetweets,
    getEngagementDistribution,
    getAvgEngagementByType,
    getTopAdvertisers,
    getTopTargetingTypes,
    getAdDeviceBreakdown,
    getIpAuditSummary,
    semanticSearch,
    semanticSearchLikes,
    semanticSearchDms,
    semanticSearchGrokChats,
    semanticSearchNoteTweets,
    getEmbeddingStats,
  };
}
