import React from "react";
import { Text } from "ink";
import { COST_COLOR, SUCCESS_COLOR, MUTED_COLOR } from "../utils/constants.js";
import { API_COSTS } from "../utils/constants.js";

interface CostBadgeProps {
  endpoint?: string;
  cost?: number;
  count?: number;
  free?: boolean;
  suffix?: string;
}

function formatCost(amount: number): string {
  if (amount < 0.01) return `~$${amount.toFixed(3)}`;
  if (amount < 1) return `~$${amount.toFixed(2)}`;
  return `~$${amount.toFixed(2)}`;
}

export function CostBadge({ endpoint, cost, count = 1, free, suffix }: CostBadgeProps) {
  if (free) {
    return <Text color={SUCCESS_COLOR}>[FREE]</Text>;
  }

  const unitCost = cost ?? (endpoint ? (API_COSTS[endpoint] ?? 0) : 0);
  const totalCost = unitCost * count;

  if (totalCost === 0) {
    return <Text color={SUCCESS_COLOR}>[FREE]</Text>;
  }

  const label = suffix ? `${formatCost(totalCost)}/${suffix}` : formatCost(totalCost);

  return <Text color={COST_COLOR}>[{label}]</Text>;
}
