import React from "react";
import { Box, Text } from "ink";
import { MUTED_COLOR } from "../utils/constants.js";

interface SplitPaneProps {
  width: number;
  height: number;
  leftWidth: number;
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitPane({ width, height, leftWidth, left, right }: SplitPaneProps) {
  const rightWidth = width - leftWidth - 1; // 1 for divider

  return (
    <Box flexDirection="row" width={width} height={height}>
      <Box flexDirection="column" width={leftWidth} height={height}>
        {left}
      </Box>
      <Box flexDirection="column" height={height}>
        <Text color={MUTED_COLOR}>
          {Array.from({ length: height }, () => "│").join("\n")}
        </Text>
      </Box>
      <Box flexDirection="column" width={rightWidth} height={height} justifyContent="center">
        {right}
      </Box>
    </Box>
  );
}
