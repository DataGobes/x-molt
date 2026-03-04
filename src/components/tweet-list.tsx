import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { StoredTweet } from "../types.js";
import { TweetCard } from "./tweet-card.js";
import { MUTED_COLOR, BRAND_COLOR } from "../utils/constants.js";

interface TweetListProps {
  tweets: StoredTweet[];
  pageSize?: number;
  maxTextWidth?: number;
  onSelect?: (tweet: StoredTweet) => void;
  onSelectionChange?: (tweet: StoredTweet | null) => void;
  active?: boolean;
}

export function TweetList({
  tweets,
  pageSize = 10,
  maxTextWidth,
  onSelect,
  onSelectionChange,
  active = true,
}: TweetListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(tweets.length / pageSize);
  const start = page * pageSize;
  const visible = tweets.slice(start, start + pageSize);

  // Reset selection when tweets change
  useEffect(() => {
    setSelectedIndex(0);
    setPage(0);
  }, [tweets]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const tweet = visible[selectedIndex] ?? null;
      onSelectionChange(tweet);
    }
  }, [selectedIndex, page, tweets]);

  useInput((input, key) => {
    if (!active) return;

    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => {
        if (prev > 0) return prev - 1;
        if (page > 0) {
          setPage((p) => p - 1);
          return pageSize - 1;
        }
        return prev;
      });
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => {
        if (prev < visible.length - 1) return prev + 1;
        if (page < totalPages - 1) {
          setPage((p) => p + 1);
          return 0;
        }
        return prev;
      });
    }
    if (key.return && onSelect && visible[selectedIndex]) {
      onSelect(visible[selectedIndex]);
    }
  });

  if (tweets.length === 0) {
    return (
      <Box>
        <Text color={MUTED_COLOR}>No items found.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {visible.map((tweet, i) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          selected={i === selectedIndex}
          compact
          maxWidth={maxTextWidth}
        />
      ))}
      <Box marginTop={1} justifyContent="space-between">
        <Text color={MUTED_COLOR}>
          {tweets.length} tweet{tweets.length !== 1 ? "s" : ""}
        </Text>
        {totalPages > 1 && (
          <Text color={BRAND_COLOR}>
            Page {page + 1}/{totalPages}
          </Text>
        )}
      </Box>
    </Box>
  );
}
