import React from "react";
import { Text } from "ink";
import { TWEET_CHAR_LIMIT } from "../utils/constants.js";
import { SUCCESS_COLOR, WARNING_COLOR, ERROR_COLOR, MUTED_COLOR } from "../utils/constants.js";

interface CharCounterProps {
  current: number;
}

export function CharCounter({ current }: CharCounterProps) {
  const remaining = TWEET_CHAR_LIMIT - current;
  let color = MUTED_COLOR;
  if (remaining < 0) color = ERROR_COLOR;
  else if (remaining <= 20) color = WARNING_COLOR;
  else if (current > 0) color = SUCCESS_COLOR;

  return (
    <Text color={color}>
      {remaining}/{TWEET_CHAR_LIMIT}
    </Text>
  );
}
