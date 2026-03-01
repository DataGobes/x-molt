import React from "react";
import { Box, Text } from "ink";
import { MUTED_COLOR } from "../utils/constants.js";

interface FooterProps {
  hints?: string[];
  showBack?: boolean;
}

export function Footer({ hints = [], showBack = false }: FooterProps) {
  const allHints = [
    ...(showBack ? ["esc: back"] : []),
    ...hints,
    "q: quit",
  ];

  return (
    <Box marginTop={1}>
      <Text color={MUTED_COLOR}>
        {"─".repeat(50)}
      </Text>
    </Box>
  );
}

export function KeyHints({ hints = [], showBack = false }: FooterProps) {
  const allHints = [
    ...(showBack ? ["esc: back"] : []),
    ...hints,
    "q: quit",
  ];

  return (
    <Box marginTop={1}>
      <Text color={MUTED_COLOR}>
        {allHints.join("  │  ")}
      </Text>
    </Box>
  );
}
