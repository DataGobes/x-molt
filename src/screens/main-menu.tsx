import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import { Header } from "../components/header.js";
import { KeyHints } from "../components/footer.js";
import type { Screen } from "../types.js";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";

interface MainMenuProps {
  navigate: (screen: Screen) => void;
  hasArchive: boolean;
}

export function MainMenu({ navigate, hasArchive }: MainMenuProps) {
  const options = [
    { label: "Post Tweet", value: "post-tweet" as Screen, description: "Compose and publish a tweet" },
    { label: "Delete Tweet", value: "delete-tweet" as Screen, description: "Delete a tweet by ID" },
    { label: "My Profile", value: "profile" as Screen, description: "View your account info" },
    { label: "Import Archive", value: "import-archive" as Screen, description: "Import your X data archive" },
    ...(hasArchive
      ? [
          { label: "Browse Tweets", value: "archive-browser" as Screen, description: "Search & browse imported tweets" },
          { label: "Batch Delete", value: "batch-delete" as Screen, description: "Mass delete filtered tweets" },
        ]
      : []),
  ];

  return (
    <Box flexDirection="column">
      <Header />
      <Box marginBottom={1}>
        <Text color={MUTED_COLOR}>Manage your X.com account from the terminal.</Text>
      </Box>
      <Select
        options={options.map((o) => ({ label: o.label, value: o.value }))}
        onChange={(value) => navigate(value as Screen)}
      />
      <Box marginTop={1} flexDirection="column">
        {options.map((o) => (
          <Box key={o.value}>
            <Text color={MUTED_COLOR}>  {o.description}</Text>
          </Box>
        ))}
      </Box>
      <KeyHints hints={["↑↓: navigate", "enter: select"]} />
    </Box>
  );
}
