import React, { useState } from "react";
import { Box, Text } from "ink";
import { TextInput, Select, Spinner } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import { BRAND_COLOR, ERROR_COLOR, SUCCESS_COLOR, MUTED_COLOR } from "../utils/constants.js";

type Step = "input" | "confirm" | "deleting" | "done";

interface DeleteTweetProps {
  twitter: {
    deleteTweet: (id: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
  };
  onBack: () => void;
}

export function DeleteTweetScreen({ twitter, onBack }: DeleteTweetProps) {
  const [step, setStep] = useState<Step>("input");
  const [tweetId, setTweetId] = useState("");

  const handleDelete = async () => {
    setStep("deleting");
    const ok = await twitter.deleteTweet(tweetId);
    if (ok) {
      setStep("done");
    } else {
      setStep("confirm");
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Delete Tweet" />

      {twitter.error && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>✗ {twitter.error}</Text>
        </Box>
      )}

      {step === "input" && (
        <Box flexDirection="column">
          <Text>Enter the tweet ID to delete:</Text>
          <Text color={MUTED_COLOR}>Find it in the tweet URL: x.com/.../status/<Text bold>1234567890</Text></Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="Tweet ID..."
              onSubmit={(value) => {
                const id = value.trim();
                if (id.length > 0) {
                  setTweetId(id);
                  setStep("confirm");
                }
              }}
            />
          </Box>
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column">
          <Text>Delete tweet <Text bold color={BRAND_COLOR}>{tweetId}</Text>?</Text>
          <Text color={ERROR_COLOR}>This action cannot be undone.</Text>
          <Box marginTop={1}>
            <Select
              options={[
                { label: "Yes, delete it", value: "delete" },
                { label: "Cancel", value: "cancel" },
              ]}
              onChange={(value) => {
                if (value === "delete") handleDelete();
                else onBack();
              }}
            />
          </Box>
        </Box>
      )}

      {step === "deleting" && (
        <Box>
          <Spinner label="Deleting tweet..." />
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column">
          <Text color={SUCCESS_COLOR}>✓ Tweet {tweetId} deleted successfully.</Text>
          <Box marginTop={1}>
            <Text color={MUTED_COLOR}>Press esc to go back.</Text>
          </Box>
        </Box>
      )}

      <KeyHints hints={["esc: back"]} showBack />
    </Box>
  );
}
