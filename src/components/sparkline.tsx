import React from "react";
import { Box, Text } from "ink";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

interface SparklineProps {
  data: number[];
  labels?: string[];
  color?: string;
  showMinMax?: boolean;
}

export function Sparkline({ data, labels, color = BRAND_COLOR, showMinMax = false }: SparklineProps) {
  if (data.length === 0) {
    return <Text color={MUTED_COLOR}>No data</Text>;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const line = data
    .map((v) => {
      const idx = Math.round(((v - 0) / max) * (BLOCKS.length - 1));
      return BLOCKS[Math.max(0, Math.min(idx, BLOCKS.length - 1))];
    })
    .join("");

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color}>{line}</Text>
        {showMinMax && (
          <Text color={MUTED_COLOR}> min:{min} max:{max}</Text>
        )}
      </Box>
      {labels && labels.length > 0 && (
        <Text color={MUTED_COLOR}>{labels.join(" ")}</Text>
      )}
    </Box>
  );
}
