import React from "react";
import { Box, Text } from "ink";
import type { TimelineTweet } from "../types.js";
import { formatNumber, truncate } from "../utils/format.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR } from "../utils/constants.js";

interface LiveTweetCardProps {
  tweet: TimelineTweet;
  selected?: boolean;
  compact?: boolean;
  maxWidth?: number;
  width?: number;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LiveTweetCard({ tweet, selected = false, compact = false, maxWidth, width }: LiveTweetCardProps) {
  const borderColor = selected ? BRAND_COLOR : "gray";

  if (compact) {
    const author = tweet.authorUsername ? `@${tweet.authorUsername}` : tweet.authorId;
    const dateStr = formatDate(tweet.createdAt);
    const overhead = 2 + author.length + 1 + dateStr.length + 1;
    const textWidth = maxWidth ? maxWidth - overhead : 50;
    return (
      <Box>
        <Text color={selected ? BRAND_COLOR : undefined}>
          {selected ? "▸ " : "  "}
        </Text>
        <Text color={BRAND_COLOR} bold={selected}>{author}</Text>
        <Text color={MUTED_COLOR}> {dateStr} </Text>
        <Text>{truncate(tweet.text.replace(/\n/g, " "), Math.max(textWidth, 10))}</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      {...(width ? { width } : {})}
    >
      <Box justifyContent="space-between">
        <Box>
          {tweet.authorName && <Text bold>{tweet.authorName} </Text>}
          <Text color={MUTED_COLOR}>@{tweet.authorUsername ?? tweet.authorId}</Text>
        </Box>
        <Text color={MUTED_COLOR}>{formatDate(tweet.createdAt)}</Text>
      </Box>
      <Box marginY={0}>
        <Text wrap="wrap">{tweet.text}</Text>
      </Box>
      <Box gap={2}>
        <Text color={ERROR_COLOR}>♥ {formatNumber(tweet.publicMetrics.likes)}</Text>
        <Text color={BRAND_COLOR}>↻ {formatNumber(tweet.publicMetrics.retweets)}</Text>
        <Text color={MUTED_COLOR}>💬 {formatNumber(tweet.publicMetrics.replies)}</Text>
        {tweet.publicMetrics.impressions > 0 && (
          <Text color={MUTED_COLOR}>👁 {formatNumber(tweet.publicMetrics.impressions)}</Text>
        )}
        {tweet.isReply && <Text color={MUTED_COLOR}>↩ reply</Text>}
        {tweet.isRetweet && <Text color={MUTED_COLOR}>RT</Text>}
      </Box>
    </Box>
  );
}
