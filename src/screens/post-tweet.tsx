import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Select } from "@inkjs/ui";
import { Spinner } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import { CharCounter } from "../components/char-counter.js";
import { BRAND_COLOR, ERROR_COLOR, SUCCESS_COLOR, MUTED_COLOR, WARNING_COLOR, TWEET_CHAR_LIMIT, MONTHLY_POST_LIMIT } from "../utils/constants.js";

type Step = "compose" | "preview" | "posting" | "done";

interface PostTweetProps {
  twitter: {
    postTweet: (text: string) => Promise<string | null>;
    isLoading: boolean;
    error: string | null;
  };
  archive: {
    store: { logPost: (id: string) => void; getMonthlyPostCount: () => number };
  };
  onBack: () => void;
}

export function PostTweetScreen({ twitter, archive, onBack }: PostTweetProps) {
  const [step, setStep] = useState<Step>("compose");
  const [text, setText] = useState("");
  const [tweetId, setTweetId] = useState<string | null>(null);
  const monthlyCount = archive.store.getMonthlyPostCount();
  const isAtLimit = monthlyCount >= MONTHLY_POST_LIMIT;

  const handlePost = async () => {
    if (text.length === 0 || text.length > TWEET_CHAR_LIMIT) return;
    setStep("posting");
    const id = await twitter.postTweet(text);
    if (id) {
      archive.store.logPost(id);
      setTweetId(id);
      setStep("done");
    } else {
      setStep("preview");
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Post Tweet" />

      {/* Monthly limit tracker */}
      <Box marginBottom={1}>
        <Text color={monthlyCount > MONTHLY_POST_LIMIT * 0.9 ? WARNING_COLOR : MUTED_COLOR}>
          Posts this month: {monthlyCount}/{MONTHLY_POST_LIMIT}
        </Text>
      </Box>

      {isAtLimit && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>✗ Monthly post limit reached ({MONTHLY_POST_LIMIT}). Try again next month.</Text>
        </Box>
      )}

      {twitter.error && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {step === "compose" && !isAtLimit && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Compose your tweet:</Text>
          </Box>
          <Box>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="What's happening?"
              onSubmit={(value) => {
                setText(value);
                if (value.trim().length > 0) setStep("preview");
              }}
            />
          </Box>
          <Box marginTop={1}>
            <CharCounter current={text.length} />
          </Box>
        </Box>
      )}

      {step === "preview" && (
        <Box flexDirection="column">
          <Text bold>Preview:</Text>
          <Box
            borderStyle="round"
            borderColor={BRAND_COLOR}
            paddingX={1}
            marginY={1}
          >
            <Text wrap="wrap">{text}</Text>
          </Box>
          <Box>
            <CharCounter current={text.length} />
          </Box>
          {text.length > TWEET_CHAR_LIMIT && (
            <Text color={ERROR_COLOR}>Tweet exceeds {TWEET_CHAR_LIMIT} characters!</Text>
          )}
          <Box marginTop={1}>
            <Select
              options={[
                { label: "Post it!", value: "post" },
                { label: "Edit", value: "edit" },
                { label: "Cancel", value: "cancel" },
              ]}
              onChange={(value) => {
                if (value === "post") handlePost();
                else if (value === "edit") setStep("compose");
                else onBack();
              }}
            />
          </Box>
        </Box>
      )}

      {step === "posting" && (
        <Box>
          <Spinner label="Posting tweet..." />
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column">
          <Text color={SUCCESS_COLOR}>✓ Tweet posted successfully!</Text>
          {tweetId && (
            <Text color={MUTED_COLOR}>
              ID: {tweetId} • https://x.com/i/status/{tweetId}
            </Text>
          )}
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Press esc to go back.</Text>
          </Box>
        </Box>
      )}

      <KeyHints hints={["esc: back"]} showBack />
    </Box>
  );
}
