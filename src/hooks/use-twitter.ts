import { useState, useCallback } from "react";
import {
  initClient,
  fetchProfile as apiFetchProfile,
  postTweet as apiPostTweet,
  deleteTweet as apiDeleteTweet,
  verifyCredentials as apiVerifyCredentials,
} from "../services/twitter-client.js";
import { loadCredentials } from "../config.js";
import type { Credentials, UserProfile } from "../types.js";

interface UseTwitterResult {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: (creds?: Credentials) => boolean;
  fetchProfile: () => Promise<UserProfile | null>;
  postTweet: (text: string) => Promise<string | null>;
  deleteTweet: (id: string) => Promise<boolean>;
  verifyCredentials: () => Promise<boolean>;
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

  return {
    isInitialized,
    isLoading,
    error,
    initialize,
    fetchProfile,
    postTweet,
    deleteTweet,
    verifyCredentials,
    clearError,
  };
}
