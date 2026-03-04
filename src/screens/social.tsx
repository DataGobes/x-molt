import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import { CostBadge } from "../components/cost-badge.js";
import type { LiveUser, LiveUserResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR, SUCCESS_COLOR } from "../utils/constants.js";
import { formatNumber, truncate } from "../utils/format.js";

type SocialTab = "followers" | "following";

interface SocialProps {
  twitter: {
    getFollowers: (maxResults?: number, paginationToken?: string) => Promise<LiveUserResult | null>;
    getFollowing: (maxResults?: number, paginationToken?: string) => Promise<LiveUserResult | null>;
    followUser: (userId: string) => Promise<boolean>;
    unfollowUser: (userId: string) => Promise<boolean>;
    blockUser: (userId: string) => Promise<boolean>;
    unblockUser: (userId: string) => Promise<boolean>;
    muteUser: (userId: string) => Promise<boolean>;
    unmuteUser: (userId: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

export function SocialScreen({ twitter, onBack }: SocialProps) {
  const [tab, setTab] = useState<SocialTab>("followers");
  const [users, setUsers] = useState<LiveUser[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadUsers = useCallback(async (t: SocialTab, token?: string) => {
    setLoading(true);
    const result = t === "followers"
      ? await twitter.getFollowers(20, token)
      : await twitter.getFollowing(20, token);
    if (result) {
      if (token) {
        setUsers((prev) => [...prev, ...result.users]);
      } else {
        setUsers(result.users);
        setSelectedIndex(0);
      }
      setNextToken(result.nextToken);
    }
    setLoading(false);
  }, [twitter]);

  useEffect(() => {
    loadUsers(tab);
  }, [tab]);

  const selectedUser = users[selectedIndex] ?? null;

  const showAction = (msg: string) => {
    setActionStatus(msg);
    setTimeout(() => setActionStatus(null), 1500);
  };

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(users.length - 1, prev + 1));
    }

    // Tab switch
    if (key.tab || input === "t") {
      setTab((prev) => (prev === "followers" ? "following" : "followers"));
    }

    // Actions on selected user
    if (selectedUser) {
      if (input === "f") {
        twitter.followUser(selectedUser.id).then((ok) =>
          showAction(ok ? `Followed @${selectedUser.username}` : "Failed to follow")
        );
      }
      if (input === "F") {
        twitter.unfollowUser(selectedUser.id).then((ok) =>
          showAction(ok ? `Unfollowed @${selectedUser.username}` : "Failed to unfollow")
        );
      }
      if (input === "b") {
        twitter.blockUser(selectedUser.id).then((ok) =>
          showAction(ok ? `Blocked @${selectedUser.username}` : "Failed to block")
        );
      }
      if (input === "B") {
        twitter.unblockUser(selectedUser.id).then((ok) =>
          showAction(ok ? `Unblocked @${selectedUser.username}` : "Failed to unblock")
        );
      }
      if (input === "x") {
        twitter.muteUser(selectedUser.id).then((ok) =>
          showAction(ok ? `Muted @${selectedUser.username}` : "Failed to mute")
        );
      }
      if (input === "X") {
        twitter.unmuteUser(selectedUser.id).then((ok) =>
          showAction(ok ? `Unmuted @${selectedUser.username}` : "Failed to unmute")
        );
      }
    }

    if (input === "m" && nextToken && !loading) {
      loadUsers(tab, nextToken);
    }

    if (key.escape) {
      onBack();
    }
  });

  return (
    <FullScreen
      title="Social"
      hints={["j/k: navigate", "tab: switch", "f/F: follow/unfollow", "b/B: block/unblock", "x/X: mute/unmute", "m: more", "esc: back"]}
      showBack
    >
      {/* Tab bar */}
      <Box marginBottom={1} gap={2}>
        {(["followers", "following"] as SocialTab[]).map((t) => (
          <Text
            key={t}
            bold={tab === t}
            color={tab === t ? BRAND_COLOR : MUTED_COLOR}
            underline={tab === t}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Text>
        ))}
        {loading && <Spinner label="" />}
      </Box>

      {twitter.error && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {actionStatus && (
        <Box marginBottom={1}>
          <Text color={SUCCESS_COLOR}>{actionStatus}</Text>
        </Box>
      )}

      {!loading && users.length === 0 && (
        <Text color={MUTED_COLOR}>No users found.</Text>
      )}

      {users.length > 0 && (
        <Box flexDirection="column">
          {users.slice(Math.max(0, selectedIndex - 8), selectedIndex + 12).map((user) => {
            const idx = users.indexOf(user);
            const isSelected = idx === selectedIndex;
            return (
              <Box key={user.id}>
                <Text color={isSelected ? BRAND_COLOR : undefined}>
                  {isSelected ? "▸ " : "  "}
                </Text>
                <Text bold={isSelected} color={isSelected ? BRAND_COLOR : undefined}>
                  @{user.username}
                </Text>
                <Text color={MUTED_COLOR}> {user.name}</Text>
                {user.publicMetrics && (
                  <Text color={MUTED_COLOR}> ({formatNumber(user.publicMetrics.followers)} followers)</Text>
                )}
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>{users.length} users</Text>
          </Box>

          {/* Detail of selected user */}
          {selectedUser && (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor="gray"
              paddingX={1}
              marginTop={1}
            >
              <Box>
                <Text bold>{selectedUser.name}</Text>
                <Text color={MUTED_COLOR}> @{selectedUser.username}</Text>
              </Box>
              {selectedUser.description && (
                <Box marginTop={0}>
                  <Text wrap="wrap">{selectedUser.description}</Text>
                </Box>
              )}
              {selectedUser.publicMetrics && (
                <Box marginTop={0} gap={2}>
                  <Text>{formatNumber(selectedUser.publicMetrics.followers)} <Text color={MUTED_COLOR}>followers</Text></Text>
                  <Text>{formatNumber(selectedUser.publicMetrics.following)} <Text color={MUTED_COLOR}>following</Text></Text>
                  <Text>{formatNumber(selectedUser.publicMetrics.tweets)} <Text color={MUTED_COLOR}>tweets</Text></Text>
                </Box>
              )}
              <Box marginTop={0} gap={1}>
                <Text color={MUTED_COLOR}>ID: {selectedUser.id}</Text>
              </Box>
            </Box>
          )}

          {nextToken && (
            <Box marginTop={1}>
              <Text color={MUTED_COLOR}>Press </Text>
              <Text bold>m</Text>
              <Text color={MUTED_COLOR}> to load more </Text>
              <CostBadge endpoint={tab === "followers" ? "users/followers" : "users/following"} count={20} />
            </Box>
          )}
        </Box>
      )}
    </FullScreen>
  );
}
