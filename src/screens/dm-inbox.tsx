import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { Footer } from "../components/footer.js";
import { SplitPane } from "../components/split-pane.js";
import { CostBadge } from "../components/cost-badge.js";
import { useTerminalSize } from "../hooks/use-terminal-size.js";
import type { LiveDmMessage, LiveDmResult } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR, ERROR_COLOR, SUCCESS_COLOR } from "../utils/constants.js";
import { truncate } from "../utils/format.js";

const CHROME_ROWS = 8;

interface DmInboxProps {
  twitter: {
    getDmEvents: (maxResults?: number, paginationToken?: string) => Promise<LiveDmResult | null>;
    getDmConversationMessages: (conversationId: string, maxResults?: number, paginationToken?: string) => Promise<LiveDmResult | null>;
    sendDm: (conversationId: string, text: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

interface Conversation {
  id: string;
  lastMessage: string;
  lastSenderId: string;
  lastCreatedAt: string;
  messageCount: number;
}

export function DmInboxScreen({ twitter, onBack }: DmInboxProps) {
  const { width, height } = useTerminalSize();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<LiveDmMessage[]>([]);
  const [selectedConvIndex, setSelectedConvIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const leftWidth = Math.max(30, Math.floor(width * 0.35));
  const rightWidth = width - leftWidth - 1;
  const paneHeight = Math.max(5, height - CHROME_ROWS);

  // Load initial DM events and group into conversations
  const loadEvents = useCallback(async () => {
    setLoading(true);
    const result = await twitter.getDmEvents(20);
    if (result) {
      const convMap = new Map<string, Conversation>();
      for (const msg of result.messages) {
        const existing = convMap.get(msg.conversationId);
        if (existing) {
          existing.messageCount++;
        } else {
          convMap.set(msg.conversationId, {
            id: msg.conversationId,
            lastMessage: msg.text,
            lastSenderId: msg.senderId,
            lastCreatedAt: msg.createdAt,
            messageCount: 1,
          });
        }
      }
      setConversations(Array.from(convMap.values()));
      setSelectedConvIndex(0);
    }
    setLoading(false);
  }, [twitter]);

  useEffect(() => {
    loadEvents();
  }, []);

  // Load messages for selected conversation
  const selectedConv = conversations[selectedConvIndex] ?? null;

  const loadConversationMessages = useCallback(async (convId: string) => {
    const result = await twitter.getDmConversationMessages(convId, 20);
    if (result) {
      setMessages(result.messages.reverse()); // oldest first
    }
  }, [twitter]);

  useEffect(() => {
    if (selectedConv) {
      loadConversationMessages(selectedConv.id);
    } else {
      setMessages([]);
    }
  }, [selectedConvIndex, conversations]);

  useInput((input, key) => {
    if (composing) return;

    if (key.upArrow || input === "k") {
      setSelectedConvIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedConvIndex((prev) => Math.min(conversations.length - 1, prev + 1));
    }

    // Compose new message
    if (input === "c" && selectedConv) {
      setComposing(true);
    }

    // Refresh
    if (input === "R") {
      loadEvents();
    }

    if (key.escape) {
      onBack();
    }
  });

  const handleSend = async (text: string) => {
    setComposing(false);
    const trimmed = text.trim();
    if (!trimmed || !selectedConv) return;

    const ok = await twitter.sendDm(selectedConv.id, trimmed);
    if (ok) {
      setSendStatus("Message sent!");
      setTimeout(() => setSendStatus(null), 1500);
      // Reload messages
      loadConversationMessages(selectedConv.id);
    } else {
      setSendStatus("Failed to send");
      setTimeout(() => setSendStatus(null), 2000);
    }
  };

  function formatTime(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header title="DM Inbox" />

      {twitter.error && (
        <Box paddingX={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {sendStatus && (
        <Box paddingX={1}>
          <Text color={sendStatus.startsWith("Failed") ? ERROR_COLOR : SUCCESS_COLOR}>{sendStatus}</Text>
        </Box>
      )}

      {loading ? (
        <Box paddingX={1} paddingY={1}>
          <Spinner label="Loading DMs..." />
        </Box>
      ) : (
        <SplitPane
          width={width}
          height={paneHeight}
          leftWidth={leftWidth}
          left={
            <Box flexDirection="column">
              {conversations.length === 0 ? (
                <Box paddingX={1} paddingY={1}>
                  <Text color={MUTED_COLOR}>No conversations found.</Text>
                </Box>
              ) : (
                conversations.map((conv, i) => {
                  const isSelected = i === selectedConvIndex;
                  return (
                    <Box key={conv.id}>
                      <Text color={isSelected ? BRAND_COLOR : undefined}>
                        {isSelected ? "▸ " : "  "}
                      </Text>
                      <Box flexDirection="column" width={leftWidth - 3}>
                        <Text bold={isSelected} color={isSelected ? BRAND_COLOR : MUTED_COLOR}>
                          {conv.id.slice(0, 20)}...
                        </Text>
                        <Text>
                          {truncate(conv.lastMessage.replace(/\n/g, " "), leftWidth - 5)}
                        </Text>
                      </Box>
                    </Box>
                  );
                })
              )}
              <Box marginTop={1} paddingX={1}>
                <Text color={MUTED_COLOR}>{conversations.length} conversations</Text>
              </Box>
            </Box>
          }
          right={
            <Box flexDirection="column" paddingX={1}>
              {selectedConv ? (
                <>
                  <Box marginBottom={1}>
                    <Text bold color={BRAND_COLOR}>Conversation</Text>
                    <Text color={MUTED_COLOR}> {selectedConv.id.slice(0, 24)}</Text>
                  </Box>
                  <Box flexDirection="column" height={paneHeight - 5} overflowY="hidden">
                    {messages.slice(-paneHeight + 6).map((msg) => (
                      <Box key={msg.id} flexDirection="column">
                        <Box>
                          <Text color={MUTED_COLOR}>{formatTime(msg.createdAt)} </Text>
                          <Text bold>{msg.senderId.slice(0, 10)}: </Text>
                          <Text wrap="wrap">{msg.text}</Text>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  {composing ? (
                    <Box marginTop={1}>
                      <Text color={BRAND_COLOR}>▸ </Text>
                      <TextInput
                        placeholder="Type a message..."
                        onSubmit={handleSend}
                      />
                      <Text> </Text>
                      <CostBadge endpoint="dm/send" />
                    </Box>
                  ) : (
                    <Box marginTop={1}>
                      <Text color={MUTED_COLOR}>Press </Text>
                      <Text bold>c</Text>
                      <Text color={MUTED_COLOR}> to compose</Text>
                    </Box>
                  )}
                </>
              ) : (
                <Box paddingY={1}>
                  <Text color={MUTED_COLOR}>Select a conversation to view messages</Text>
                </Box>
              )}
            </Box>
          }
        />
      )}

      <Footer
        hints={composing
          ? ["enter: send", "esc: cancel"]
          : ["j/k: navigate", "c: compose", "R: refresh", "esc: back"]
        }
      />
    </Box>
  );
}
