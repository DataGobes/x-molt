import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import { LiveTweetCard } from "../components/live-tweet-card.js";
import { CostBadge } from "../components/cost-badge.js";
import { ActionBar } from "../components/action-bar.js";
import type { TimelineTweet, SearchResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR } from "../utils/constants.js";

type Step = "input" | "results";

interface SearchProps {
  twitter: {
    searchRecentTweets: (query: string, maxResults?: number, nextToken?: string) => Promise<SearchResult | null>;
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

export function SearchScreen({ twitter, onBack }: SearchProps) {
  const [step, setStep] = useState<Step>("input");
  const [query, setQuery] = useState("");
  const [tweets, setTweets] = useState<TimelineTweet[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string, token?: string) => {
    setLoading(true);
    const result = await twitter.searchRecentTweets(q, 10, token);
    if (result) {
      if (token) {
        setTweets((prev) => [...prev, ...result.tweets]);
      } else {
        setTweets(result.tweets);
        setSelectedIndex(0);
      }
      setNextToken(result.nextToken);
      setStep("results");
    }
    setLoading(false);
  }, [twitter]);

  useInput((input, key) => {
    if (step !== "results") return;

    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(tweets.length - 1, prev + 1));
    }

    // New search
    if (input === "/") {
      setStep("input");
    }

    // Load more
    if (input === "m" && nextToken && !loading) {
      doSearch(query, nextToken);
    }

    if (key.escape) {
      if (step === "results") {
        setStep("input");
        setTweets([]);
      } else {
        onBack();
      }
    }
  });

  const selectedTweet = tweets[selectedIndex] ?? null;

  return (
    <FullScreen title="Search Tweets" hints={step === "results" ? ["j/k: navigate", "/: new search", "m: load more", "esc: back"] : ["esc: back"]} showBack>

      {step === "input" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Search recent tweets on X </Text>
            <CostBadge endpoint="tweets/search/recent" count={10} suffix="query" />
          </Box>
          <Box>
            <Text color={BRAND_COLOR}>🔍 </Text>
            <TextInput
              placeholder="Enter search query..."
              onSubmit={(value) => {
                const q = value.trim();
                if (q) {
                  setQuery(q);
                  doSearch(q);
                }
              }}
            />
          </Box>
        </Box>
      )}

      {loading && (
        <Box marginY={1}>
          <Spinner label="Searching..." />
        </Box>
      )}

      {twitter.error && (
        <Box marginY={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {step === "results" && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={MUTED_COLOR}>Results for "</Text>
            <Text bold>{query}</Text>
            <Text color={MUTED_COLOR}>" ({tweets.length} tweets)</Text>
          </Box>

          {tweets.length === 0 ? (
            <Text color={MUTED_COLOR}>No tweets found.</Text>
          ) : (
            <Box flexDirection="column">
              {tweets.slice(Math.max(0, selectedIndex - 4), selectedIndex + 6).map((tweet, _i, arr) => {
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
            </Box>
          )}

          {/* Detail view of selected tweet */}
          {selectedTweet && (
            <Box marginTop={1} flexDirection="column">
              <LiveTweetCard tweet={selectedTweet} />
              <ActionBar
                tweet={selectedTweet}
                onLike={twitter.likeTweet}
                onUnlike={twitter.unlikeTweet}
                onRetweet={twitter.retweet}
                onUnretweet={twitter.unretweet}
                onBookmark={twitter.bookmarkTweet}
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
              <CostBadge endpoint="tweets/search/recent" count={10} />
            </Box>
          )}
        </Box>
      )}

    </FullScreen>
  );
}
