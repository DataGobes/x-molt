import React from "react";
import { Box, Text } from "ink";
import { BRAND_COLOR, MUTED_COLOR } from "../utils/constants.js";
import { formatNumber } from "../utils/format.js";

export interface Tab {
  label: string;
  count: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeIndex: number;
  onTabChange?: (index: number) => void;
}

export function TabBar({ tabs, activeIndex }: TabBarProps) {
  return (
    <Box flexDirection="row" gap={1} marginBottom={0}>
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        return (
          <Box key={tab.label}>
            <Text
              color={isActive ? BRAND_COLOR : MUTED_COLOR}
              bold={isActive}
            >
              {isActive ? "[" : " "}
              {tab.label} {formatNumber(tab.count)}
              {isActive ? "]" : " "}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
