import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { TweetCard } from "./tweet-card.js";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";
import type { StoredTweet, StoredLike, StoredFollower, StoredFollowing, StoredBlock, StoredMute } from "../types.js";

export type BrowseTab = "tweets" | "likes" | "followers" | "following" | "blocks" | "mutes";

type DetailItem = StoredTweet | StoredLike | StoredFollower | StoredFollowing | StoredBlock | StoredMute;

interface DetailPaneProps {
  tab: BrowseTab;
  item: DetailItem | null;
  width: number;
}

export function DetailPane({ tab, item, width }: DetailPaneProps) {
  if (!item) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color={MUTED_COLOR}>Select an item to view details</Text>
      </Box>
    );
  }

  switch (tab) {
    case "tweets":
      return (
        <Box paddingX={1} flexDirection="column">
          <TweetCard tweet={item as StoredTweet} width={width - 2} />
        </Box>
      );

    case "likes":
      return <LikeDetail item={item as StoredLike} />;

    case "followers":
      return <UserDetail label="Follower" item={item as StoredFollower} />;

    case "following":
      return <UserDetail label="Following" item={item as StoredFollowing} />;

    case "blocks":
      return <UserDetail label="Blocked" item={item as StoredBlock} />;

    case "mutes":
      return <UserDetail label="Muted" item={item as StoredMute} />;
  }
}

function LikeDetail({ item }: { item: StoredLike }) {
  return (
    <Box paddingX={1} paddingY={1} flexDirection="column">
      <Text bold color={BRAND_COLOR}>Liked Tweet</Text>
      <Box marginTop={1}>
        <Text wrap="wrap">{item.fullText}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={MUTED_COLOR}>ID: {item.tweetId}</Text>
      </Box>
      <Box marginTop={0}>
        <Text color={MUTED_COLOR}>Link: {item.expandedUrl}</Text>
      </Box>
    </Box>
  );
}

function UserDetail({ label, item }: { label: string; item: { accountId: string; userLink: string } }) {
  return (
    <Box paddingX={1} paddingY={1} flexDirection="column">
      <Text bold color={BRAND_COLOR}>{label}</Text>
      <Box marginTop={1}>
        <Text>Account ID: <Text bold>{item.accountId}</Text></Text>
      </Box>
      <Box marginTop={0}>
        <Text color={MUTED_COLOR}>{item.userLink}</Text>
      </Box>
    </Box>
  );
}

// --- TweetListPane: scrollable list of full TweetCards ---

interface TweetListPaneProps {
  tweets: StoredTweet[];
  selectedIndex: number;
  width: number;
  height: number;
  focused: boolean;
}

const CARD_HEIGHT = 6; // estimated lines per TweetCard in full mode

export function TweetListPane({ tweets, selectedIndex, width, height, focused }: TweetListPaneProps) {
  if (tweets.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color={MUTED_COLOR}>Select a day to view tweets</Text>
      </Box>
    );
  }

  // Calculate scroll offset to keep selected card visible
  const maxVisible = Math.max(1, Math.floor(height / CARD_HEIGHT));
  const scrollOffset = useMemo(() => {
    if (selectedIndex < maxVisible) return 0;
    return Math.min(selectedIndex - maxVisible + 1, tweets.length - maxVisible);
  }, [selectedIndex, maxVisible, tweets.length]);

  const visibleTweets = tweets.slice(scrollOffset, scrollOffset + maxVisible);

  return (
    <Box flexDirection="column" paddingX={1}>
      {visibleTweets.map((tweet, i) => {
        const globalIndex = scrollOffset + i;
        const isSelected = globalIndex === selectedIndex;
        return (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            selected={focused && isSelected}
            width={width - 2}
          />
        );
      })}
      <Box justifyContent="space-between">
        <Text color={MUTED_COLOR}>
          {tweets.length} tweets
        </Text>
        <Text color={focused ? BRAND_COLOR : MUTED_COLOR}>
          {selectedIndex + 1}/{tweets.length}
        </Text>
      </Box>
    </Box>
  );
}
