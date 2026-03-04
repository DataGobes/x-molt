import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import { LiveTweetCard } from "../components/live-tweet-card.js";
import { CostBadge } from "../components/cost-badge.js";
import { ActionBar } from "../components/action-bar.js";
import type { TimelineTweet, BookmarkResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR } from "../utils/constants.js";

interface BookmarksProps {
  twitter: {
    getBookmarks: (maxResults?: number, paginationToken?: string) => Promise<BookmarkResult | null>;
    likeTweet: (tweetId: string) => Promise<boolean>;
    unlikeTweet: (tweetId: string) => Promise<boolean>;
    retweet: (tweetId: string) => Promise<boolean>;
    unretweet: (tweetId: string) => Promise<boolean>;
    removeBookmark: (tweetId: string) => Promise<boolean>;
    followUser: (userId: string) => Promise<boolean>;
    unfollowUser: (userId: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

export function BookmarksScreen({ twitter, onBack }: BookmarksProps) {
  const [tweets, setTweets] = useState<TimelineTweet[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async (token?: string) => {
    setLoading(true);
    const result = await twitter.getBookmarks(10, token);
    if (result) {
      if (token) {
        setTweets((prev) => [...prev, ...result.tweets]);
      } else {
        setTweets(result.tweets);
        setSelectedIndex(0);
      }
      setNextToken(result.nextToken);
    }
    setLoading(false);
  }, [twitter]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const selectedTweet = tweets[selectedIndex] ?? null;

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(tweets.length - 1, prev + 1));
    }

    // Load more
    if (input === "m" && nextToken && !loading) {
      loadBookmarks(nextToken);
    }

    // Refresh
    if (input === "R") {
      setTweets([]);
      setNextToken(undefined);
      loadBookmarks();
    }

    if (key.escape) {
      onBack();
    }
  });

  return (
    <FullScreen title="Bookmarks" hints={["j/k: navigate", "m: load more", "R: refresh", "esc: back"]} showBack>

      {loading && (
        <Box>
          <Spinner label="Loading bookmarks..." />
        </Box>
      )}

      {twitter.error && (
        <Box marginY={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {!loading && tweets.length === 0 && (
        <Box>
          <Text color={MUTED_COLOR}>No bookmarks found.</Text>
        </Box>
      )}

      {tweets.length > 0 && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={MUTED_COLOR}>{tweets.length} bookmarks</Text>
          </Box>

          {tweets.slice(Math.max(0, selectedIndex - 4), selectedIndex + 6).map((tweet) => {
            const actualIndex = tweets.indexOf(tweet);
            return (
              <Box key={tweet.id} marginBottom={0}>
                <LiveTweetCard
                  tweet={tweet}
                  selected={actualIndex === selectedIndex}
                  compact
                />
              </Box>
            );
          })}

          {/* Detail view */}
          {selectedTweet && (
            <Box marginTop={1} flexDirection="column">
              <LiveTweetCard tweet={selectedTweet} />
              <ActionBar
                tweet={selectedTweet}
                onLike={twitter.likeTweet}
                onUnlike={twitter.unlikeTweet}
                onRetweet={twitter.retweet}
                onUnretweet={twitter.unretweet}
                onRemoveBookmark={twitter.removeBookmark}
                onFollow={twitter.followUser}
                onUnfollow={twitter.unfollowUser}
              />
            </Box>
          )}

          {nextToken && (
            <Box marginTop={1}>
              <Text color={MUTED_COLOR}>Press </Text>
              <Text bold>m</Text>
              <Text color={MUTED_COLOR}> to load more </Text>
              <CostBadge endpoint="bookmarks" count={10} />
            </Box>
          )}
        </Box>
      )}

    </FullScreen>
  );
}
