import React from "react";
import { Box, Text } from "ink";
import type { TreeRow } from "../hooks/use-date-tree.js";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";

interface DateTreeProps {
  rows: TreeRow[];
  cursorIndex: number;
  scrollOffset: number;
  totalRows: number;
  width: number;
  tweetCount: number;
}

export function DateTree({
  rows,
  cursorIndex,
  scrollOffset,
  totalRows,
  width,
  tweetCount,
}: DateTreeProps) {
  if (totalRows === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color={MUTED_COLOR}>No tweets in archive</Text>
      </Box>
    );
  }

  const scrollPct =
    totalRows <= rows.length
      ? 100
      : Math.round(((scrollOffset + rows.length) / totalRows) * 100);

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => {
        const globalIndex = scrollOffset + i;
        const isSelected = globalIndex === cursorIndex;

        return (
          <Box key={row.key}>
            <Text color={isSelected ? BRAND_COLOR : undefined}>
              {isSelected ? "▸ " : "  "}
            </Text>
            {renderRow(row, width - 3, isSelected)}
          </Box>
        );
      })}

      <Box marginTop={1} paddingX={1} justifyContent="space-between">
        <Text color={MUTED_COLOR}>{tweetCount} tweets</Text>
        <Text color={BRAND_COLOR}>{scrollPct}%</Text>
      </Box>
    </Box>
  );
}

function renderRow(
  row: TreeRow,
  _maxWidth: number,
  isSelected: boolean
): React.ReactNode {
  const indent = "  ".repeat(row.depth);

  switch (row.kind) {
    case "year":
      return (
        <Text>
          {indent}
          <Text color={BRAND_COLOR}>{row.expanded ? "▾ " : "▸ "}</Text>
          <Text bold color={BRAND_COLOR}>
            {row.label}
          </Text>
        </Text>
      );

    case "month":
      return (
        <Text>
          {indent}
          <Text>{row.expanded ? "▾ " : "▸ "}</Text>
          <Text>{row.label}</Text>
        </Text>
      );

    case "day":
      return (
        <Text>
          {indent}
          <Text color={isSelected ? BRAND_COLOR : undefined}>{row.label}</Text>
        </Text>
      );
  }
}
