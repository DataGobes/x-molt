import React from "react";
import { Box, Text, useStdout } from "ink";
import { MUTED_COLOR } from "../utils/constants.js";

interface FooterProps {
  hints?: string[];
  showBack?: boolean;
  width?: number;
}

export function Footer({ hints = [], showBack = false, width: explicitWidth }: FooterProps) {
  const { stdout } = useStdout();
  const width = explicitWidth ?? stdout?.columns ?? 60;
  const allHints = [
    ...(showBack ? ["esc: back"] : []),
    ...hints,
    "q: quit",
  ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={MUTED_COLOR}>{"─".repeat(width)}</Text>
      <Text color={MUTED_COLOR}>{allHints.join("  │  ")}</Text>
    </Box>
  );
}

export function KeyHints({ hints = [], showBack = false, width: explicitWidth }: FooterProps) {
  const { stdout } = useStdout();
  const width = explicitWidth ?? stdout?.columns ?? 60;
  const allHints = [
    ...(showBack ? ["esc: back"] : []),
    ...hints,
    "q: quit",
  ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={MUTED_COLOR}>{"─".repeat(width)}</Text>
      <Text color={MUTED_COLOR}>{allHints.join("  │  ")}</Text>
    </Box>
  );
}
