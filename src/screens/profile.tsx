import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import type { UserProfile } from "../types.js";
import { formatDate, formatNumber } from "../utils/format.js";
import { CostBadge } from "../components/cost-badge.js";
import { BRAND_COLOR, ERROR_COLOR, MUTED_COLOR, SUCCESS_COLOR } from "../utils/constants.js";

interface ProfileProps {
  twitter: {
    fetchProfile: () => Promise<UserProfile | null>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

export function ProfileScreen({ twitter, onBack }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    twitter.fetchProfile().then(setProfile);
  }, []);

  return (
    <FullScreen title="My Profile" hints={["esc: back"]} showBack>

      {twitter.isLoading && (
        <Box>
          <Spinner label="Fetching profile..." />
          <Text> </Text>
          <CostBadge endpoint="users/me" />
        </Box>
      )}

      {twitter.error && (
        <Box>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {profile && (
        <Box flexDirection="column">
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={2}
            paddingY={1}
          >
            <Box>
              <Text bold>{profile.name}</Text>
              <Text color={MUTED_COLOR}> @{profile.username}</Text>
              {profile.verified && <Text color={BRAND_COLOR}> ✓</Text>}
            </Box>

            {profile.description && (
              <Box marginTop={1}>
                <Text wrap="wrap">{profile.description}</Text>
              </Box>
            )}

            <Box marginTop={1} gap={3}>
              <Box>
                <Text bold>{formatNumber(profile.publicMetrics.followers)}</Text>
                <Text color={MUTED_COLOR}> Followers</Text>
              </Box>
              <Box>
                <Text bold>{formatNumber(profile.publicMetrics.following)}</Text>
                <Text color={MUTED_COLOR}> Following</Text>
              </Box>
              <Box>
                <Text bold>{formatNumber(profile.publicMetrics.tweets)}</Text>
                <Text color={MUTED_COLOR}> Tweets</Text>
              </Box>
            </Box>

            <Box marginTop={1}>
              <Text color={MUTED_COLOR}>Joined {formatDate(profile.createdAt)}</Text>
            </Box>

            <Box marginTop={1}>
              <Text color={MUTED_COLOR}>ID: {profile.id}</Text>
            </Box>
          </Box>
        </Box>
      )}

    </FullScreen>
  );
}
