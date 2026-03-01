import React from "react";
import { Box, Text } from "ink";
import type { DeleteProgress } from "../types.js";
import { formatEta } from "../utils/format.js";
import { BRAND_COLOR, SUCCESS_COLOR, ERROR_COLOR, WARNING_COLOR, MUTED_COLOR } from "../utils/constants.js";

interface ProgressTrackerProps {
  progress: DeleteProgress;
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  const { total, completed, failed, skipped, isPaused, estimatedTimeRemaining } = progress;
  const done = completed + failed + skipped;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Progress bar
  const barWidth = 30;
  const filled = Math.round((done / total) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={BRAND_COLOR}>[{bar}]</Text>
        <Text> {pct}%</Text>
        {isPaused && <Text color={WARNING_COLOR}> PAUSED</Text>}
      </Box>
      <Box gap={2}>
        <Text color={SUCCESS_COLOR}>✓ {completed}</Text>
        <Text color={ERROR_COLOR}>✗ {failed}</Text>
        <Text color={MUTED_COLOR}>⊘ {skipped}</Text>
        <Text color={MUTED_COLOR}>/ {total}</Text>
      </Box>
      {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
        <Text color={MUTED_COLOR}>
          ETA: {formatEta(estimatedTimeRemaining)}
        </Text>
      )}
    </Box>
  );
}
