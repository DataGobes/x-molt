import React from "react";
import { Box, Text } from "ink";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";
import { formatNumber } from "../utils/format.js";

interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  width: number;
  maxBars?: number;
  barColor?: string;
}

export function BarChart({ data, width, maxBars, barColor = BRAND_COLOR }: BarChartProps) {
  if (data.length === 0) {
    return <Text color={MUTED_COLOR}>No data</Text>;
  }

  const items = maxBars ? data.slice(0, maxBars) : data;
  const maxValue = Math.max(...items.map((d) => d.value), 1);
  const maxLabelWidth = Math.max(...items.map((d) => d.label.length));
  const maxValueStr = formatNumber(maxValue);
  // label + 2 padding + bar + 1 space + value
  const barWidth = Math.max(5, width - maxLabelWidth - 2 - maxValueStr.length - 2);

  return (
    <Box flexDirection="column">
      {items.map((item) => {
        const filled = Math.round((item.value / maxValue) * barWidth);
        const bar = "█".repeat(filled);
        const color = item.color ?? barColor;
        return (
          <Box key={item.label}>
            <Text color={MUTED_COLOR}>
              {item.label.padStart(maxLabelWidth)}
            </Text>
            <Text> </Text>
            <Text color={color}>{bar}</Text>
            <Text> </Text>
            <Text color={MUTED_COLOR}>{formatNumber(item.value)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
