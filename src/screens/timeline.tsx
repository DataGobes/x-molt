import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { Footer } from "../components/footer.js";
import { LiveTweetCard } from "../components/live-tweet-card.js";
import { CostBadge } from "../components/cost-badge.js";
import { ActionBar } from "../components/action-bar.js";
import { useTerminalSize } from "../hooks/use-terminal-size.js";
import type { TimelineTweet, TimelineResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR } from "../utils/constants.js";

const CHROME_ROWS = 8;
const CARD_HEIGHT = 6; // estimated lines per full LiveTweetCard

type TimelineTab = "home" | "my-tweets";

interface TimelineProps {
  twitter: {
    getHomeTimeline: (maxResults?: number, paginationToken?: string) => Promise<TimelineResult | null>;
    getUserTimeline: (userId?: string, maxResults?: number, paginationToken?: string) => Promise<TimelineResult | null>;
    likeTweet: (tweetId: string) => Promise<boolean>;
    unlikeTweet: (tweetId: string) => Promise<boolean>;
    retweet: (tweetId: string) => Promise<boolean>;
    unretweet: (tweetId: string) => Promise<boolean>;
    bookmarkTweet: (tweetId: string) => Promise<boolean>;
    removeBookmark: (tweetId: string) => Promise<boolean>;
    followUser: (userId: string) => Promise<boolean>;
    unfollowUser: (userId: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

export function TimelineScreen({ twitter, onBack }: TimelineProps) {
  const { width, height } = useTerminalSize();
  const [tab, setTab] = useState<TimelineTab>("home");
  const [tweets, setTweets] = useState<TimelineTweet[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const paneHeight = Math.max(5, height - CHROME_ROWS);
  const maxVisible = Math.max(1, Math.floor(paneHeight / CARD_HEIGHT));

  // Scroll offset to keep selected tweet visible
  const scrollOffset = useMemo(() => {
    if (selectedIndex < maxVisible) return 0;
    return Math.min(selectedIndex - maxVisible + 1, Math.max(0, tweets.length - maxVisible));
  }, [selectedIndex, maxVisible, tweets.length]);

  const visibleTweets = tweets.slice(scrollOffset, scrollOffset + maxVisible);
  const selectedTweet = tweets[selectedIndex] ?? null;

  const loadTimeline = useCallback(async (isTab: TimelineTab, token?: string) => {
    setLoading(true);
    const result = isTab === "home"
      ? await twitter.getHomeTimeline(10, token)
      : await twitter.getUserTimeline(undefined, 10, token);
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
    loadTimeline(tab);
  }, [tab]);

  useInput((input, key) => {
    // Tab switching
    if (key.tab || input === "t") {
      setTab((prev) => (prev === "home" ? "my-tweets" : "home"));
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(tweets.length - 1, prev + 1));
    }

    // Load more
    if (input === "m" && nextToken && !loading) {
      loadTimeline(tab, nextToken);
    }

    // Refresh
    if (input === "R") {
      setTweets([]);
      setNextToken(undefined);
      loadTimeline(tab);
    }

    if (key.escape) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header title="Timeline" />

      {/* Tab bar */}
      <Box marginTop={1} gap={2}>
        {(["home", "my-tweets"] as TimelineTab[]).map((t) => (
          <Text
            key={t}
            bold={tab === t}
            color={tab === t ? BRAND_COLOR : MUTED_COLOR}
            underline={tab === t}
          >
            {t === "home" ? "Home" : "My Tweets"}
          </Text>
        ))}
        {loading && <Spinner label="" />}
      </Box>

      {twitter.error && (
        <Box paddingX={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {/* Full-width tweet list */}
      <Box flexDirection="column" height={paneHeight}>
        {tweets.length === 0 && !loading ? (
          <Box paddingX={1} paddingY={1}>
            <Text color={MUTED_COLOR}>No tweets found.</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {visibleTweets.map((tweet, i) => {
              const globalIndex = scrollOffset + i;
              const isSelected = globalIndex === selectedIndex;
              return (
                <Box key={tweet.id} flexDirection="column">
                  <LiveTweetCard
                    tweet={tweet}
                    selected={isSelected}
                    width={width - 2}
                  />
                  {isSelected && (
                    <ActionBar
                      tweet={tweet}
                      onLike={twitter.likeTweet}
                      onUnlike={twitter.unlikeTweet}
                      onRetweet={twitter.retweet}
                      onUnretweet={twitter.unretweet}
                      onBookmark={twitter.bookmarkTweet}
                      onRemoveBookmark={twitter.removeBookmark}
                      onFollow={twitter.followUser}
                      onUnfollow={twitter.unfollowUser}
                    />
                  )}
                </Box>
              );
            })}
            <Box marginTop={1} paddingX={1} justifyContent="space-between">
              <Text color={MUTED_COLOR}>{tweets.length} tweets</Text>
              {tweets.length > 0 && (
                <Text color={BRAND_COLOR}>
                  {selectedIndex + 1}/{tweets.length}
                </Text>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {nextToken && (
        <Box paddingX={1}>
          <Text color={MUTED_COLOR}>Press </Text>
          <Text bold>m</Text>
          <Text color={MUTED_COLOR}> to load more </Text>
          <CostBadge endpoint="users/timeline" count={10} />
        </Box>
      )}

      <Footer
        hints={["j/k: navigate", "tab/t: switch", "m: load more", "R: refresh", "esc: back"]}
      />
    </Box>
  );
}
