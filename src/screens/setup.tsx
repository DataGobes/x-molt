import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import { TextInput, Select } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import { saveCredentials } from "../config.js";
import type { Credentials } from "../types.js";
import { BRAND_COLOR, SUCCESS_COLOR, ERROR_COLOR, MUTED_COLOR } from "../utils/constants.js";

type Step = "welcome" | "appKey" | "appSecret" | "accessToken" | "accessSecret" | "verify" | "done";

interface SetupProps {
  twitter: {
    initialize: (creds: Credentials) => boolean;
    verifyCredentials: () => Promise<boolean>;
  };
  onComplete: () => void;
}

export function SetupScreen({ twitter, onComplete }: SetupProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [creds, setCreds] = useState({
    appKey: "",
    appSecret: "",
    accessToken: "",
    accessSecret: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleInput = (field: keyof typeof creds, nextStep: Step) => (value: string) => {
    setCreds((prev) => ({ ...prev, [field]: value.trim() }));
    setStep(nextStep);
  };

  const pendingCredsRef = useRef<typeof creds | null>(null);

  useEffect(() => {
    if (step !== "verify" || !pendingCredsRef.current) return;
    const fullCreds = pendingCredsRef.current as Credentials;
    pendingCredsRef.current = null;

    (async () => {
      setVerifying(true);
      setError(null);
      const ok = twitter.initialize(fullCreds);
      if (!ok) {
        setError("Failed to initialize client. Check your credentials.");
        setVerifying(false);
        setStep("appKey");
        return;
      }
      const verified = await twitter.verifyCredentials();
      if (verified) {
        saveCredentials(fullCreds);
        setStep("done");
        setTimeout(onComplete, 1500);
      } else {
        setError("Credentials are invalid. Please re-enter.");
        setStep("appKey");
      }
      setVerifying(false);
    })();
  }, [step]);

  return (
    <Box flexDirection="column">
      <Header title="Setup" />

      {error && (
        <Box marginBottom={1}>
          <Text color={ERROR_COLOR}>✗ {error}</Text>
        </Box>
      )}

      {step === "welcome" && (
        <Box flexDirection="column">
          <Text>Welcome to <Text color={BRAND_COLOR} bold>x-molt</Text>!</Text>
          <Text color={MUTED_COLOR}>
            You'll need X API credentials (Free tier). Get them at:
          </Text>
          <Text color={BRAND_COLOR}>https://developer.x.com/en/portal/dashboard</Text>
          <Box marginTop={1}>
            <Select
              options={[
                { label: "Start setup", value: "start" },
                { label: "I'll set up .env manually", value: "manual" },
              ]}
              onChange={(value) => {
                if (value === "start") setStep("appKey");
                else onComplete();
              }}
            />
          </Box>
        </Box>
      )}

      {step === "appKey" && (
        <Box flexDirection="column">
          <Text bold>Step 1/4: Consumer Key</Text>
          <Text color={MUTED_COLOR}>OAuth 1.0 Keys → Consumer Key (click "Show")</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="Paste Consumer Key..."
              onSubmit={handleInput("appKey", "appSecret")}
            />
          </Box>
        </Box>
      )}

      {step === "appSecret" && (
        <Box flexDirection="column">
          <Text bold>Step 2/4: Consumer Secret</Text>
          <Text color={MUTED_COLOR}>Shown when you regenerate the Consumer Key</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="Paste Consumer Secret..."
              onSubmit={handleInput("appSecret", "accessToken")}
            />
          </Box>
        </Box>
      )}

      {step === "accessToken" && (
        <Box flexDirection="column">
          <Text bold>Step 3/4: Access Token</Text>
          <Text color={MUTED_COLOR}>OAuth 1.0 Keys → Access Token → click "Generate"</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="Paste Access Token..."
              onSubmit={handleInput("accessToken", "accessSecret")}
            />
          </Box>
        </Box>
      )}

      {step === "accessSecret" && (
        <Box flexDirection="column">
          <Text bold>Step 4/4: Access Token Secret</Text>
          <Text color={MUTED_COLOR}>Shown alongside the Access Token when generated</Text>
          <Box marginTop={1}>
            <Text color={BRAND_COLOR}>▸ </Text>
            <TextInput
              placeholder="Enter Access Secret..."
              onSubmit={(value) => {
                const updated = { ...creds, accessSecret: value.trim() };
                setCreds(updated);
                pendingCredsRef.current = updated;
                setStep("verify");
              }}
            />
          </Box>
        </Box>
      )}

      {step === "verify" && (
        <Box>
          <Text color={BRAND_COLOR}>⠋ Verifying credentials...</Text>
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column">
          <Text color={SUCCESS_COLOR}>✓ Credentials verified and saved!</Text>
          <Text color={MUTED_COLOR}>Saved to ~/.config/x-molt/credentials.json (chmod 600)</Text>
        </Box>
      )}

      <KeyHints hints={["enter: submit"]} />
    </Box>
  );
}
