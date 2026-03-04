import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import { COST_COLOR, MUTED_COLOR, WARNING_COLOR } from "../utils/constants.js";

interface CostConfirmProps {
  action: string;
  estimatedCost: number;
  sessionSpend: number;
  dailySpend: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatDollars(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export function CostConfirm({ action, estimatedCost, sessionSpend, dailySpend, onConfirm, onCancel }: CostConfirmProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={COST_COLOR}>Cost Estimate</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={MUTED_COLOR}>Action:     </Text>
          <Text>{action}</Text>
        </Box>
        <Box>
          <Text color={MUTED_COLOR}>Est. cost:  </Text>
          <Text color={COST_COLOR} bold>{formatDollars(estimatedCost)}</Text>
        </Box>
        <Box>
          <Text color={MUTED_COLOR}>Session:    </Text>
          <Text>{formatDollars(sessionSpend)}</Text>
        </Box>
        <Box>
          <Text color={MUTED_COLOR}>Today:      </Text>
          <Text>{formatDollars(dailySpend)}</Text>
        </Box>
      </Box>

      <Select
        options={[
          { label: "Proceed", value: "confirm" },
          { label: "Cancel", value: "cancel" },
        ]}
        onChange={(value) => {
          if (value === "confirm") onConfirm();
          else onCancel();
        }}
      />
    </Box>
  );
}
