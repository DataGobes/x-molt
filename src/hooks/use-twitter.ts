import { useState, useCallback } from "react";
import {
  initClient,
  fetchProfile as apiFetchProfile,
  postTweet as apiPostTweet,
  deleteTweet as apiDeleteTweet,
  verifyCredentials as apiVerifyCredentials,
  getHomeTimeline as apiGetHomeTimeline,
  getUserTimeline as apiGetUserTimeline,
  searchRecentTweets as apiSearchRecentTweets,
  getTweetById as apiGetTweetById,
  getTweetsByIds as apiGetTweetsByIds,
  getBookmarks as apiGetBookmarks,
  likeTweet as apiLikeTweet,
  unlikeTweet as apiUnlikeTweet,
  retweet as apiRetweet,
  unretweet as apiUnretweet,
  bookmarkTweet as apiBookmarkTweet,
  removeBookmark as apiRemoveBookmark,
  followUser as apiFollowUser,
  unfollowUser as apiUnfollowUser,
  getFollowers as apiGetFollowers,
  getFollowing as apiGetFollowing,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  muteUser as apiMuteUser,
  unmuteUser as apiUnmuteUser,
  getOwnedLists as apiGetOwnedLists,
  createList as apiCreateList,
  addListMember as apiAddListMember,
  removeListMember as apiRemoveListMember,
  getDmEvents as apiGetDmEvents,
  getDmConversationMessages as apiGetDmConversationMessages,
  sendDm as apiSendDm,
  getUsage as apiGetUsage,
} from "../services/twitter-client.js";
import { loadCredentials } from "../config.js";
import type {
  Credentials, UserProfile, TimelineResult, SearchResult, TimelineTweet, BookmarkResult,
  LiveUserResult, LiveList, LiveListResult, LiveDmResult, ApiUsageResult,
} from "../types.js";

interface UseTwitterResult {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: (creds?: Credentials) => boolean;
  fetchProfile: () => Promise<UserProfile | null>;
  postTweet: (text: string) => Promise<string | null>;
  deleteTweet: (id: string) => Promise<boolean>;
  verifyCredentials: () => Promise<boolean>;
  getHomeTimeline: (maxResults?: number, paginationToken?: string) => Promise<TimelineResult | null>;
  getUserTimeline: (userId?: string, maxResults?: number, paginationToken?: string) => Promise<TimelineResult | null>;
  searchRecentTweets: (query: string, maxResults?: number, nextToken?: string) => Promise<SearchResult | null>;
  getTweetById: (id: string) => Promise<TimelineTweet | null>;
  getTweetsByIds: (ids: string[]) => Promise<TimelineTweet[]>;
  getBookmarks: (maxResults?: number, paginationToken?: string) => Promise<BookmarkResult | null>;
  likeTweet: (tweetId: string) => Promise<boolean>;
  unlikeTweet: (tweetId: string) => Promise<boolean>;
  retweet: (tweetId: string) => Promise<boolean>;
  unretweet: (tweetId: string) => Promise<boolean>;
  bookmarkTweet: (tweetId: string) => Promise<boolean>;
  removeBookmark: (tweetId: string) => Promise<boolean>;
  followUser: (targetUserId: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string) => Promise<boolean>;
  getFollowers: (maxResults?: number, paginationToken?: string) => Promise<LiveUserResult | null>;
  getFollowing: (maxResults?: number, paginationToken?: string) => Promise<LiveUserResult | null>;
  blockUser: (targetUserId: string) => Promise<boolean>;
  unblockUser: (targetUserId: string) => Promise<boolean>;
  muteUser: (targetUserId: string) => Promise<boolean>;
  unmuteUser: (targetUserId: string) => Promise<boolean>;
  getOwnedLists: (maxResults?: number, paginationToken?: string) => Promise<LiveListResult | null>;
  createList: (name: string, description?: string, isPrivate?: boolean) => Promise<LiveList | null>;
  addListMember: (listId: string, userId: string) => Promise<boolean>;
  removeListMember: (listId: string, userId: string) => Promise<boolean>;
  getDmEvents: (maxResults?: number, paginationToken?: string) => Promise<LiveDmResult | null>;
  getDmConversationMessages: (conversationId: string, maxResults?: number, paginationToken?: string) => Promise<LiveDmResult | null>;
  sendDm: (conversationId: string, text: string) => Promise<boolean>;
  getUsage: (days?: number) => Promise<ApiUsageResult | null>;
  clearError: () => void;
}

export function useTwitter(): UseTwitterResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const initialize = useCallback((creds?: Credentials): boolean => {
    const credentials = creds ?? loadCredentials();
    if (!credentials) return false;
    try {
      initClient(credentials);
      setIsInitialized(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initialize client");
      return false;
    }
  }, []);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await apiFetchProfile();
      return profile;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch profile");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const postTweet = useCallback(async (text: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiPostTweet(text);
      return result.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post tweet");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTweet = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiDeleteTweet(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete tweet");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCredentials = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiVerifyCredentials();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to verify credentials");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHomeTimeline = useCallback(async (maxResults?: number, paginationToken?: string): Promise<TimelineResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetHomeTimeline(maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch home timeline");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserTimeline = useCallback(async (userId?: string, maxResults?: number, paginationToken?: string): Promise<TimelineResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetUserTimeline(userId, maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch user timeline");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchRecentTweets = useCallback(async (query: string, maxResults?: number, nextToken?: string): Promise<SearchResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiSearchRecentTweets(query, maxResults, nextToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to search tweets");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTweetById = useCallback(async (id: string): Promise<TimelineTweet | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetTweetById(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tweet");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTweetsByIds = useCallback(async (ids: string[]): Promise<TimelineTweet[]> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetTweetsByIds(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tweets");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getBookmarks = useCallback(async (maxResults?: number, paginationToken?: string): Promise<BookmarkResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetBookmarks(maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch bookmarks");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Interaction methods — all follow the same try/catch pattern
  const wrapAction = (fn: (...args: any[]) => Promise<boolean>, errorMsg: string) =>
    useCallback(async (...args: any[]): Promise<boolean> => {
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError(e instanceof Error ? e.message : errorMsg);
        return false;
      }
    }, []);

  const likeTweet = wrapAction(apiLikeTweet, "Failed to like tweet");
  const unlikeTweet = wrapAction(apiUnlikeTweet, "Failed to unlike tweet");
  const retweet = wrapAction(apiRetweet, "Failed to retweet");
  const unretweet = wrapAction(apiUnretweet, "Failed to unretweet");
  const bookmarkTweet = wrapAction(apiBookmarkTweet, "Failed to bookmark tweet");
  const removeBookmark = wrapAction(apiRemoveBookmark, "Failed to remove bookmark");
  const followUser = wrapAction(apiFollowUser, "Failed to follow user");
  const unfollowUser = wrapAction(apiUnfollowUser, "Failed to unfollow user");

  // Social read methods
  const getFollowers = useCallback(async (maxResults?: number, paginationToken?: string): Promise<LiveUserResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetFollowers(maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch followers");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFollowing = useCallback(async (maxResults?: number, paginationToken?: string): Promise<LiveUserResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetFollowing(maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch following");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const blockUser = wrapAction(apiBlockUser, "Failed to block user");
  const unblockUser = wrapAction(apiUnblockUser, "Failed to unblock user");
  const muteUser = wrapAction(apiMuteUser, "Failed to mute user");
  const unmuteUser = wrapAction(apiUnmuteUser, "Failed to unmute user");

  // Lists methods
  const getOwnedLists = useCallback(async (maxResults?: number, paginationToken?: string): Promise<LiveListResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetOwnedLists(maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch lists");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createList = useCallback(async (name: string, description?: string, isPrivate?: boolean): Promise<LiveList | null> => {
    setError(null);
    try {
      return await apiCreateList(name, description, isPrivate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create list");
      return null;
    }
  }, []);

  const addListMember = wrapAction(apiAddListMember, "Failed to add list member");
  const removeListMember = wrapAction(apiRemoveListMember, "Failed to remove list member");

  // DM methods
  const getDmEvents = useCallback(async (maxResults?: number, paginationToken?: string): Promise<LiveDmResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetDmEvents(maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch DMs");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDmConversationMessages = useCallback(async (conversationId: string, maxResults?: number, paginationToken?: string): Promise<LiveDmResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetDmConversationMessages(conversationId, maxResults, paginationToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch conversation");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendDm = wrapAction(apiSendDm, "Failed to send DM");

  const getUsage = useCallback(async (days?: number): Promise<ApiUsageResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await apiGetUsage(days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch usage");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    initialize,
    fetchProfile,
    postTweet,
    deleteTweet,
    verifyCredentials,
    getHomeTimeline,
    getUserTimeline,
    searchRecentTweets,
    getTweetById,
    getTweetsByIds,
    getBookmarks,
    likeTweet,
    unlikeTweet,
    retweet,
    unretweet,
    bookmarkTweet,
    removeBookmark,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    getOwnedLists,
    createList,
    addListMember,
    removeListMember,
    getDmEvents,
    getDmConversationMessages,
    sendDm,
    getUsage,
    clearError,
  };
}
