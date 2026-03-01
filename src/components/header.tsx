import React from "react";
import { Box, Text } from "ink";
import { BRAND_COLOR, APP_VERSION } from "../utils/constants.js";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={BRAND_COLOR} bold>
          {"  𝕏  molt"}
        </Text>
        <Text color="gray"> v{APP_VERSION}</Text>
        {title && (
          <>
            <Text color="gray"> › </Text>
            <Text bold>{title}</Text>
          </>
        )}
      </Box>
      <Text color={BRAND_COLOR}>{"─".repeat(50)}</Text>
    </Box>
  );
}
