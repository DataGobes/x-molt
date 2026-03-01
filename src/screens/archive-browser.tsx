import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import { TweetList } from "../components/tweet-list.js";
import { TweetCard } from "../components/tweet-card.js";
import type { StoredTweet } from "../types.js";
import { formatDate, formatNumber } from "../utils/format.js";
import { BRAND_COLOR, ERROR_COLOR, MUTED_COLOR, SUCCESS_COLOR } from "../utils/constants.js";

type Mode = "stats" | "search" | "results" | "detail";

interface ArchiveBrowserProps {
  archive: {
    search: (query: string, limit?: number) => StoredTweet[];
    getStats: () => {
      total: number;
      deleted: number;
      active: number;
      replies: number;
      retweets: number;
      original: number;
      oldestDate?: string;
      newestDate?: string;
    };
    getByDateRange: (start: Date, end: Date, limit?: number) => StoredTweet[];
  };
  onBack: () => void;
}

export function ArchiveBrowserScreen({ archive, onBack }: ArchiveBrowserProps) {
  const [mode, setMode] = useState<Mode>("stats");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<StoredTweet[]>([]);
  const [selectedTweet, setSelectedTweet] = useState<StoredTweet | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const stats = archive.getStats();

  useInput((input) => {
    if (input === "s" && mode === "stats") {
      setMode("search");
    }
    if (input === "a" && mode === "stats") {
      // Show all tweets (recent)
      const now = new Date();
      const longAgo = new Date(2006, 0, 1); // Twitter founding
      setResults(archive.getByDateRange(longAgo, now, 100));
      setMode("results");
    }
  });

  const handleSearch = (query: string) => {
    setIsSearching(true);
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    setSearchQuery(trimmed);
    const found = archive.search(trimmed, 100);
    setResults(found);
    setIsSearching(false);
    setMode("results");
  };

  const handleSelect = (tweet: StoredTweet) => {
    setSelectedTweet(tweet);
    setMode("detail");
  };

  return (
    <Box flexDirection="column">
      <Header title="Browse Tweets" />

      {mode === "stats" && (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={BRAND_COLOR}
            paddingX={2}
            paddingY={1}
          >
            <Text bold>Archive Summary</Text>
            <Box marginTop={1} flexDirection="column">
              <Text>Total tweets: <Text bold>{formatNumber(stats.total)}</Text></Text>
              <Text>Original: <Text bold color={BRAND_COLOR}>{formatNumber(stats.original)}</Text></Text>
              <Text>Replies: <Text bold>{formatNumber(stats.replies)}</Text></Text>
              <Text>Retweets: <Text bold>{formatNumber(stats.retweets)}</Text></Text>
              <Text color={ERROR_COLOR}>Deleted: <Text bold>{formatNumber(stats.deleted)}</Text></Text>
              <Text color={SUCCESS_COLOR}>Active: <Text bold>{formatNumber(stats.active)}</Text></Text>
            </Box>
            {stats.oldestDate && stats.newestDate && (
              <Box marginTop={1}>
                <Text color={MUTED_COLOR}>
                  {formatDate(stats.oldestDate)} → {formatDate(stats.newestDate)}
                </Text>
              </Box>
            )}
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text color={MUTED_COLOR}>Press <Text bold>s</Text> to search, <Text bold>a</Text> to browse all</Text>
          </Box>
        </Box>
      )}

      {mode === "search" && (
        <Box flexDirection="column">
          <Text bold>Search tweets:</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="Enter search term..."
              onSubmit={handleSearch}
            />
          </Box>
        </Box>
      )}

      {mode === "results" && (
        <Box flexDirection="column">
          {searchQuery && (
            <Box marginBottom={1}>
              <Text color={MUTED_COLOR}>
                Results for "<Text bold>{searchQuery}</Text>" ({results.length} found)
              </Text>
            </Box>
          )}
          <TweetList tweets={results} onSelect={handleSelect} />
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Press <Text bold>s</Text> to search again</Text>
          </Box>
        </Box>
      )}

      {mode === "detail" && selectedTweet && (
        <Box flexDirection="column">
          <TweetCard tweet={selectedTweet} />
          <Text color={MUTED_COLOR}>Press esc to go back to results.</Text>
        </Box>
      )}

      <KeyHints hints={["s: search", "a: all", "esc: back"]} showBack />
    </Box>
  );
}
