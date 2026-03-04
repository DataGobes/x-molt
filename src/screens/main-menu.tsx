import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { FullScreen } from "../components/full-screen.js";
import { CostBadge } from "../components/cost-badge.js";
import type { Screen } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, MAIN_MENU_LOGO, APP_VERSION } from "../utils/constants.js";

interface MainMenuProps {
  navigate: (screen: Screen) => void;
  hasArchive: boolean;
}

type MenuEntry =
  | { type: "separator"; label: string }
  | { type: "item"; label: string; value: Screen; description: string; endpoint?: string; free?: boolean };

export function MainMenu({ navigate, hasArchive }: MainMenuProps) {
  const entries = useMemo<MenuEntry[]>(() => {
    const items: MenuEntry[] = [
      // Archive (FREE)
      { type: "separator", label: "Archive (FREE)" },
      { type: "item", label: "Import Archive", value: "import-archive", description: "Import your X data archive", free: true },
      ...(hasArchive
        ? [
            { type: "item" as const, label: "Browse Tweets", value: "archive-browser" as Screen, description: "Search & browse imported tweets", free: true },
            { type: "item" as const, label: "Analytics", value: "analytics" as Screen, description: "Visualize your archive data", free: true },
            { type: "item" as const, label: "Batch Delete", value: "batch-delete" as Screen, description: "Mass delete filtered tweets", endpoint: "tweets/delete" },
            { type: "item" as const, label: "Generate Embeddings", value: "generate-embeddings" as Screen, description: "Enable semantic search on archive", free: true },
          ]
        : []),

      // Tweets
      { type: "separator", label: "Tweets" },
      { type: "item", label: "Post Tweet", value: "post-tweet", description: "Compose and publish a tweet", endpoint: "tweets/create" },
      { type: "item", label: "Delete Tweet", value: "delete-tweet", description: "Delete a tweet by ID", endpoint: "tweets/delete" },
      { type: "item", label: "Timeline", value: "timeline", description: "Browse home & your tweets", endpoint: "users/timeline" },
      { type: "item", label: "Search", value: "search", description: "Search recent tweets on X", endpoint: "tweets/search/recent" },
      { type: "item", label: "Bookmarks", value: "bookmarks", description: "View your bookmarked tweets", endpoint: "bookmarks" },

      // Social
      { type: "separator", label: "Social" },
      { type: "item", label: "Followers/Following", value: "social", description: "View & manage social connections", endpoint: "users/followers" },
      { type: "item", label: "Lists", value: "lists", description: "View & create lists", endpoint: "lists" },

      // Messages
      { type: "separator", label: "Messages" },
      { type: "item", label: "DM Inbox", value: "dm-inbox", description: "Read & send direct messages", endpoint: "dm/conversations" },

      // Account
      { type: "separator", label: "Account" },
      { type: "item", label: "My Profile", value: "profile", description: "View your account info", endpoint: "users/me" },
      { type: "item", label: "Cost Dashboard", value: "cost-dashboard", description: "View API spend analytics", free: true },

      // Setup
      { type: "separator", label: "Setup" },
      { type: "item", label: "Credentials", value: "setup", description: "Configure X API credentials", free: true },
    ];
    return items;
  }, [hasArchive]);

  // Get only selectable items for navigation
  const selectableIndices = useMemo(
    () => entries.map((e, i) => (e.type === "item" ? i : -1)).filter((i) => i >= 0),
    [entries]
  );

  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentEntryIndex = selectableIndices[selectedIdx] ?? 0;

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : selectableIndices.length - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIdx((prev) => (prev < selectableIndices.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      const entry = entries[currentEntryIndex];
      if (entry?.type === "item") {
        navigate(entry.value);
      }
    }
  });

  return (
    <FullScreen hints={["↑↓: navigate", "enter: select", "q: quit"]}>
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        {MAIN_MENU_LOGO.map((line, i) => (
          <Text key={i} color={BRAND_COLOR} bold>
            {line}
          </Text>
        ))}
        <Text color={MUTED_COLOR}>molt v{APP_VERSION}</Text>
      </Box>

      <Box flexDirection="column">
        {entries.map((entry, i) => {
          if (entry.type === "separator") {
            return (
              <Box key={`sep-${i}`} marginTop={i > 0 ? 1 : 0}>
                <Text color={MUTED_COLOR} dimColor>{"  "}{entry.label}</Text>
              </Box>
            );
          }

          const isSelected = currentEntryIndex === i;
          return (
            <Box key={entry.value}>
              <Text color={isSelected ? BRAND_COLOR : undefined}>
                {isSelected ? " ❯ " : "   "}
              </Text>
              <Text bold={isSelected} color={isSelected ? BRAND_COLOR : undefined}>
                {entry.label}
              </Text>
              <Text> </Text>
              <CostBadge endpoint={entry.endpoint} free={entry.free} />
              <Text color={MUTED_COLOR}>
                {"  "}{entry.description}
              </Text>
            </Box>
          );
        })}
      </Box>
    </FullScreen>
  );
}
