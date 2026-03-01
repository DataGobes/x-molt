import React from "react";
import { Box, Text } from "ink";
import type { StoredTweet } from "../types.js";
import { formatDate, formatNumber, truncate } from "../utils/format.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR } from "../utils/constants.js";

interface TweetCardProps {
  tweet: StoredTweet;
  selected?: boolean;
  compact?: boolean;
}

export function TweetCard({ tweet, selected = false, compact = false }: TweetCardProps) {
  const borderColor = selected ? BRAND_COLOR : "gray";

  if (compact) {
    return (
      <Box>
        <Text color={selected ? BRAND_COLOR : undefined}>
          {selected ? "▸ " : "  "}
        </Text>
        <Text color={MUTED_COLOR}>{formatDate(tweet.createdAt)} </Text>
        <Text>{truncate(tweet.fullText.replace(/\n/g, " "), 60)}</Text>
        {tweet.deleted && <Text color={ERROR_COLOR}> [deleted]</Text>}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Text color={MUTED_COLOR}>{formatDate(tweet.createdAt)}</Text>
        <Text color={MUTED_COLOR}>ID: {tweet.id}</Text>
      </Box>
      <Box marginY={0}>
        <Text wrap="wrap">{tweet.fullText}</Text>
      </Box>
      <Box gap={2}>
        <Text color={ERROR_COLOR}>♥ {formatNumber(tweet.favoriteCount)}</Text>
        <Text color={BRAND_COLOR}>↻ {formatNumber(tweet.retweetCount)}</Text>
        {tweet.isReply && <Text color={MUTED_COLOR}>↩ reply</Text>}
        {tweet.isRetweet && <Text color={MUTED_COLOR}>RT</Text>}
        {tweet.deleted && <Text color={ERROR_COLOR}>✗ deleted</Text>}
      </Box>
    </Box>
  );
}
