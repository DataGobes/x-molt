import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { FullScreen } from "../components/full-screen.js";
import { CostBadge } from "../components/cost-badge.js";
import type { LiveList, LiveListResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR, SUCCESS_COLOR } from "../utils/constants.js";
import { formatNumber } from "../utils/format.js";

type Step = "browse" | "create-name" | "create-desc";

interface ListsProps {
  twitter: {
    getOwnedLists: (maxResults?: number, paginationToken?: string) => Promise<LiveListResult | null>;
    createList: (name: string, description?: string, isPrivate?: boolean) => Promise<LiveList | null>;
    addListMember: (listId: string, userId: string) => Promise<boolean>;
    removeListMember: (listId: string, userId: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

export function ListsScreen({ twitter, onBack }: ListsProps) {
  const [step, setStep] = useState<Step>("browse");
  const [lists, setLists] = useState<LiveList[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadLists = useCallback(async (token?: string) => {
    setLoading(true);
    const result = await twitter.getOwnedLists(20, token);
    if (result) {
      if (token) {
        setLists((prev) => [...prev, ...result.lists]);
      } else {
        setLists(result.lists);
        setSelectedIndex(0);
      }
      setNextToken(result.nextToken);
    }
    setLoading(false);
  }, [twitter]);

  useEffect(() => {
    loadLists();
  }, []);

  const selectedList = lists[selectedIndex] ?? null;

  useInput((input, key) => {
    if (step !== "browse") return;

    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => Math.min(lists.length - 1, prev + 1));
    }

    if (input === "n") {
      setStep("create-name");
    }

    if (input === "m" && nextToken && !loading) {
      loadLists(nextToken);
    }

    if (key.escape) {
      onBack();
    }
  });

  const handleCreateName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setNewListName(trimmed);
      setStep("create-desc");
    } else {
      setStep("browse");
    }
  };

  const handleCreateDesc = async (desc: string) => {
    const result = await twitter.createList(newListName, desc.trim() || undefined);
    if (result) {
      setLists((prev) => [result, ...prev]);
      setActionStatus(`Created list "${result.name}"`);
      setTimeout(() => setActionStatus(null), 1500);
    }
    setStep("browse");
  };

  return (
    <FullScreen
      title="Lists"
      hints={step === "browse" ? ["j/k: navigate", "n: new list", "m: more", "esc: back"] : ["enter: submit", "esc: cancel"]}
      showBack
    >
      {loading && (
        <Box>
          <Spinner label="Loading lists..." />
        </Box>
      )}

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

      {step === "create-name" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>New list name: </Text>
            <CostBadge endpoint="lists/create" />
          </Box>
          <Box>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput placeholder="List name..." onSubmit={handleCreateName} />
          </Box>
        </Box>
      )}

      {step === "create-desc" && (
        <Box flexDirection="column">
          <Text>Description for "{newListName}" (optional):</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput placeholder="Description..." onSubmit={handleCreateDesc} />
          </Box>
        </Box>
      )}

      {step === "browse" && !loading && lists.length === 0 && (
        <Box flexDirection="column">
          <Text color={MUTED_COLOR}>No lists found. Press </Text>
          <Text bold>n</Text>
          <Text color={MUTED_COLOR}> to create one.</Text>
        </Box>
      )}

      {step === "browse" && lists.length > 0 && (
        <Box flexDirection="column">
          {lists.map((list, i) => {
            const isSelected = i === selectedIndex;
            return (
              <Box key={list.id}>
                <Text color={isSelected ? BRAND_COLOR : undefined}>
                  {isSelected ? "▸ " : "  "}
                </Text>
                <Text bold={isSelected} color={isSelected ? BRAND_COLOR : undefined}>
                  {list.name}
                </Text>
                <Text color={MUTED_COLOR}>
                  {" "}{formatNumber(list.memberCount)} members
                  {list.isPrivate ? " 🔒" : ""}
                </Text>
              </Box>
            );
          })}

          {selectedList && (
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor="gray"
              paddingX={1}
              marginTop={1}
            >
              <Text bold>{selectedList.name}</Text>
              {selectedList.description && (
                <Text wrap="wrap">{selectedList.description}</Text>
              )}
              <Box gap={2}>
                <Text>{formatNumber(selectedList.memberCount)} <Text color={MUTED_COLOR}>members</Text></Text>
                <Text>{formatNumber(selectedList.followerCount)} <Text color={MUTED_COLOR}>followers</Text></Text>
                {selectedList.isPrivate && <Text color={MUTED_COLOR}>🔒 Private</Text>}
              </Box>
              <Text color={MUTED_COLOR}>ID: {selectedList.id}</Text>
            </Box>
          )}

          {nextToken && (
            <Box marginTop={1}>
              <Text color={MUTED_COLOR}>Press </Text>
              <Text bold>m</Text>
              <Text color={MUTED_COLOR}> to load more </Text>
              <CostBadge endpoint="lists" count={20} />
            </Box>
          )}
        </Box>
      )}
    </FullScreen>
  );
}
