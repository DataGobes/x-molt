import React from "react";
import { Box, Text } from "ink";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface StatGridProps {
  stats: StatItem[];
  width: number;
  columns?: number;
}

export function StatGrid({ stats, width, columns = 2 }: StatGridProps) {
  if (stats.length === 0) {
    return <Text color={MUTED_COLOR}>No data</Text>;
  }

  const colWidth = Math.floor(width / columns);
  const rows: StatItem[][] = [];
  for (let i = 0; i < stats.length; i += columns) {
    rows.push(stats.slice(i, i + columns));
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, ri) => (
        <Box key={ri} flexDirection="row">
          {row.map((stat) => (
            <Box key={stat.label} width={colWidth} flexDirection="column">
              <Text color={MUTED_COLOR}>{stat.label}</Text>
              <Text bold color={stat.color ?? BRAND_COLOR}>
                {"  "}{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
