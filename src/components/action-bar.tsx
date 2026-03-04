import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { CostBadge } from "./cost-badge.js";
import { SUCCESS_COLOR, ERROR_COLOR, MUTED_COLOR, BRAND_COLOR } from "../utils/constants.js";

interface ActionableTweet {
  id: string;
  authorId?: string;
}

interface ActionBarProps {
  tweet: ActionableTweet;
  active?: boolean;
  onLike?: (tweetId: string) => Promise<boolean>;
  onUnlike?: (tweetId: string) => Promise<boolean>;
  onRetweet?: (tweetId: string) => Promise<boolean>;
  onUnretweet?: (tweetId: string) => Promise<boolean>;
  onBookmark?: (tweetId: string) => Promise<boolean>;
  onRemoveBookmark?: (tweetId: string) => Promise<boolean>;
  onFollow?: (userId: string) => Promise<boolean>;
  onUnfollow?: (userId: string) => Promise<boolean>;
}

type ActionStatus = { message: string; color: string } | null;

export function ActionBar({
  tweet,
  active = true,
  onLike,
  onUnlike,
  onRetweet,
  onUnretweet,
  onBookmark,
  onRemoveBookmark,
  onFollow,
  onUnfollow,
}: ActionBarProps) {
  const [status, setStatus] = useState<ActionStatus>(null);
  const [busy, setBusy] = useState(false);

  const showStatus = (message: string, color: string) => {
    setStatus({ message, color });
    setTimeout(() => setStatus(null), 1500);
  };

  const runAction = async (fn: (() => Promise<boolean>) | undefined, successMsg: string, failMsg: string) => {
    if (!fn || busy) return;
    setBusy(true);
    try {
      const ok = await fn();
      showStatus(ok ? successMsg : failMsg, ok ? SUCCESS_COLOR : ERROR_COLOR);
    } catch {
      showStatus(failMsg, ERROR_COLOR);
    } finally {
      setBusy(false);
    }
  };

  useInput((input) => {
    if (!active || busy) return;

    if (input === "l" && onLike) {
      runAction(() => onLike(tweet.id), "Liked!", "Failed to like");
    }
    if (input === "L" && onUnlike) {
      runAction(() => onUnlike(tweet.id), "Unliked!", "Failed to unlike");
    }
    if (input === "r" && onRetweet) {
      runAction(() => onRetweet(tweet.id), "Retweeted!", "Failed to retweet");
    }
    if (input === "u" && onUnretweet) {
      runAction(() => onUnretweet(tweet.id), "Unretweeted!", "Failed to unretweet");
    }
    if (input === "b" && onBookmark) {
      runAction(() => onBookmark(tweet.id), "Bookmarked!", "Failed to bookmark");
    }
    if (input === "B" && onRemoveBookmark) {
      runAction(() => onRemoveBookmark(tweet.id), "Removed bookmark!", "Failed to remove bookmark");
    }
    if (input === "f" && onFollow && tweet.authorId) {
      runAction(() => onFollow(tweet.authorId!), "Followed!", "Failed to follow");
    }
    if (input === "F" && onUnfollow && tweet.authorId) {
      runAction(() => onUnfollow(tweet.authorId!), "Unfollowed!", "Failed to unfollow");
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      {status && (
        <Box marginBottom={0}>
          <Text color={status.color}>{status.message}</Text>
        </Box>
      )}
      <Box gap={1} flexWrap="wrap">
        {onLike && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>l</Text>
            <Text color={MUTED_COLOR}>] Like </Text>
            <CostBadge endpoint="tweets/like" />
          </Box>
        )}
        {onRetweet && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>r</Text>
            <Text color={MUTED_COLOR}>] RT </Text>
            <CostBadge endpoint="tweets/retweet" />
          </Box>
        )}
        {onBookmark && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>b</Text>
            <Text color={MUTED_COLOR}>] Bookmark </Text>
            <CostBadge endpoint="bookmarks/create" />
          </Box>
        )}
        {onFollow && tweet.authorId && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>f</Text>
            <Text color={MUTED_COLOR}>] Follow </Text>
            <CostBadge endpoint="users/follow" />
          </Box>
        )}
      </Box>
      <Box gap={1} flexWrap="wrap">
        {onUnlike && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>L</Text>
            <Text color={MUTED_COLOR}>] Unlike</Text>
          </Box>
        )}
        {onUnretweet && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>u</Text>
            <Text color={MUTED_COLOR}>] Un-RT</Text>
          </Box>
        )}
        {onRemoveBookmark && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>B</Text>
            <Text color={MUTED_COLOR}>] Unbookmark</Text>
          </Box>
        )}
        {onUnfollow && tweet.authorId && (
          <Box>
            <Text color={MUTED_COLOR}>[</Text>
            <Text bold>F</Text>
            <Text color={MUTED_COLOR}>] Unfollow</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
